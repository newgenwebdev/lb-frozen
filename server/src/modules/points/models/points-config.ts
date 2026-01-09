import { model } from "@medusajs/framework/utils"

/**
 * PointsConfig Model
 * Global configuration for the points system
 */
const PointsConfig = model.define("points_config", {
  id: model.id().primaryKey(),

  // Earning Settings
  earning_type: model.enum(["percentage", "per_currency"]).default("percentage"),
  earning_rate: model.number().default(5),           // 5% or 5 points per currency unit
  include_tax_in_earning: model.boolean().default(false),
  include_shipping_in_earning: model.boolean().default(false),

  // Redemption Settings
  redemption_rate: model.number().default(0.01),     // Points value (e.g., 0.01 = 100 points = $1)
  min_points_to_redeem: model.number().default(100), // Minimum points required for redemption
  max_redemption_percentage: model.number().default(50), // Max % of order payable by points

  // Expiration Settings
  expiration_months: model.number().default(0),      // 0 = never expire

  // Status
  is_enabled: model.boolean().default(true),
})

export default PointsConfig
