import type { MedusaResponse } from "@medusajs/framework/http"
import { TIER_CONFIG_MODULE } from "../../../modules/tier-config"
import { withAdminAuth } from "../../../utils/admin-auth"

/**
 * GET /admin/tiers
 * List all tier configurations
 * Requires admin authentication
 */
export const GET = withAdminAuth(async (req, res) => {
  const tierService = req.scope.resolve(TIER_CONFIG_MODULE) as any

  // Get query params
  const includeInactive = req.query.include_inactive === "true"

  const tiers = includeInactive
    ? await tierService.getAllTiers()
    : await tierService.getActiveTiers()

  // Format tiers for response
  const formattedTiers = tiers.map((tier: any) => ({
    id: tier.id,
    name: tier.name,
    slug: tier.slug,
    rank: tier.rank,
    order_threshold: tier.order_threshold,
    spend_threshold: Number(tier.spend_threshold),
    points_multiplier: tier.points_multiplier,
    discount_percentage: tier.discount_percentage,
    birthday_voucher_amount: Number(tier.birthday_voucher_amount),
    is_default: tier.is_default,
    is_active: tier.is_active,
    created_at: tier.created_at,
    updated_at: tier.updated_at,
  }))

  res.json({
    tiers: formattedTiers,
    count: formattedTiers.length,
  })
})

/**
 * POST /admin/tiers
 * Create a new tier configuration
 * Requires admin authentication
 */
export const POST = withAdminAuth(async (req, res) => {
  const tierService = req.scope.resolve(TIER_CONFIG_MODULE) as any

  const {
    name,
    slug,
    rank,
    order_threshold,
    spend_threshold,
    points_multiplier,
    discount_percentage,
    birthday_voucher_amount,
    is_default,
  } = req.body as {
    name: string
    slug: string
    rank: number
    order_threshold?: number
    spend_threshold?: number
    points_multiplier?: number
    discount_percentage?: number
    birthday_voucher_amount?: number
    is_default?: boolean
  }

  // Validate required fields
  if (!name || !slug || rank === undefined) {
    res.status(400).json({
      message: "Missing required fields: name, slug, rank",
    })
    return
  }

  // Check if slug already exists
  const existingTier = await tierService.getTierBySlug(slug)
  if (existingTier) {
    res.status(400).json({
      message: `A tier with slug "${slug}" already exists`,
    })
    return
  }

  const tier = await tierService.createTier({
    name,
    slug,
    rank,
    order_threshold,
    spend_threshold,
    points_multiplier,
    discount_percentage,
    birthday_voucher_amount,
    is_default,
  })

  res.status(201).json({
    tier: {
      id: tier.id,
      name: tier.name,
      slug: tier.slug,
      rank: tier.rank,
      order_threshold: tier.order_threshold,
      spend_threshold: Number(tier.spend_threshold),
      points_multiplier: tier.points_multiplier,
      discount_percentage: tier.discount_percentage,
      birthday_voucher_amount: Number(tier.birthday_voucher_amount),
      is_default: tier.is_default,
      is_active: tier.is_active,
      created_at: tier.created_at,
      updated_at: tier.updated_at,
    },
  })
})
