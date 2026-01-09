import { model } from "@medusajs/framework/utils"

/**
 * Membership Model
 * Tracks membership status and tier for customers in the loyalty program
 *
 * Updated to support tiered loyalty system:
 * - All customers automatically start at Classic tier (free)
 * - Tier upgrades based on rolling 12-month activity (orders + spend)
 * - tier_slug references tier_config.slug for flexible tier configuration
 */
const Membership = model.define("membership", {
  id: model.id().primaryKey(),
  customer_id: model.text().unique(),
  status: model.enum(["active", "cancelled"]).default("active"),
  tier_slug: model.text().default("classic"),      // Reference to tier_config.slug
  tier_updated_at: model.dateTime().nullable(),    // When tier was last changed
  activated_at: model.dateTime(),
  stripe_payment_id: model.text().nullable(),      // Legacy field for paid memberships, nullable for free members
})

export default Membership
