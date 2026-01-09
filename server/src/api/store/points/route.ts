import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { MEMBERSHIP_MODULE } from "../../../modules/membership"
import { POINTS_MODULE } from "../../../modules/points"
import { getVerifiedCustomerId } from "../../../utils/store-auth"

/**
 * GET /store/points
 * Get customer's points balance and redemption info
 * Requires authentication + membership
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

  // Check membership
  const isMember = await membershipService.isMember(customerId)
  if (!isMember) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Membership required to access points"
    )
  }

  // Get balance
  const balance = await pointsService.getBalance(customerId)
  const config = await pointsService.getConfig()

  // Use default redemption rate (0.01 = 100 points = $1) if config rate is 0 or undefined
  const redemptionRate = config.redemption_rate || 0.01
  const pointsPerDollar = Math.round(1 / redemptionRate)

  if (!balance) {
    return res.json({
      balance: 0,
      total_earned: 0,
      total_redeemed: 0,
      redemption_rate: redemptionRate,
      redemption_info: {
        points_per_dollar: pointsPerDollar,
        example: `${pointsPerDollar} points = $1.00`,
      },
    })
  }

  res.json({
    balance: Number(balance.balance),
    total_earned: Number(balance.total_earned),
    total_redeemed: Number(balance.total_redeemed),
    redemption_rate: redemptionRate,
    redemption_info: {
      points_per_dollar: pointsPerDollar,
      example: `${pointsPerDollar} points = $1.00`,
    },
  })
}

/**
 * OPTIONS /store/points
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  _req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send()
}
