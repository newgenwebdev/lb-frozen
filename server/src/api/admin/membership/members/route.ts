import type { MedusaResponse } from "@medusajs/framework/http"
import { Modules, MedusaError } from "@medusajs/framework/utils"
import { MEMBERSHIP_MODULE } from "../../../../modules/membership"
import { POINTS_MODULE } from "../../../../modules/points"
import { withAdminAuth } from "../../../../utils/admin-auth"

/**
 * POST /admin/membership/members
 * Create a new membership for an existing customer
 * Requires admin authentication
 */
export const POST = withAdminAuth(async (req, res) => {
  const membershipService = req.scope.resolve(MEMBERSHIP_MODULE) as any
  const customerModuleService = req.scope.resolve(Modules.CUSTOMER)
  const pointsService = req.scope.resolve(POINTS_MODULE) as any

  const { customer_id, initial_points } = req.body as {
    customer_id: string
    initial_points?: number
  }

  // Validate required fields
  if (!customer_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "customer_id is required"
    )
  }

  // Check if customer exists
  const customer = await customerModuleService.retrieveCustomer(customer_id).catch(() => null)
  if (!customer) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Customer not found"
    )
  }

  // Check if customer is already a member
  const existingMembership = await membershipService.getMembershipByCustomer(customer_id)
  if (existingMembership) {
    throw new MedusaError(
      MedusaError.Types.DUPLICATE_ERROR,
      "Customer is already a member"
    )
  }

  // Create membership with a placeholder stripe_payment_id for admin-created members
  const membership = await membershipService.createFreeMembership(customer_id)

  // Initialize points balance if specified (wrapped in try-catch for graceful handling)
  let pointsBalance = null
  try {
    if (initial_points && initial_points > 0) {
      await pointsService.adjustPoints(customer_id, initial_points, "Admin-created membership bonus")
    }
    // Get the points balance
    pointsBalance = await pointsService.getBalance(customer_id)
  } catch (pointsError) {
    // Log the error but don't fail the membership creation
    const logger = req.scope.resolve("logger") as { error: (msg: string, err?: unknown) => void }
    logger.error(`Failed to initialize points for customer ${customer_id}`, pointsError)
  }

  res.status(201).json({
    membership: {
      id: membership.id,
      customer_id: membership.customer_id,
      tier_slug: membership.tier_slug,
      status: membership.status,
      activated_at: membership.activated_at,
    },
    customer: {
      id: customer.id,
      email: customer.email,
      first_name: customer.first_name,
      last_name: customer.last_name,
    },
    points: pointsBalance
      ? {
          balance: Number(pointsBalance.balance),
          total_earned: Number(pointsBalance.total_earned),
          total_redeemed: Number(pointsBalance.total_redeemed),
        }
      : null,
  })
})

/**
 * GET /admin/membership/members
 * List all members with pagination
 * Requires admin authentication
 */
export const GET = withAdminAuth(async (req, res) => {
  const membershipService = req.scope.resolve(MEMBERSHIP_MODULE) as any
  const pointsService = req.scope.resolve(POINTS_MODULE) as any
  const customerModuleService = req.scope.resolve(Modules.CUSTOMER)

  // Get pagination params with bounds checking
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 100)
  const offset = Math.max(parseInt(req.query.offset as string) || 0, 0)
  const search = req.query.search as string

  // Get all active memberships
  const [memberships, count] = await membershipService.listActiveMembers({
    limit,
    offset,
  })

  // Batch load customers and points data to avoid N+1 queries
  const customerIds = memberships.map((m: any) => m.customer_id)

  const [customers, pointsBalanceMap] = await Promise.all([
    customerIds.length > 0
      ? customerModuleService.listCustomers({ id: customerIds })
      : [],
    pointsService.getBalances(customerIds),
  ])

  // Create customer lookup map for O(1) access
  const customerMap = new Map<string, any>()
  for (const c of customers as any[]) {
    customerMap.set(c.id, c)
  }

  // Enrich memberships with customer and points data
  const enrichedMembers = memberships.map((membership: any) => {
    const customer = customerMap.get(membership.customer_id)
    const pointsBalance = pointsBalanceMap.get(membership.customer_id)

    return {
      membership_id: membership.id,
      customer: customer
        ? {
            id: customer.id,
            email: customer.email,
            first_name: customer.first_name,
            last_name: customer.last_name,
          }
        : null,
      tier_slug: membership.tier_slug,
      status: membership.status,
      activated_at: membership.activated_at,
      points: pointsBalance
        ? {
            balance: Number(pointsBalance.balance),
            total_earned: Number(pointsBalance.total_earned),
            total_redeemed: Number(pointsBalance.total_redeemed),
          }
        : null,
    }
  })

  // Filter by search if provided
  let filteredMembers = enrichedMembers
  if (search) {
    const searchLower = search.toLowerCase()
    filteredMembers = enrichedMembers.filter(
      (m: any) =>
        m.customer?.email?.toLowerCase().includes(searchLower) ||
        m.customer?.first_name?.toLowerCase().includes(searchLower) ||
        m.customer?.last_name?.toLowerCase().includes(searchLower)
    )
  }

  res.json({
    members: filteredMembers,
    count: search ? filteredMembers.length : count,
    limit,
    offset,
  })
})
