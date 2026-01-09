import { z } from "zod"
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi"

extendZodWithOpenApi(z)

/**
 * Schema for applying membership promo to cart
 * POST /store/membership-promo/apply
 */
export const ApplyMembershipPromoSchema = z
  .object({
    cart_id: z.string().min(1).describe("The cart ID to apply the membership promo to"),
  })
  .openapi("ApplyMembershipPromoRequest", {
    example: {
      cart_id: "cart_01ABC123",
    },
  })

/**
 * Schema for removing membership promo from cart
 * POST /store/membership-promo/remove
 */
export const RemoveMembershipPromoSchema = z
  .object({
    cart_id: z.string().min(1).describe("The cart ID to remove the membership promo from"),
  })
  .openapi("RemoveMembershipPromoRequest", {
    example: {
      cart_id: "cart_01ABC123",
    },
  })

// Infer TypeScript types from schemas
export type ApplyMembershipPromoRequest = z.infer<typeof ApplyMembershipPromoSchema>
export type RemoveMembershipPromoRequest = z.infer<typeof RemoveMembershipPromoSchema>
