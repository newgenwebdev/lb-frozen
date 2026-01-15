import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MEMBERSHIP_MODULE } from "../../../modules/membership"
import { MEMBERSHIP_CONFIG_MODULE } from "../../../modules/membership-config"
import { TIER_CONFIG_MODULE } from "../../../modules/tier-config"

/**
 * GET /store/membership
 * Get membership program configuration and pricing
 * Returns dynamic config set by admin (free vs paid, price, tiers, etc.)
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const membershipService = req.scope.resolve(MEMBERSHIP_MODULE) as any
  const membershipConfigService = req.scope.resolve(MEMBERSHIP_CONFIG_MODULE) as any
  const tierConfigService = req.scope.resolve(TIER_CONFIG_MODULE) as any

  // Get global membership configuration
  const config = await membershipConfigService.getConfig()

  // Get all active tiers
  const allTiers = await tierConfigService.getActiveTiers()

  // Get default tier for new members
  const defaultTier = await tierConfigService.getDefaultTier()

  // If user is authenticated, check their membership status
  let userMembership: any = null
  if ((req as any).auth?.actor_id) {
    userMembership = await membershipService.getMembershipByCustomer(
      (req as any).auth.actor_id
    )
  }

  // Build dynamic benefits list from highest tier
  const highestTier = allTiers.length > 0
    ? allTiers.reduce((max: any, tier: any) => (tier.rank > max.rank ? tier : max), allTiers[0])
    : null

  const benefits = [
    `Earn points on every purchase${highestTier ? ` (up to ${highestTier.points_multiplier}x multiplier)` : ""}`,
    "Access to exclusive member-only promotions",
    highestTier && highestTier.discount_percentage > 0
      ? `Tier-based discounts up to ${highestTier.discount_percentage}% off`
      : "Tier-based discounts on purchases",
    highestTier && highestTier.birthday_voucher_amount > 0
      ? "Birthday vouchers as you level up"
      : "Special birthday rewards",
    "Automatic tier upgrades based on your activity",
  ]

  res.json({
    // Program configuration (dynamic from admin settings)
    config: {
      program_type: config.program_type,           // "free" or "paid"
      price: Number(config.price),                 // Price in cents (0 for free)
      currency: "myr",                             // TODO: Make configurable from admin settings
      duration_months: config.duration_months,     // null = lifetime
      auto_enroll_on_first_order: config.auto_enroll_on_first_order,
      evaluation_period_months: config.evaluation_period_months,
      is_enabled: config.is_enabled,
    },
    // Tier information
    tiers: {
      default_tier: defaultTier ? {
        slug: defaultTier.slug,
        name: defaultTier.name,
      } : null,
      all_tiers: allTiers.map((t: any) => ({
        slug: t.slug,
        name: t.name,
        rank: t.rank,
        order_threshold: t.order_threshold,
        spend_threshold: Number(t.spend_threshold),
        points_multiplier: t.points_multiplier,
        discount_percentage: t.discount_percentage,
        birthday_voucher_amount: Number(t.birthday_voucher_amount),
        is_default: t.is_default,
      })),
    },
    // Dynamic benefits list
    benefits,
    // User's current membership status (if authenticated)
    user_status: userMembership
      ? {
          is_member: userMembership.status === "active",
          activated_at: userMembership.activated_at,
          tier_slug: userMembership.tier_slug,
        }
      : null,
  })
}
