import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { MEMBERSHIP_MODULE } from "../../../../modules/membership"
import { MEMBERSHIP_CONFIG_MODULE } from "../../../../modules/membership-config"
import { TIER_CONFIG_MODULE } from "../../../../modules/tier-config"
import { POINTS_MODULE } from "../../../../modules/points"
import GroupManagerService from "../../../../modules/membership/services/group-manager"
import { STRIPE_API_KEY } from "../../../../lib/constants"
import { getVerifiedCustomerId } from "../../../../utils/store-auth"
// @ts-ignore
import Stripe from "stripe"

/**
 * POST /store/membership/purchase
 * Purchase permanent membership with Stripe
 * Supports two flows:
 * 1. payment_intent_id: Stripe Elements flow (PaymentIntent already confirmed by frontend)
 * 2. payment_method_id: Legacy flow (create and confirm PaymentIntent server-side)
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

  // Get body from validatedBody or fall back to req.body
  const body = (req as any).validatedBody || req.body || {}
  const payment_intent_id = body.payment_intent_id as string | undefined
  const payment_method_id = body.payment_method_id as string | undefined

  // Validate that at least one is provided
  if (!payment_intent_id && !payment_method_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Either payment_intent_id or payment_method_id is required"
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
  const tierConfigService = req.scope.resolve(TIER_CONFIG_MODULE) as any
  const pointsService = req.scope.resolve(POINTS_MODULE) as any
  const logger = req.scope.resolve("logger")

  try {
    // Check if customer already has membership
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
    const amount = Number(config.price)

    const stripe = new Stripe(STRIPE_API_KEY, {
      apiVersion: "2023-10-16",
    })

    let paymentIntent: Stripe.PaymentIntent

    if (payment_intent_id) {
      // Flow 1: Stripe Elements - PaymentIntent was created earlier, verify it's succeeded
      paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id)

      // Verify this payment intent is for this customer and is a membership purchase
      if (paymentIntent.metadata?.customer_id !== customerId) {
        throw new MedusaError(
          MedusaError.Types.UNAUTHORIZED,
          "Payment intent does not belong to this customer"
        )
      }

      if (paymentIntent.metadata?.type !== "membership_purchase") {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Invalid payment intent type"
        )
      }

      if (paymentIntent.status !== "succeeded") {
        throw new MedusaError(
          MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
          `Payment not completed: ${paymentIntent.status}`
        )
      }
    } else if (payment_method_id) {
      // Flow 2: Legacy - create and confirm PaymentIntent server-side
      paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "sgd",
        payment_method: payment_method_id,
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: "never",
        },
        metadata: {
          customer_id: customerId,
          type: "membership_purchase",
        },
      })

      if (paymentIntent.status !== "succeeded") {
        throw new MedusaError(
          MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
          `Payment failed: ${paymentIntent.status}`
        )
      }
    } else {
      // This shouldn't happen since we validate above, but TypeScript needs it
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Either payment_intent_id or payment_method_id is required"
      )
    }

    // Get default tier for new members
    const defaultTier = await tierConfigService.getDefaultTier()
    const tierSlug = defaultTier?.slug || "classic"

    // Create membership record
    const membership = await membershipService.createMembership({
      customer_id: customerId,
      stripe_payment_id: paymentIntent.id,
      tier_slug: tierSlug,
    })

    // Add customer to Members group
    const groupManager = new GroupManagerService({ logger })
    await groupManager.addCustomerToMemberGroup(customerId, req.scope)

    // Initialize points balance
    await pointsService.initializeBalance(customerId)

    logger.info(`Membership purchased successfully for customer ${customerId}`)

    res.json({
      membership: {
        id: membership.id,
        status: membership.status,
        tier_slug: membership.tier_slug,
        activated_at: membership.activated_at,
      },
      payment: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
      },
    })
  } catch (error: any) {
    logger.error("Membership purchase failed:", error)

    if (error instanceof MedusaError) {
      throw error
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Membership purchase failed: ${error.message}`
    )
  }
}

/**
 * OPTIONS /store/membership/purchase
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  _req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send()
}
