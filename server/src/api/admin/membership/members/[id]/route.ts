import type { MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { MEMBERSHIP_MODULE } from "../../../../../modules/membership"
import { POINTS_MODULE } from "../../../../../modules/points"
import { withAdminAuth } from "../../../../../utils/admin-auth"

/**
 * GET /admin/membership/members/:id
 * Get detailed member information
 * Requires admin authentication
 */
export const GET = withAdminAuth(async (req, res) => {
  const customerId = req.params.id
  const membershipService = req.scope.resolve(MEMBERSHIP_MODULE) as any
  const pointsService = req.scope.resolve(POINTS_MODULE) as any
  const customerModuleService = req.scope.resolve(Modules.CUSTOMER)

  // Get membership
  const membership = await membershipService.getMembershipByCustomer(customerId)

  if (!membership) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Customer ${customerId} is not a member`
    )
  }

  // Get customer details
  const customer = await customerModuleService.retrieveCustomer(customerId, {
    relations: ["addresses"],
  })

  // Get points balance
  const pointsBalance = await pointsService.getBalance(customerId)

  // Get recent points transactions
  const [transactions] = await pointsService.getTransactionHistory(customerId, {
    limit: 10,
    offset: 0,
  })

  res.json({
    membership: {
      id: membership.id,
      status: membership.status,
      tier_slug: membership.tier_slug,
      activated_at: membership.activated_at,
      stripe_payment_id: membership.stripe_payment_id,
    },
    customer: {
      id: customer.id,
      email: customer.email,
      first_name: customer.first_name,
      last_name: customer.last_name,
      phone: customer.phone,
      has_account: customer.has_account,
      created_at: customer.created_at,
    },
    points: pointsBalance
      ? {
          balance: Number(pointsBalance.balance),
          total_earned: Number(pointsBalance.total_earned),
          total_redeemed: Number(pointsBalance.total_redeemed),
        }
      : null,
    recent_transactions: transactions.map((t: any) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      order_id: t.order_id,
      reason: t.reason,
      balance_after: Number(t.balance_after),
      created_at: t.created_at,
    })),
  })
})

/**
 * DELETE /admin/membership/members/:id
 * Delete a membership for a customer
 * This removes the membership and associated activity data but keeps the customer
 * Requires admin authentication
 */
export const DELETE = withAdminAuth(async (req, res) => {
  const customerId = req.params.id
  const membershipService = req.scope.resolve(MEMBERSHIP_MODULE) as any
  const pointsService = req.scope.resolve(POINTS_MODULE) as any

  // Check if membership exists
  const membership = await membershipService.getMembershipByCustomer(customerId)
  if (!membership) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Customer ${customerId} is not a member`
    )
  }

  // Delete points balance for this customer (optional - clear points when deleting membership)
  try {
    await pointsService.deleteBalance(customerId)
  } catch (error) {
    // Points balance may not exist, continue with deletion
    const logger = req.scope.resolve("logger") as { warn: (msg: string) => void }
    logger.warn(`No points balance to delete for customer ${customerId}`)
  }

  // Delete membership and activity data
  const result = await membershipService.deleteMembership(customerId)

  if (!result.deleted) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Failed to delete membership for customer ${customerId}`
    )
  }

  res.json({
    id: customerId,
    deleted: true,
  })
})
