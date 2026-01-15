import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { MEMBERSHIP_MODULE } from "../../../../modules/membership"
import { MEMBERSHIP_CONFIG_MODULE } from "../../../../modules/membership-config"
import { STRIPE_API_KEY } from "../../../../lib/constants"
import { getVerifiedCustomerId } from "../../../../utils/store-auth"
// @ts-ignore
import Stripe from "stripe"

/**
 * POST /store/membership/payment-intent
 * Create a Stripe PaymentIntent for membership purchase
 * Returns client_secret for Stripe Elements
 * Requires authentication
 */
export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const customerId = getVerifiedCustomerId(req)

  if (!customerId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Authentication required"
    )
  }

  if (!STRIPE_API_KEY) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Stripe is not configured"
    )
  }

  const membershipService = req.scope.resolve(MEMBERSHIP_MODULE) as any
  const membershipConfigService = req.scope.resolve(MEMBERSHIP_CONFIG_MODULE) as any
  const logger = req.scope.resolve("logger")

  try {
    // Check if customer already has active membership
    const existingMembership = await membershipService.getMembershipByCustomer(
      customerId
    )

    if (existingMembership && existingMembership.status === "active") {
      throw new MedusaError(
        MedusaError.Types.DUPLICATE_ERROR,
        "Customer already has an active membership"
      )
    }

    // Get membership config for price
    const config = await membershipConfigService.getConfig()

    if (config.program_type === "free") {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Membership is free. No payment required."
      )
    }

    const amount = Number(config.price)
    if (!amount || amount <= 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Invalid membership price configuration"
      )
    }

    // Create Stripe PaymentIntent (not confirmed yet)
    const stripe = new Stripe(STRIPE_API_KEY, {
      apiVersion: "2023-10-16",
    })

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "myr",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        customer_id: customerId,
        type: "membership_purchase",
      },
    })

    logger.info(`Payment intent created for membership purchase: ${paymentIntent.id}`)

    res.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    })
  } catch (error: any) {
    logger.error(`Failed to create membership payment intent: ${error}`)

    if (error instanceof MedusaError) {
      throw error
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Failed to create payment intent: ${error.message}`
    )
  }
}

/**
 * OPTIONS /store/membership/payment-intent
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  _req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send()
}
