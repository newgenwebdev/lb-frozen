import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { MEMBERSHIP_MODULE } from "../../../../modules/membership"
import { POINTS_MODULE } from "../../../../modules/points"
import { getVerifiedCustomerId } from "../../../../utils/store-auth"

/**
 * GET /store/points/history
 * Get customer's points transaction history
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
      "Membership required to access points history"
    )
  }

  // Get pagination params
  const limit = parseInt(req.query.limit as string) || 20
  const offset = parseInt(req.query.offset as string) || 0

  // Get transaction history
  const [transactions, count] = await pointsService.getTransactionHistory(
    customerId,
    { limit, offset }
  )

  res.json({
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      order_id: t.order_id,
      reason: t.reason,
      balance_after: Number(t.balance_after),
      created_at: t.created_at,
    })),
    count,
    limit,
    offset,
  })
}

/**
 * OPTIONS /store/points/history
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  _req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send()
}
