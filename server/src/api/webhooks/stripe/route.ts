import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { STRIPE_API_KEY, STRIPE_WEBHOOK_SECRET } from "../../../lib/constants"
import { rateLimitWebhook } from "../../middlewares/rate-limit"
import { withIdempotency } from "../../../utils/idempotency"
// @ts-ignore
import Stripe from "stripe"

/**
 * POST /webhooks/stripe
 * Handle Stripe webhook events
 * Used for membership payment confirmations
 *
 * Security layers:
 * 1. Rate limiting - Prevents DoS attacks (100 req/min)
 * 2. Signature verification - Ensures webhook is from Stripe
 * 3. Idempotency check - Prevents duplicate processing
 */
export const POST = [
  rateLimitWebhook, // Layer 1: Rate limiting
  async (req: MedusaRequest, res: MedusaResponse) => {
  if (!STRIPE_API_KEY || !STRIPE_WEBHOOK_SECRET) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Stripe is not configured"
    )
  }

  const logger = req.scope.resolve("logger")
  const sig = req.headers["stripe-signature"] as string

  if (!sig) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Missing stripe-signature header"
    )
  }

  let event: Stripe.Event

  try {
    const stripe = new Stripe(STRIPE_API_KEY, {
  apiVersion: "2023-10-16",
    })

    // Get raw body
    const rawBody = await (req as any).text()

    // Layer 2: Verify webhook signature
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      STRIPE_WEBHOOK_SECRET
    )
  } catch (error) {
    logger.error("Webhook signature verification failed:", error)
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Webhook Error: ${error.message}`
    )
  }

  logger.info(`Received Stripe webhook event: ${event.type} (ID: ${event.id})`)

  // Layer 3: Idempotency check - Prevent duplicate processing
  const { isDuplicate } = await withIdempotency(
    event.id,
    async () => {
      // Handle the event (only processes once)
      await processStripeEvent(event, logger)
    },
    {
      prefix: 'stripe_event:',
      ttlSeconds: 259200, // 72 hours (Stripe retries for up to 3 days)
      onDuplicate: () => {
        logger.info(
          `Duplicate webhook event ${event.id} (${event.type}) - already processed, skipping`
        )
      },
    }
  )

  // Return 200 to acknowledge receipt
  res.json({
    received: true,
    event_id: event.id,
    event_type: event.type,
    duplicate: isDuplicate
  })
}]

/**
 * Process Stripe webhook event
 * This function contains the actual business logic
 * Separated to allow idempotency wrapper
 */
async function processStripeEvent(event: Stripe.Event, logger: any): Promise<void> {
  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent

      // Check if this is a membership payment
      if (paymentIntent.metadata?.type === "membership_purchase") {
        logger.info(
          `Membership payment succeeded: ${paymentIntent.id} for customer ${paymentIntent.metadata.customer_id}`
        )

        // Payment already processed in the purchase endpoint
        // This is just confirmation
      }

      break
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent

      if (paymentIntent.metadata?.type === "membership_purchase") {
        logger.error(
          `Membership payment failed: ${paymentIntent.id} for customer ${paymentIntent.metadata.customer_id}`
        )

        // TODO: Send notification to customer about failed payment
        // TODO: Send notification to admin
      }

      break
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge

      logger.info(`Charge refunded: ${charge.id}`)

      // TODO: Handle membership refund if applicable
      // Check if charge is related to membership purchase
      // Cancel membership or adjust points

      break
    }

    default:
      logger.info(`Unhandled event type: ${event.type}`)
  }
}
