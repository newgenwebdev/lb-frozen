import { model } from "@medusajs/framework/utils"

/**
 * TierConfig Model
 * Stores tier definitions with thresholds and benefits for the loyalty program
 *
 * Tiers are ordered by rank (0 = lowest/default tier like Classic)
 * Customers automatically qualify for the highest tier where they meet
 * both order_threshold AND spend_threshold requirements
 */
const TierConfig = model.define("tier_config", {
  id: model.id().primaryKey(),
  name: model.text(),                            // Display name: "Classic", "Silver", "Gold", "Platinum"
  slug: model.text().unique(),                   // URL-safe identifier: "classic", "silver", "gold", "platinum"
  rank: model.number().default(0),               // Tier order (0 = lowest, higher = better tier)
  order_threshold: model.number().default(0),    // Min orders in rolling 12 months to reach this tier
  spend_threshold: model.bigNumber().default(0), // Min spend (in cents) in rolling 12 months
  points_multiplier: model.number().default(1),  // Points earning multiplier (1.0, 1.5, 2.0, 3.0)
  discount_percentage: model.number().default(0), // Tier discount percentage (0, 5, 10, 15)
  birthday_voucher_amount: model.bigNumber().default(0), // Birthday voucher value in cents
  is_default: model.boolean().default(false),    // Is this the default tier for new members?
  is_active: model.boolean().default(true),      // Is this tier currently active?
})

export default TierConfig
