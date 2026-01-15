import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import Stripe from "stripe"
import { STRIPE_API_KEY } from "../../../../../lib/constants"
import { getVerifiedCustomerId } from "../../../../../utils/store-auth"

/**
 * DELETE /store/customer/payment-methods/:id
 * Remove a saved payment method
 */
export const DELETE = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const customerId = getVerifiedCustomerId(req)
  const paymentMethodId = req.params.id

  if (!customerId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Customer authentication required"
    )
  }

  if (!paymentMethodId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Payment method ID is required"
    )
  }

  if (!STRIPE_API_KEY) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Stripe is not configured"
    )
  }

  const logger = req.scope.resolve("logger")
  const customerModuleService = req.scope.resolve(Modules.CUSTOMER)

  try {
    // Get customer to verify ownership
    const customer = await customerModuleService.retrieveCustomer(customerId)

    const metadata = (customer.metadata || {}) as Record<string, unknown>
    const stripeCustomerId = metadata.stripe_customer_id as string | undefined

    if (!stripeCustomerId) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "No payment methods found for this customer"
      )
    }

    const stripe = new Stripe(STRIPE_API_KEY, {
      apiVersion: "2023-10-16",
    })

    // Verify the payment method belongs to this customer
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)

    if (paymentMethod.customer !== stripeCustomerId) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        "Payment method does not belong to this customer"
      )
    }

    // Detach the payment method
    await stripe.paymentMethods.detach(paymentMethodId)

    logger.info(`Detached payment method ${paymentMethodId} from customer ${customerId}`)

    res.json({ success: true, id: paymentMethodId })
  } catch (error: any) {
    logger.error(`Failed to delete payment method: ${error}`)

    if (error instanceof MedusaError) {
      throw error
    }

    if (error.type === "StripeInvalidRequestError") {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Payment method not found"
      )
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Failed to delete payment method: ${error.message}`
    )
  }
}

/**
 * OPTIONS /store/customer/payment-methods/:id
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  _req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send()
}
