import { z } from "zod"
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi"

extendZodWithOpenApi(z)

/**
 * Schema for checking PWP eligibility for a cart
 * POST /store/pwp/check
 */
export const CheckPWPSchema = z
  .object({
    cart_id: z.string().min(1).describe("The cart ID to check eligibility for"),
  })
  .openapi("CheckPWPRequest", {
    example: {
      cart_id: "cart_01ABC123",
    },
  })

/**
 * Schema for applying a PWP offer to cart
 * POST /store/pwp/apply
 */
export const ApplyPWPSchema = z
  .object({
    cart_id: z.string().min(1).describe("The cart ID to apply PWP to"),
    pwp_rule_id: z.string().min(1).describe("The PWP rule ID to apply"),
    variant_id: z.string().min(1).describe("The variant ID of the reward product to add"),
  })
  .openapi("ApplyPWPRequest", {
    example: {
      cart_id: "cart_01ABC123",
      pwp_rule_id: "pwp_01ABC123",
      variant_id: "variant_01ABC123",
    },
  })

/**
 * Schema for removing a PWP item from cart
 * POST /store/pwp/remove
 */
export const RemovePWPSchema = z
  .object({
    cart_id: z.string().min(1).describe("The cart ID to remove PWP from"),
    line_item_id: z.string().min(1).describe("The line item ID to remove"),
  })
  .openapi("RemovePWPRequest", {
    example: {
      cart_id: "cart_01ABC123",
      line_item_id: "item_01ABC123",
    },
  })

// Infer TypeScript types from schemas
export type CheckPWPRequest = z.infer<typeof CheckPWPSchema>
export type ApplyPWPRequest = z.infer<typeof ApplyPWPSchema>
export type RemovePWPRequest = z.infer<typeof RemovePWPSchema>
