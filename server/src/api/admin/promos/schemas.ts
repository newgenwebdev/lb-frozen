import { z } from "zod"

// ============ Coupon Schemas ============

export const CreateCouponSchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .max(50)
    .describe("Unique coupon code"),
  name: z
    .string()
    .min(1, "Name is required")
    .max(255)
    .describe("Display name for the coupon"),
  type: z
    .enum(["percentage", "fixed"])
    .default("percentage")
    .describe("Discount type"),
  value: z
    .number()
    .min(0)
    .default(0)
    .describe("Discount value (percentage 0-100 or fixed amount in cents)"),
  currency_code: z
    .string()
    .default("MYR")
    .describe("Currency code for fixed amount"),
  status: z
    .enum(["active", "non-active"])
    .default("active")
    .describe("Coupon status"),
  starts_at: z
    .string()
    .datetime()
    .nullable()
    .optional()
    .describe("Start date (ISO 8601)"),
  ends_at: z
    .string()
    .datetime()
    .nullable()
    .optional()
    .describe("End date (ISO 8601)"),
  usage_limit: z
    .number()
    .int()
    .positive()
    .nullable()
    .optional()
    .describe("Maximum usage count"),
  metadata: z.record(z.string(), z.unknown()).nullable().optional().describe("Additional data"),
})

export const UpdateCouponSchema = z.object({
  code: z.string().min(1).max(50).optional().describe("Unique coupon code"),
  name: z.string().min(1).max(255).optional().describe("Display name"),
  type: z.enum(["percentage", "fixed"]).optional().describe("Discount type"),
  value: z.number().min(0).optional().describe("Discount value"),
  currency_code: z.string().optional().describe("Currency code"),
  status: z.enum(["active", "non-active"]).optional().describe("Coupon status"),
  starts_at: z.string().datetime().nullable().optional().describe("Start date"),
  ends_at: z.string().datetime().nullable().optional().describe("End date"),
  usage_limit: z.number().int().positive().nullable().optional().describe("Max uses"),
  metadata: z.record(z.string(), z.unknown()).nullable().optional().describe("Additional data"),
})

// ============ PWP Rule Schemas ============

export const CreatePWPRuleSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255)
    .describe("Internal name"),
  rule_description: z
    .string()
    .min(1, "Description is required")
    .max(500)
    .describe("Human-readable rule description"),
  trigger_type: z
    .enum(["product", "cart_value"])
    .default("product")
    .describe("What triggers the rule"),
  trigger_product_id: z
    .string()
    .nullable()
    .optional()
    .describe("Product ID that triggers the rule"),
  trigger_cart_value: z
    .number()
    .min(0)
    .nullable()
    .optional()
    .describe("Min cart value to trigger (in cents)"),
  reward_product_id: z
    .string()
    .nullable()
    .optional()
    .describe("Product offered as reward"),
  reward_type: z
    .enum(["percentage", "fixed"])
    .default("percentage")
    .describe("Reward discount type"),
  reward_value: z
    .number()
    .min(0)
    .default(0)
    .describe("Discount on reward product"),
  status: z
    .enum(["active", "non-active"])
    .default("active")
    .describe("Rule status"),
  starts_at: z.string().datetime().nullable().optional().describe("Start date"),
  ends_at: z.string().datetime().nullable().optional().describe("End date"),
  usage_limit: z.number().int().positive().nullable().optional().describe("Max redemptions"),
  metadata: z.record(z.string(), z.unknown()).nullable().optional().describe("Additional data"),
})

export const UpdatePWPRuleSchema = z.object({
  name: z.string().min(1).max(255).optional().describe("Internal name"),
  rule_description: z.string().min(1).max(500).optional().describe("Description"),
  trigger_type: z.enum(["product", "cart_value"]).optional().describe("Trigger type"),
  trigger_product_id: z.string().nullable().optional().describe("Trigger product"),
  trigger_cart_value: z.number().min(0).nullable().optional().describe("Trigger cart value"),
  reward_product_id: z.string().nullable().optional().describe("Reward product"),
  reward_type: z.enum(["percentage", "fixed"]).optional().describe("Reward type"),
  reward_value: z.number().min(0).optional().describe("Reward value"),
  status: z.enum(["active", "non-active"]).optional().describe("Rule status"),
  starts_at: z.string().datetime().nullable().optional().describe("Start date"),
  ends_at: z.string().datetime().nullable().optional().describe("End date"),
  usage_limit: z.number().int().positive().nullable().optional().describe("Max redemptions"),
  metadata: z.record(z.string(), z.unknown()).nullable().optional().describe("Additional data"),
})

// ============ Query Schemas ============

export const ListQuerySchema = z.object({
  limit: z.coerce.number().int().positive().default(10).describe("Items per page"),
  offset: z.coerce.number().int().min(0).default(0).describe("Offset for pagination"),
  status: z.enum(["active", "non-active"]).optional().describe("Filter by status"),
  type: z.enum(["percentage", "fixed"]).optional().describe("Filter by type"),
  q: z.string().optional().describe("Search query"),
})

// ============ Types ============

export type CreateCouponInput = z.infer<typeof CreateCouponSchema>
export type UpdateCouponInput = z.infer<typeof UpdateCouponSchema>
export type CreatePWPRuleInput = z.infer<typeof CreatePWPRuleSchema>
export type UpdatePWPRuleInput = z.infer<typeof UpdatePWPRuleSchema>
export type ListQueryInput = z.infer<typeof ListQuerySchema>
