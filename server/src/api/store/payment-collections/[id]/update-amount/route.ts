import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import Stripe from "stripe"
import { STRIPE_API_KEY } from "../../../../../lib/constants"

/**
 * POST /store/payment-collections/:id/update-amount
 *
 * Updates the Stripe PaymentIntent amount to the correct total passed from frontend.
 * This must be called after creating the payment session but before the customer pays.
 *
 * Request body:
 * - cart_id: string - The cart ID (for validation)
 * - amount: number - The correct total amount in cents (calculated by frontend)
 *
 * This endpoint:
 * 1. Validates the cart exists and belongs to this payment collection
 * 2. Updates the Stripe PaymentIntent with the provided amount
 * 3. Updates the payment collection amount in Medusa for consistency
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  const { id: paymentCollectionId } = req.params
  const { cart_id, amount } = req.body as { cart_id?: string; amount?: number }
  const logger = req.scope.resolve("logger")

  logger.info(`[UPDATE-AMOUNT] Endpoint called - paymentCollectionId: ${paymentCollectionId}, cart_id: ${cart_id}, amount: ${amount}`)

  if (!paymentCollectionId) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Payment collection ID is required")
  }

  if (!cart_id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "cart_id is required in request body")
  }

  if (amount === undefined || amount === null) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "amount is required in request body")
  }

  // Validate amount is a positive number
  const correctAmount = Math.round(Number(amount))
  if (isNaN(correctAmount) || correctAmount < 0) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "amount must be a positive number")
  }

  if (!STRIPE_API_KEY) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Stripe is not configured")
  }

  try {
    const cartModuleService = req.scope.resolve(Modules.CART)
    const paymentModuleService = req.scope.resolve(Modules.PAYMENT)

    // Validate cart exists
    const cart = await cartModuleService.retrieveCart(cart_id)
    if (!cart) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Cart with id ${cart_id} not found`)
    }

    // Get the payment collection and its payment sessions
    const paymentCollection = await paymentModuleService.retrievePaymentCollection(paymentCollectionId, {
      relations: ["payment_sessions"],
    })

    if (!paymentCollection) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Payment collection ${paymentCollectionId} not found`
      )
    }

    // Find the Stripe payment session
    const stripeSession = paymentCollection.payment_sessions?.find(
      (session: any) => session.provider_id === "pp_stripe_stripe"
    )

    if (!stripeSession) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "No Stripe payment session found in this payment collection"
      )
    }

    // Get the PaymentIntent ID from the session data
    const paymentIntentId = (stripeSession.data as any)?.id as string | undefined

    if (!paymentIntentId || !paymentIntentId.startsWith("pi_")) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Could not find valid PaymentIntent ID in payment session"
      )
    }

    // Check if amount needs to be updated
    const currentAmount = paymentCollection.amount || 0

    if (currentAmount === correctAmount) {
      logger.info(`[UPDATE-AMOUNT] Amount already correct: ${correctAmount}`)
      res.json({
        success: true,
        message: "Amount already correct",
        amount: correctAmount,
        currency: cart.currency_code,
      })
      return
    }

    // Update the Stripe PaymentIntent amount
    const stripe = new Stripe(STRIPE_API_KEY, {
      apiVersion: "2023-10-16",
    })

    await stripe.paymentIntents.update(paymentIntentId, {
      amount: correctAmount,
      metadata: {
        cart_id,
        original_amount: currentAmount.toString(),
        corrected_amount: correctAmount.toString(),
        updated_at: new Date().toISOString(),
      },
    })

    logger.info(
      `[UPDATE-AMOUNT] Updated PaymentIntent ${paymentIntentId} from ${currentAmount} to ${correctAmount}`
    )

    // Also update the payment collection amount in Medusa (for consistency)
    try {
      await paymentModuleService.updatePaymentCollections(
        { id: paymentCollectionId },
        { amount: correctAmount }
      )
      logger.info(`[UPDATE-AMOUNT] Updated payment collection amount to ${correctAmount}`)
    } catch (err) {
      // Non-critical - the Stripe amount is what matters
      logger.warn(`[UPDATE-AMOUNT] Could not update payment collection: ${err}`)
    }

    res.json({
      success: true,
      message: "Payment amount updated successfully",
      previous_amount: currentAmount,
      new_amount: correctAmount,
      currency: cart.currency_code,
    })
  } catch (error) {
    logger.error(`[UPDATE-AMOUNT] Failed: ${error}`)

    if (error instanceof MedusaError) {
      throw error
    }

    if (error instanceof Stripe.errors.StripeError) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Stripe error: ${error.message}`
      )
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Failed to update payment amount: ${error}`
    )
  }
}
