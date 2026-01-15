import { model } from "@medusajs/framework/utils"

/**
 * Coupon model for discount codes
 * Supports both percentage and fixed amount discounts
 * Note: created_at, updated_at, deleted_at are auto-managed by Medusa
 */
const Coupon = model.define("coupon", {
  id: model.id().primaryKey(),
  code: model.text().unique(), // e.g., "CLEANSING20"
  name: model.text(), // Display name for the coupon
  type: model.enum(["percentage", "fixed"]).default("percentage"),
  value: model.number().default(0), // Percentage value (0-100) or fixed amount in cents
  currency_code: model.text().default("MYR"), // For fixed amount coupons
  status: model.enum(["active", "non-active"]).default("active"),
  starts_at: model.dateTime().nullable(),
  ends_at: model.dateTime().nullable(),
  usage_limit: model.number().nullable(), // Max total uses
  usage_count: model.number().default(0), // Current usage count
  metadata: model.json().nullable(),
})

export default Coupon
