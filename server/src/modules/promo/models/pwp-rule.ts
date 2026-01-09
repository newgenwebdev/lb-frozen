import { model } from "@medusajs/framework/utils"

/**
 * PWP (Purchase with Purchase) Rule model
 * Defines promotional rules like "Buy X, get Y at Z% off"
 * Note: created_at, updated_at, deleted_at are auto-managed by Medusa
 */
const PWPRule = model.define("pwp_rule", {
  id: model.id().primaryKey(),
  name: model.text(), // Internal name
  rule_description: model.text(), // e.g., "PWP: Coffee → Sunscreen 50%."

  // Rule conditions
  trigger_type: model.enum(["product", "cart_value"]).default("product"),
  trigger_product_id: model.text().nullable(), // Product that triggers the rule
  trigger_cart_value: model.number().nullable(), // Min cart value to trigger (in cents)

  // Rule rewards
  reward_product_id: model.text().nullable(), // Product offered as reward
  reward_type: model.enum(["percentage", "fixed"]).default("percentage"),
  reward_value: model.number().default(0), // Discount on reward product

  // Validity
  status: model.enum(["active", "non-active"]).default("active"),
  starts_at: model.dateTime().nullable(),
  ends_at: model.dateTime().nullable(),

  // Usage tracking
  usage_limit: model.number().nullable(),
  redemption_count: model.number().default(0),

  metadata: model.json().nullable(),
})

export default PWPRule
