import type { MedusaResponse } from "@medusajs/framework/http"
import { POINTS_MODULE } from "../../../../modules/points"
import { withAdminAuth } from "../../../../utils/admin-auth"

/**
 * GET /admin/points/config
 * Get points system configuration
 * Requires admin authentication
 */
export const GET = withAdminAuth(async (req, res) => {
  const pointsService = req.scope.resolve(POINTS_MODULE) as any
  const config = await pointsService.getConfig()

  res.json({
    config: {
      id: config.id,
      // Earning settings
      earning_type: config.earning_type,
      earning_rate: config.earning_rate,
      include_tax_in_earning: config.include_tax_in_earning ?? false,
      include_shipping_in_earning: config.include_shipping_in_earning ?? false,
      // Redemption settings
      redemption_rate: config.redemption_rate,
      min_points_to_redeem: config.min_points_to_redeem ?? 100,
      max_redemption_percentage: config.max_redemption_percentage ?? 50,
      // Expiration settings
      expiration_months: config.expiration_months ?? 0,
      // Status
      is_enabled: config.is_enabled,
      updated_at: config.updated_at,
      // Computed info for display
      redemption_info: {
        points_per_dollar: Math.round(1 / config.redemption_rate),
        example: `${Math.round(1 / config.redemption_rate)} points = $1.00`,
      },
    },
  })
})

/**
 * PUT /admin/points/config
 * Update points system configuration
 * Requires admin authentication
 */
export const PUT = withAdminAuth(async (req, res) => {
  const {
    earning_type,
    earning_rate,
    include_tax_in_earning,
    include_shipping_in_earning,
    redemption_rate,
    min_points_to_redeem,
    max_redemption_percentage,
    expiration_months,
    is_enabled,
  } = req.body as {
    earning_type?: "percentage" | "per_currency"
    earning_rate?: number
    include_tax_in_earning?: boolean
    include_shipping_in_earning?: boolean
    redemption_rate?: number
    min_points_to_redeem?: number
    max_redemption_percentage?: number
    expiration_months?: number
    is_enabled?: boolean
  }

  const pointsService = req.scope.resolve(POINTS_MODULE) as any
  const logger = req.scope.resolve("logger") as any

  const updatedConfig = await pointsService.updateConfig({
    earning_type,
    earning_rate,
    include_tax_in_earning,
    include_shipping_in_earning,
    redemption_rate,
    min_points_to_redeem,
    max_redemption_percentage,
    expiration_months,
    is_enabled,
  })

  logger.info(
    `Points configuration updated by admin - earning_type: ${updatedConfig.earning_type}, earning_rate: ${updatedConfig.earning_rate}, is_enabled: ${updatedConfig.is_enabled}`
  )

  res.json({
    config: {
      id: updatedConfig.id,
      earning_type: updatedConfig.earning_type,
      earning_rate: updatedConfig.earning_rate,
      include_tax_in_earning: updatedConfig.include_tax_in_earning,
      include_shipping_in_earning: updatedConfig.include_shipping_in_earning,
      redemption_rate: updatedConfig.redemption_rate,
      min_points_to_redeem: updatedConfig.min_points_to_redeem,
      max_redemption_percentage: updatedConfig.max_redemption_percentage,
      expiration_months: updatedConfig.expiration_months,
      is_enabled: updatedConfig.is_enabled,
      updated_at: updatedConfig.updated_at,
    },
  })
})

// Keep POST for backwards compatibility
export const POST = PUT
