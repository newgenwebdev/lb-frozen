import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { z } from "zod"
import { getVerifiedCustomerId } from "../../../../utils/store-auth"

// Validation schema
const NewsletterUpdateSchema = z.object({
  subscribed: z.boolean().describe("Whether the customer wants to receive newsletter emails"),
})

/**
 * GET /store/customer/newsletter
 * Get customer's newsletter subscription status
 * Requires authentication
 */
export const GET = async (
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

  const customerModuleService = req.scope.resolve(Modules.CUSTOMER)

  const customer = await customerModuleService.retrieveCustomer(customerId)

  const subscribed = customer.metadata?.newsletter_subscribed === true

  res.json({
    subscribed,
    email: customer.email,
  })
}

/**
 * POST /store/customer/newsletter
 * Update customer's newsletter subscription preference
 * Stores in customer.metadata.newsletter_subscribed
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

  // Validate request body
  const parseResult = NewsletterUpdateSchema.safeParse(req.body)
  if (!parseResult.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Invalid request body: " + parseResult.error.message
    )
  }

  const { subscribed } = parseResult.data

  const customerModuleService = req.scope.resolve(Modules.CUSTOMER)

  // Get current customer to preserve existing metadata
  const customer = await customerModuleService.retrieveCustomer(customerId)
  const existingMetadata = (customer.metadata || {}) as Record<string, unknown>

  // Update customer metadata with newsletter preference
  await customerModuleService.updateCustomers(customerId, {
    metadata: {
      ...existingMetadata,
      newsletter_subscribed: subscribed,
      newsletter_subscribed_at: subscribed ? new Date().toISOString() : null,
    },
  })

  res.json({
    success: true,
    subscribed,
    message: subscribed
      ? "Successfully subscribed to newsletter"
      : "Successfully unsubscribed from newsletter",
  })
}

/**
 * OPTIONS /store/customer/newsletter
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  _req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send()
}
