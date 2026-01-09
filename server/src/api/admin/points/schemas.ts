import { z } from "zod"
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

/**
 * Schema for updating points system configuration
 * POST /admin/points/config
 */
export const UpdateConfigSchema = z.object({
  earning_type: z
    .enum(["percentage", "per_product"])
    .optional()
    .describe("How points are calculated - percentage of order total or per product"),
  earning_rate: z
    .number()
    .min(0)
    .optional()
    .describe("Points earning rate (percentage or fixed amount per product)"),
  redemption_rate: z
    .number()
    .positive()
    .optional()
    .describe("Points redemption rate - dollar value per point redeemed"),
  is_enabled: z
    .boolean()
    .optional()
    .describe("Enable or disable the points system globally"),
}).openapi('UpdateConfigRequest', {
  example: {
    earning_type: 'percentage',
    earning_rate: 5,
    redemption_rate: 0.01,
    is_enabled: true
  }
})

/**
 * Schema for manually adjusting customer points
 * POST /admin/points/adjust
 */
export const AdjustPointsSchema = z.object({
  customer_id: z
    .string()
    .min(1)
    .describe("Customer ID to adjust points for"),
  amount: z
    .number()
    .refine((val) => val !== 0, {
      message: "Amount must not be zero",
    })
    .describe("Points to add (positive) or remove (negative)"),
  reason: z
    .string()
    .min(1)
    .max(500)
    .describe("Reason for the points adjustment"),
}).openapi('AdjustPointsRequest', {
  example: {
    customer_id: 'cus_01HQZJQY9X1K2P3M4N5B6C7D8E',
    amount: 100,
    reason: 'Compensation for order issue'
  }
})

// Infer TypeScript types from schemas
export type UpdateConfigRequest = z.infer<typeof UpdateConfigSchema>
export type AdjustPointsRequest = z.infer<typeof AdjustPointsSchema>
