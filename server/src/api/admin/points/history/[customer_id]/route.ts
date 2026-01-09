import type { MedusaResponse } from "@medusajs/framework/http"
import { POINTS_MODULE } from "../../../../../modules/points"
import { withAdminAuth } from "../../../../../utils/admin-auth"

/**
 * GET /admin/points/history/:customer_id
 * Get points transaction history for a specific customer
 * Requires admin authentication
 */
export const GET = withAdminAuth(async (req, res) => {
  const customerId = req.params.customer_id
  const pointsService = req.scope.resolve(POINTS_MODULE) as any

  // Get pagination params with bounds checking
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 100)
  const offset = Math.max(parseInt(req.query.offset as string) || 0, 0)

  // Get transaction history
  const [transactions, count] = await pointsService.getTransactionHistory(
    customerId,
    { limit, offset }
  )

  res.json({
    customer_id: customerId,
    transactions: transactions.map((t: any) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      order_id: t.order_id,
      reason: t.reason,
      balance_after: Number(t.balance_after),
      created_by: t.created_by,
      created_at: t.created_at,
    })),
    count,
    limit,
    offset,
  })
})
