import { z } from "zod"
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi"

extendZodWithOpenApi(z)

/**
 * Schema for validating a coupon code
 * POST /store/coupons/validate
 */
export const ValidateCouponSchema = z
  .object({
    code: z
      .string()
      .min(1)
      .transform((val) => val.toUpperCase())
      .describe("The coupon code to validate"),
    cart_id: z.string().min(1).describe("The cart ID to calculate discount for"),
  })
  .openapi("ValidateCouponRequest", {
    example: {
      code: "SUMMER20",
      cart_id: "cart_01ABC123",
    },
  })

/**
 * Schema for applying a coupon to cart
 * POST /store/coupons/apply
 */
export const ApplyCouponSchema = z
  .object({
    code: z
      .string()
      .min(1)
      .transform((val) => val.toUpperCase())
      .describe("The coupon code to apply"),
    cart_id: z.string().min(1).describe("The cart ID to apply the coupon to"),
  })
  .openapi("ApplyCouponRequest", {
    example: {
      code: "SUMMER20",
      cart_id: "cart_01ABC123",
    },
  })

/**
 * Schema for removing a coupon from cart
 * POST /store/coupons/remove
 */
export const RemoveCouponSchema = z
  .object({
    cart_id: z.string().min(1).describe("The cart ID to remove the coupon from"),
  })
  .openapi("RemoveCouponRequest", {
    example: {
      cart_id: "cart_01ABC123",
    },
  })

// Infer TypeScript types from schemas
export type ValidateCouponRequest = z.infer<typeof ValidateCouponSchema>
export type ApplyCouponRequest = z.infer<typeof ApplyCouponSchema>
export type RemoveCouponRequest = z.infer<typeof RemoveCouponSchema>
