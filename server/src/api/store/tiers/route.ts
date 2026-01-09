import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TIER_CONFIG_MODULE } from "../../../modules/tier-config"

/**
 * GET /store/tiers
 * Get all active membership tiers (public endpoint)
 * Used for displaying tier comparison on frontend
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const tierConfigService = req.scope.resolve(TIER_CONFIG_MODULE) as any

  const tiers = await tierConfigService.getActiveTiers()

  res.json({
    tiers: tiers.map((tier: any) => ({
      slug: tier.slug,
      name: tier.name,
      rank: tier.rank,
      order_threshold: tier.order_threshold,
      spend_threshold: Number(tier.spend_threshold),
      points_multiplier: tier.points_multiplier,
      discount_percentage: tier.discount_percentage,
      birthday_voucher_amount: Number(tier.birthday_voucher_amount),
      is_default: tier.is_default,
    })),
  })
}
