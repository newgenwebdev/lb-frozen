import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { MEMBERSHIP_MODULE } from "../../../../modules/membership"
import { POINTS_MODULE } from "../../../../modules/points"
import { TIER_CONFIG_MODULE } from "../../../../modules/tier-config"
import { getVerifiedCustomerId } from "../../../../utils/store-auth"

/**
 * GET /store/membership/status
 * Get current customer's membership and points status with tier details
 * Requires authentication
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const customerId = getVerifiedCustomerId(req)

  if (!customerId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Authentication required"
    )
  }
  const membershipService = req.scope.resolve(MEMBERSHIP_MODULE) as any
  const pointsService = req.scope.resolve(POINTS_MODULE) as any
  const tierConfigService = req.scope.resolve(TIER_CONFIG_MODULE) as any

  // Get membership with activity stats
  const membershipData = await membershipService.getMembershipWithActivity(customerId)

  if (!membershipData) {
    // Return all tiers for non-members to show what's available
    const allTiers = await tierConfigService.getActiveTiers()
    return res.json({
      is_member: false,
      membership: null,
      points: null,
      tier: null,
      activity: null,
      next_tier: null,
      all_tiers: allTiers.map((t: any) => ({
        slug: t.slug,
        name: t.name,
        rank: t.rank,
        order_threshold: t.order_threshold,
        spend_threshold: Number(t.spend_threshold),
        points_multiplier: t.points_multiplier,
        discount_percentage: t.discount_percentage,
        birthday_voucher_amount: Number(t.birthday_voucher_amount),
      })),
    })
  }

  const { membership, activity } = membershipData

  // Get current tier details
  const currentTier = await tierConfigService.getTierBySlug(membership.tier_slug || "classic")

  // Get all active tiers to find next tier and for comparison
  const allTiers = await tierConfigService.getActiveTiers()

  // Find next tier (if any)
  let nextTier = null
  if (currentTier) {
    const currentRank = currentTier.rank
    const higherTiers = allTiers.filter((t: any) => t.rank > currentRank)
    if (higherTiers.length > 0) {
      nextTier = higherTiers[0] // Get the immediately next tier
    }
  }

  // Get points balance
  const pointsBalance = await pointsService.getBalance(customerId)

  res.json({
    is_member: membership.status === "active",
    membership: {
      id: membership.id,
      status: membership.status,
      tier_slug: membership.tier_slug,
      activated_at: membership.activated_at,
      tier_updated_at: membership.tier_updated_at,
    },
    tier: currentTier
      ? {
          slug: currentTier.slug,
          name: currentTier.name,
          rank: currentTier.rank,
          points_multiplier: currentTier.points_multiplier,
          discount_percentage: currentTier.discount_percentage,
          birthday_voucher_amount: Number(currentTier.birthday_voucher_amount),
        }
      : null,
    activity: {
      rolling_order_count: activity.rolling_order_count || 0,
      rolling_spend_total: Number(activity.rolling_spend_total) || 0,
      last_calculated_at: activity.last_calculated_at,
    },
    next_tier: nextTier
      ? {
          slug: nextTier.slug,
          name: nextTier.name,
          rank: nextTier.rank,
          order_threshold: nextTier.order_threshold,
          spend_threshold: Number(nextTier.spend_threshold),
          points_multiplier: nextTier.points_multiplier,
          discount_percentage: nextTier.discount_percentage,
          birthday_voucher_amount: Number(nextTier.birthday_voucher_amount),
          // Calculate progress
          orders_needed: Math.max(0, nextTier.order_threshold - (activity.rolling_order_count || 0)),
          spend_needed: Math.max(0, Number(nextTier.spend_threshold) - (Number(activity.rolling_spend_total) || 0)),
        }
      : null,
    points: pointsBalance
      ? {
          balance: Number(pointsBalance.balance),
          total_earned: Number(pointsBalance.total_earned),
          total_redeemed: Number(pointsBalance.total_redeemed),
        }
      : null,
    all_tiers: allTiers.map((t: any) => ({
      slug: t.slug,
      name: t.name,
      rank: t.rank,
      order_threshold: t.order_threshold,
      spend_threshold: Number(t.spend_threshold),
      points_multiplier: t.points_multiplier,
      discount_percentage: t.discount_percentage,
      birthday_voucher_amount: Number(t.birthday_voucher_amount),
    })),
  })
}

/**
 * OPTIONS /store/membership/status
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  _req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send()
}
