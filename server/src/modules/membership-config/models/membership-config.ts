import { model } from "@medusajs/framework/utils"

/**
 * MembershipConfig Model
 * Global configuration for the membership/loyalty program
 */
const MembershipConfig = model.define("membership_config", {
  id: model.id().primaryKey(),

  // Program Type
  program_type: model.enum(["free", "paid"]).default("free"),

  // Paid Membership Settings (only applicable if program_type = "paid")
  price: model.bigNumber().default(0),                    // Price in cents
  duration_months: model.number().nullable(),             // null = lifetime

  // Tier Evaluation Settings
  evaluation_period_months: model.number().default(12),   // Rolling period for activity
  evaluation_trigger: model.enum(["on_order", "daily", "both"]).default("both"),

  // Auto-enrollment
  auto_enroll_on_first_order: model.boolean().default(true),

  // Program Status
  is_enabled: model.boolean().default(true),
})

export default MembershipConfig
