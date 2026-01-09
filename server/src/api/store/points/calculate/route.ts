import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { MEMBERSHIP_MODULE } from "../../../../modules/membership"
import { POINTS_MODULE } from "../../../../modules/points"
import type { CalculatePointsRequest } from "../schemas"
import { getVerifiedCustomerId } from "../../../../utils/store-auth"

/**
 * POST /store/points/calculate
 * Calculate points redemption or earning for an order
 * Requires authentication + membership
 */
export const POST = async (
  req: MedusaRequest<CalculatePointsRequest>,
  res: MedusaResponse
) => {
  const customerId = getVerifiedCustomerId(req)

  if (!customerId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Authentication required"
    )
  }

  const { points_to_redeem, order_total } = req.validatedBody

  const membershipService = req.scope.resolve(MEMBERSHIP_MODULE) as any
  const pointsService = req.scope.resolve(POINTS_MODULE) as any

  // Check membership
  const isMember = await membershipService.isMember(customerId)
  if (!isMember) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Membership required"
    )
  }

  const response: any = {}

  // Calculate discount if redeeming points
  if (points_to_redeem !== undefined) {
    const balance = await pointsService.getBalance(customerId)
    if (!balance || Number(balance.balance) < points_to_redeem) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Insufficient points balance"
      )
    }

    const discountAmount = await pointsService.calculateRedemptionDiscount(
      points_to_redeem
    )

    response.redemption = {
      points: points_to_redeem,
      discount_amount: discountAmount,
      discount_formatted: `$${(discountAmount / 100).toFixed(2)}`,
    }
  }

  // Calculate points that will be earned if order_total provided
  if (order_total !== undefined) {
    const pointsEarned = await pointsService.calculatePotentialEarnings(
      order_total
    )

    response.earning = {
      order_total,
      points_earned: pointsEarned,
    }
  }

  // If both provided, calculate net effect
  if (points_to_redeem && order_total) {
    const netPoints = (response.earning?.points_earned || 0) - points_to_redeem
    response.net_effect = {
      points_change: netPoints,
      description:
        netPoints >= 0
          ? `You will gain ${netPoints} points from this order`
          : `You will use ${Math.abs(netPoints)} more points than you earn`,
    }
  }

  res.json(response)
}

/**
 * OPTIONS /store/points/calculate
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  _req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send()
}
