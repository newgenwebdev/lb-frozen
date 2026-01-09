import { MedusaService } from "@medusajs/framework/utils"
import TierConfig from "../models/tier-config"

type CreateTierInput = {
  name: string
  slug: string
  rank: number
  order_threshold?: number
  spend_threshold?: number
  points_multiplier?: number
  discount_percentage?: number
  birthday_voucher_amount?: number
  is_default?: boolean
  is_active?: boolean
}

type UpdateTierInput = {
  id: string
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

type InjectedDependencies = {
  logger: any
}

/**
 * TierConfigModuleService
 * Manages tier configurations for the loyalty program
 *
 * IMPORTANT: Service class name uses "ModuleService" suffix to avoid
 * conflict with Medusa's auto-generated internal service.
 */
class TierConfigModuleService extends MedusaService({
  TierConfig,
}) {
  protected logger: any


  constructor({ logger }: InjectedDependencies) {
    super(...arguments)
    this.logger = logger
  }

  /**
   * Get all active tiers ordered by rank (lowest first)
   */
  async getActiveTiers(): Promise<any[]> {
    const tiers = await this.listTierConfigs(
      { is_active: true },
      { order: { rank: "ASC" } }
    )
    return tiers
  }

  /**
   * Get all tiers (including inactive) ordered by rank
   */
  async getAllTiers(): Promise<any[]> {
    const tiers = await this.listTierConfigs(
      {},
      { order: { rank: "ASC" } }
    )
    return tiers
  }

  /**
   * Get the default tier (usually Classic)
   * Returns the tier marked as is_default, or the lowest ranked tier
   */
  async getDefaultTier(): Promise<any> {
    // First try to find explicitly marked default tier
    const defaultTiers = await this.listTierConfigs(
      { is_default: true, is_active: true },
      { take: 1 }
    )

    if (defaultTiers[0]) {
      return defaultTiers[0]
    }

    // Fallback to lowest ranked active tier
    const tiers = await this.getActiveTiers()
    return tiers[0] || null
  }

  /**
   * Determine appropriate tier based on customer's order count and total spend
   * Returns the highest tier the customer qualifies for
   *
   * @param orderCount - Number of orders in rolling 12-month period
   * @param totalSpend - Total spend in cents in rolling 12-month period
   */
  async determineTierForActivity(orderCount: number, totalSpend: number): Promise<any> {
    const tiers = await this.getActiveTiers()

    if (tiers.length === 0) {
      return null
    }

    // Find highest tier the customer qualifies for
    // Tiers are ordered by rank ASC, so iterate backwards to find highest match
    for (let i = tiers.length - 1; i >= 0; i--) {
      const tier = tiers[i]
      const tierSpendThreshold = Number(tier.spend_threshold) || 0

      if (orderCount >= tier.order_threshold && totalSpend >= tierSpendThreshold) {
        this.logger.info(
          `[TIER-CONFIG] Customer qualifies for tier "${tier.name}" ` +
          `(orders: ${orderCount}>=${tier.order_threshold}, spend: ${totalSpend}>=${tierSpendThreshold})`
        )
        return tier
      }
    }

    // If no tier matched, return the default tier
    return this.getDefaultTier()
  }

  /**
   * Create a new tier configuration
   */
  async createTier(data: CreateTierInput): Promise<any> {
    this.logger.info(`[TIER-CONFIG] Creating tier: ${data.name} (${data.slug})`)

    const tier = await this.createTierConfigs({
      name: data.name,
      slug: data.slug.toLowerCase(),
      rank: data.rank,
      order_threshold: data.order_threshold || 0,
      spend_threshold: data.spend_threshold || 0,
      points_multiplier: data.points_multiplier || 1,
      discount_percentage: data.discount_percentage || 0,
      birthday_voucher_amount: data.birthday_voucher_amount || 0,
      is_default: data.is_default || false,
      is_active: data.is_active !== false,
    })

    this.logger.info(`[TIER-CONFIG] Tier created: ${(tier as any).id}`)
    return tier
  }

  /**
   * Update an existing tier configuration
   */
  async updateTier(data: UpdateTierInput): Promise<any> {
    this.logger.info(`[TIER-CONFIG] Updating tier: ${data.id}`)

    const updateData: Record<string, any> = { id: data.id }

    if (data.name !== undefined) updateData.name = data.name
    if (data.slug !== undefined) updateData.slug = data.slug.toLowerCase()
    if (data.rank !== undefined) updateData.rank = data.rank
    if (data.order_threshold !== undefined) updateData.order_threshold = data.order_threshold
    if (data.spend_threshold !== undefined) updateData.spend_threshold = data.spend_threshold
    if (data.points_multiplier !== undefined) updateData.points_multiplier = data.points_multiplier
    if (data.discount_percentage !== undefined) updateData.discount_percentage = data.discount_percentage
    if (data.birthday_voucher_amount !== undefined) updateData.birthday_voucher_amount = data.birthday_voucher_amount
    if (data.is_default !== undefined) updateData.is_default = data.is_default
    if (data.is_active !== undefined) updateData.is_active = data.is_active

    const tier = await this.updateTierConfigs(updateData)

    this.logger.info(`[TIER-CONFIG] Tier updated: ${data.id}`)
    return tier
  }

  /**
   * Get tier by slug
   */
  async getTierBySlug(slug: string): Promise<any> {
    const tiers = await this.listTierConfigs(
      { slug: slug.toLowerCase() },
      { take: 1 }
    )
    return tiers[0] || null
  }

  /**
   * Get tier by ID
   */
  async getTierById(id: string): Promise<any> {
    try {
      return await this.retrieveTierConfig(id)
    } catch {
      return null
    }
  }

  /**
   * Soft delete a tier
   */
  async deleteTier(id: string): Promise<void> {
    this.logger.info(`[TIER-CONFIG] Deleting tier: ${id}`)
    await this.softDeleteTierConfigs([id])
    this.logger.info(`[TIER-CONFIG] Tier deleted: ${id}`)
  }
}

export default TierConfigModuleService
