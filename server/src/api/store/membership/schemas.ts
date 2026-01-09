import { z } from "zod"
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

/**
 * Schema for purchasing a membership
 * POST /store/membership/purchase
 * Accepts either payment_intent_id (from Stripe Elements flow) or payment_method_id (legacy)
 */
export const PurchaseMembershipSchema = z.object({
  payment_intent_id: z
    .string()
    .min(1)
    .optional()
    .describe("Stripe PaymentIntent ID (from Stripe Elements flow)"),
  payment_method_id: z
    .string()
    .min(1)
    .optional()
    .describe("Stripe payment method ID (legacy flow)"),
}).refine(
  (data) => data.payment_intent_id || data.payment_method_id,
  {
    message: "Either payment_intent_id or payment_method_id is required",
  }
).openapi('PurchaseMembershipRequest', {
  example: {
    payment_intent_id: 'pi_1J5K6L7M8N9O0P1Q2R3S4T5U'
  }
})

// Infer TypeScript types from schemas
export type PurchaseMembershipRequest = z.infer<typeof PurchaseMembershipSchema>
