import type { MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { POINTS_MODULE } from "../../../../modules/points"
import { MEMBERSHIP_MODULE } from "../../../../modules/membership"
import { withAdminAuth } from "../../../../utils/admin-auth"
import type { AdjustPointsRequest } from "../schemas"

/**
 * POST /admin/points/adjust
 * Manually adjust customer points (admin only)
 * Requires admin authentication
 */
export const POST = withAdminAuth<AdjustPointsRequest>(async (req, res) => {
  const { customer_id, amount, reason } = req.validatedBody

  const pointsService = req.scope.resolve(POINTS_MODULE) as any
  const membershipService = req.scope.resolve(MEMBERSHIP_MODULE) as any
  const logger = req.scope.resolve("logger")

  // Verify customer is a member
  const isMember = await membershipService.isMember(customer_id)
  if (!isMember) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Customer must be a member to adjust points"
    )
  }

  // Get admin ID from auth context
  const adminId = req.auth_context.actor_id

  // Adjust points
  const result = await pointsService.adminAdjustPoints({
    customer_id,
    amount,
    reason,
    admin_id: adminId,
  })

  logger.info(
    `Admin ${adminId} adjusted points for customer ${customer_id} by ${amount} - reason: ${reason}`
  )

  res.json({
    success: true,
    adjustment: {
      customer_id,
      amount: result.amount,
      new_balance: result.new_balance,
      reason,
      adjusted_by: adminId,
    },
  })
})
