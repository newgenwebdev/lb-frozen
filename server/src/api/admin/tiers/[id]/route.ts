import type { MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { TIER_CONFIG_MODULE } from "../../../../modules/tier-config"
import { withAdminAuth } from "../../../../utils/admin-auth"

/**
 * GET /admin/tiers/:id
 * Get a single tier configuration by ID
 * Requires admin authentication
 */
export const GET = withAdminAuth(async (req, res) => {
  const tierId = req.params.id
  const tierService = req.scope.resolve(TIER_CONFIG_MODULE) as any

  const tier = await tierService.getTierById(tierId)

  if (!tier) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Tier ${tierId} not found`)
  }

  res.json({
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

/**
 * PUT /admin/tiers/:id
 * Update a tier configuration
 * Requires admin authentication
 */
export const PUT = withAdminAuth(async (req, res) => {
  const tierId = req.params.id
  const tierService = req.scope.resolve(TIER_CONFIG_MODULE) as any

  // Verify tier exists
  const existingTier = await tierService.getTierById(tierId)
  if (!existingTier) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Tier ${tierId} not found`)
  }

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
    is_active,
  } = req.body as {
    name?: string
    slug?: string
    rank?: number
    order_threshold?: number
    spend_threshold?: number
    points_multiplier?: number
    discount_percentage?: number
    birthday_voucher_amount?: number
    is_default?: boolean
    is_active?: boolean
  }

  // If slug is being changed, check it doesn't conflict
  if (slug && slug !== existingTier.slug) {
    const conflictingTier = await tierService.getTierBySlug(slug)
    if (conflictingTier) {
      res.status(400).json({
        message: `A tier with slug "${slug}" already exists`,
      })
      return
    }
  }

  // Prevent disabling the default tier
  if (is_active === false && existingTier.is_default) {
    res.status(400).json({
      message: "Cannot disable the default tier. Set another tier as default first.",
    })
    return
  }

  const tier = await tierService.updateTier({
    id: tierId,
    name,
    slug,
    rank,
    order_threshold,
    spend_threshold,
    points_multiplier,
    discount_percentage,
    birthday_voucher_amount,
    is_default,
    is_active,
  })

  res.json({
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

/**
 * DELETE /admin/tiers/:id
 * Soft delete a tier configuration
 * Requires admin authentication
 */
export const DELETE = withAdminAuth(async (req, res) => {
  const tierId = req.params.id
  const tierService = req.scope.resolve(TIER_CONFIG_MODULE) as any

  // Verify tier exists
  const existingTier = await tierService.getTierById(tierId)
  if (!existingTier) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Tier ${tierId} not found`)
  }

  // Prevent deleting the default tier
  if (existingTier.is_default) {
    res.status(400).json({
      message: "Cannot delete the default tier. Set another tier as default first.",
    })
    return
  }

  await tierService.deleteTier(tierId)

  res.json({
    id: tierId,
    deleted: true,
  })
})
