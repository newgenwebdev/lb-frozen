import type { MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { MEMBERSHIP_DEFAULT_PRICE, MEMBERSHIP_STRIPE_PRICE_ID } from "../../../../lib/constants"
import { withAdminAuth } from "../../../../utils/admin-auth"

/**
 * GET /admin/membership/config
 * Get membership configuration
 * Requires admin authentication
 */
export const GET = withAdminAuth(async (req, res) => {
  res.json({
    config: {
      price: MEMBERSHIP_DEFAULT_PRICE,
      currency: "usd",
      stripe_price_id: MEMBERSHIP_STRIPE_PRICE_ID,
      is_enabled: true,
      is_permanent: true,
    },
  })
})

/**
 * POST /admin/membership/config
 * Update membership configuration
 * Note: In production, this would update database config
 * For now, configuration is done via environment variables
 * Requires admin authentication
 */
export const POST = withAdminAuth(async (req, res) => {
  throw new MedusaError(
    MedusaError.Types.NOT_ALLOWED,
    "Membership configuration is managed via environment variables. Please update MEMBERSHIP_DEFAULT_PRICE in your .env file."
  )
})
