import { z } from "zod"
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

/**
 * Schema for creating a member-exclusive promotion
 * POST /admin/member-promotions
 */
export const CreateMemberPromotionSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(100)
    .describe("Unique promotion code (e.g., MEMBER10)"),
  description: z
    .string()
    .optional()
    .describe("Description of the promotion"),
  type: z
    .enum(["percentage", "fixed"])
    .describe("Discount type - percentage off or fixed amount"),
  value: z
    .number()
    .positive()
    .describe("Discount value (percentage or amount in cents)"),
  currency_code: z
    .string()
    .optional()
    .describe("Currency code (required for fixed discount type, e.g., USD)"),
  is_active: z
    .boolean()
    .describe("Whether the promotion is currently active"),
  target_type: z
    .enum(["items", "order", "shipping_methods"])
    .optional()
    .describe("What the promotion applies to"),
  starts_at: z
    .string()
    .datetime()
    .optional()
    .describe("Promotion start date/time (ISO 8601 format)"),
  ends_at: z
    .string()
    .datetime()
    .optional()
    .describe("Promotion end date/time (ISO 8601 format)"),
}).openapi('CreateMemberPromotionRequest', {
  example: {
    code: 'MEMBER10',
    description: '10% discount for premium members',
    type: 'percentage',
    value: 10,
    is_active: true,
    target_type: 'order',
    starts_at: '2025-01-01T00:00:00Z',
    ends_at: '2025-12-31T23:59:59Z'
  }
})

/**
 * Schema for updating a member-exclusive promotion
 * POST /admin/member-promotions/:id
 */
export const UpdateMemberPromotionSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(100)
    .optional()
    .describe("Unique promotion code (e.g., MEMBER10)"),
  description: z
    .string()
    .optional()
    .describe("Description of the promotion"),
  type: z
    .enum(["percentage", "fixed"])
    .optional()
    .describe("Discount type - percentage off or fixed amount"),
  value: z
    .number()
    .positive()
    .optional()
    .describe("Discount value (percentage or amount in cents)"),
  currency_code: z
    .string()
    .optional()
    .describe("Currency code (required for fixed discount type, e.g., USD)"),
  is_active: z
    .boolean()
    .optional()
    .describe("Whether the promotion is currently active"),
  target_type: z
    .enum(["items", "order", "shipping_methods"])
    .optional()
    .describe("What the promotion applies to"),
  starts_at: z
    .string()
    .datetime()
    .optional()
    .describe("Promotion start date/time (ISO 8601 format)"),
  ends_at: z
    .string()
    .datetime()
    .optional()
    .describe("Promotion end date/time (ISO 8601 format)"),
}).openapi('UpdateMemberPromotionRequest', {
  example: {
    is_active: false,
    description: '15% discount for premium members - updated',
    value: 15
  }
})

// Infer TypeScript types from schemas
export type CreateMemberPromotionRequest = z.infer<typeof CreateMemberPromotionSchema>
export type UpdateMemberPromotionRequest = z.infer<typeof UpdateMemberPromotionSchema>
