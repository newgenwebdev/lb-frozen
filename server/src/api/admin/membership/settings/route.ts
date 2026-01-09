import type { MedusaResponse } from "@medusajs/framework/http"
import { MEMBERSHIP_CONFIG_MODULE } from "../../../../modules/membership-config"
import { withAdminAuth } from "../../../../utils/admin-auth"

/**
 * GET /admin/membership/settings
 * Get membership program settings
 * Requires admin authentication
 */
export const GET = withAdminAuth(async (req, res) => {
  const configService = req.scope.resolve(MEMBERSHIP_CONFIG_MODULE) as any

  const config = await configService.getConfig()

  res.json({
    settings: {
      id: config.id,
      program_type: config.program_type,
      price: Number(config.price),
      duration_months: config.duration_months,
      evaluation_period_months: config.evaluation_period_months,
      evaluation_trigger: config.evaluation_trigger,
      auto_enroll_on_first_order: config.auto_enroll_on_first_order,
      is_enabled: config.is_enabled,
      created_at: config.created_at,
      updated_at: config.updated_at,
    },
  })
})

/**
 * PUT /admin/membership/settings
 * Update membership program settings
 * Requires admin authentication
 */
export const PUT = withAdminAuth(async (req, res) => {
  const configService = req.scope.resolve(MEMBERSHIP_CONFIG_MODULE) as any

  const {
    program_type,
    price,
    duration_months,
    evaluation_period_months,
    evaluation_trigger,
    auto_enroll_on_first_order,
    is_enabled,
  } = req.body as {
    program_type?: "free" | "paid"
    price?: number
    duration_months?: number | null
    evaluation_period_months?: number
    evaluation_trigger?: "on_order" | "daily" | "both"
    auto_enroll_on_first_order?: boolean
    is_enabled?: boolean
  }

  const config = await configService.updateConfig({
    program_type,
    price,
    duration_months,
    evaluation_period_months,
    evaluation_trigger,
    auto_enroll_on_first_order,
    is_enabled,
  })

  res.json({
    settings: {
      id: config.id,
      program_type: config.program_type,
      price: Number(config.price),
      duration_months: config.duration_months,
      evaluation_period_months: config.evaluation_period_months,
      evaluation_trigger: config.evaluation_trigger,
      auto_enroll_on_first_order: config.auto_enroll_on_first_order,
      is_enabled: config.is_enabled,
      created_at: config.created_at,
      updated_at: config.updated_at,
    },
  })
})
