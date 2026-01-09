import { MedusaService } from "@medusajs/framework/utils"
import Membership from "../models/membership"
import CustomerActivity from "../models/customer-activity"
import CustomerActivityOrder from "../models/customer-activity-order"

type CreateMembershipInput = {
  customer_id: string
  stripe_payment_id?: string | null
  tier_slug?: string
}

type InjectedDependencies = {
  logger: any
}

/**
 * MembershipModuleService
 * Handles membership creation, retrieval, status management, and tier tracking
 *
 * Updated to support tiered loyalty system:
 * - Free membership creation (no Stripe payment required)
 * - Rolling 12-month activity tracking for tier calculation
 * - Automatic tier upgrades/downgrades based on activity
 *
 * IMPORTANT: The service class name must NOT match the pattern {ModelName}Service
 * (e.g., MembershipService) because it would conflict with the internal service
 * that Medusa auto-generates for each model.
 */
class MembershipModuleService extends MedusaService({
  Membership,
  CustomerActivity,
  CustomerActivityOrder,
}) {
  protected logger: any


  constructor({ logger }: InjectedDependencies) {
    super(...arguments)
    this.logger = logger
  }

  /**
   * Create a new membership for a customer (legacy method for paid memberships)
   */
  async createMembership(data: CreateMembershipInput): Promise<any> {
    this.logger.info(`Creating membership for customer ${data.customer_id}`)

    const membership = await this.createMemberships({
      customer_id: data.customer_id,
      stripe_payment_id: data.stripe_payment_id || null,
      tier_slug: data.tier_slug || "classic",
      status: "active",
      activated_at: new Date(),
    })

    // Initialize customer activity tracking
    await this.initializeCustomerActivity(data.customer_id)

    this.logger.info(`Membership created: ${(membership as any).id}`)
    return membership
  }

  /**
   * Create free membership for new customer (starts at Classic tier)
   * Used for the new tiered loyalty system where all customers get free membership
   */
  async createFreeMembership(customerId: string): Promise<any> {
    this.logger.info(`[MEMBERSHIP] Creating free membership for customer ${customerId}`)

    // Check if membership already exists
    const existing = await this.getMembershipByCustomer(customerId)
    if (existing) {
      this.logger.info(`[MEMBERSHIP] Customer ${customerId} already has membership`)
      return existing
    }

    const membership = await this.createMemberships({
      customer_id: customerId,
      status: "active",
      tier_slug: "classic",
      activated_at: new Date(),
      stripe_payment_id: null,
    })

    // Initialize customer activity tracking
    await this.initializeCustomerActivity(customerId)

    this.logger.info(`[MEMBERSHIP] Free membership created: ${(membership as any).id}`)
    return membership
  }

  /**
   * Initialize customer activity tracking record
   */
  async initializeCustomerActivity(customerId: string): Promise<any> {
    // Check if activity record already exists
    const existing = await this.getCustomerActivity(customerId)
    if (existing) {
      return existing
    }

    const activity = await this.createCustomerActivities({
      customer_id: customerId,
      rolling_order_count: 0,
      rolling_spend_total: 0,
      last_calculated_at: new Date(),
    })

    this.logger.info(`[MEMBERSHIP] Initialized activity tracking for customer ${customerId}`)
    return activity
  }

  /**
   * Get membership by customer ID
   */
  async getMembershipByCustomer(customerId: string): Promise<any> {
    const memberships = await this.listMemberships(
      { customer_id: customerId },
      { take: 1 }
    )

    return memberships[0] || null
  }

  /**
   * Check if customer is an active member
   */
  async isMember(customerId: string): Promise<boolean> {
    const membership: any = await this.getMembershipByCustomer(customerId)
    return membership !== null && membership.status === "active"
  }

  /**
   * Cancel a membership
   */
  async cancelMembership(membershipId: string): Promise<any> {
    this.logger.info(`Cancelling membership ${membershipId}`)

    const membership = await this.updateMemberships({
      id: membershipId,
      status: "cancelled",
    })

    this.logger.info(`Membership cancelled: ${membershipId}`)
    return membership
  }

  /**
   * Get all active members with pagination
   */
  async listActiveMembers(filters?: { limit?: number; offset?: number }): Promise<[any[], number]> {
    // Get paginated memberships
    const memberships = await this.listMemberships(
      { status: "active" },
      {
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      }
    )

    // Get total count of active memberships (without pagination)
    const allActiveMemberships = await this.listMemberships({ status: "active" })
    const totalCount = allActiveMemberships.length

    return [memberships, totalCount]
  }

  /**
   * Record order activity for tier calculation
   * Called after each order is placed to track customer activity
   */
  async recordOrderActivity(
    customerId: string,
    orderId: string,
    orderTotal: number
  ): Promise<void> {
    this.logger.info(
      `[MEMBERSHIP] Recording order activity for customer ${customerId}: ` +
      `order=${orderId}, total=${orderTotal}`
    )

    // Create order activity record
    await this.createCustomerActivityOrders({
      customer_id: customerId,
      order_id: orderId,
      order_total: orderTotal,
      order_date: new Date(),
    })

    // Recalculate rolling activity
    await this.recalculateCustomerActivity(customerId)
  }

  /**
   * Recalculate rolling 12-month activity for a customer
   * Returns the updated activity stats
   */
  async recalculateCustomerActivity(customerId: string): Promise<{
    orderCount: number
    totalSpend: number
  }> {
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

    // Get all orders for this customer
    const allOrders = await this.listCustomerActivityOrders(
      { customer_id: customerId },
      { take: 10000 }
    )

    // Filter to last 12 months only
    const recentOrders = allOrders.filter(
      (order: any) => new Date(order.order_date) >= twelveMonthsAgo
    )

    const orderCount = recentOrders.length
    const totalSpend = recentOrders.reduce(
      (sum: number, order: any) => sum + Number(order.order_total),
      0
    )

    this.logger.info(
      `[MEMBERSHIP] Recalculated activity for customer ${customerId}: ` +
      `orders=${orderCount}, spend=${totalSpend}`
    )

    // Update or create activity record
    const activities = await this.listCustomerActivities(
      { customer_id: customerId },
      { take: 1 }
    )

    if (activities[0]) {
      await this.updateCustomerActivities({
        id: activities[0].id,
        rolling_order_count: orderCount,
        rolling_spend_total: totalSpend,
        last_calculated_at: new Date(),
      })
    } else {
      await this.createCustomerActivities({
        customer_id: customerId,
        rolling_order_count: orderCount,
        rolling_spend_total: totalSpend,
        last_calculated_at: new Date(),
      })
    }

    return { orderCount, totalSpend }
  }

  /**
   * Get customer's current activity stats
   */
  async getCustomerActivity(customerId: string): Promise<any> {
    const activities = await this.listCustomerActivities(
      { customer_id: customerId },
      { take: 1 }
    )
    return activities[0] || null
  }

  /**
   * Update membership tier
   * Called when customer qualifies for a different tier
   */
  async updateMemberTier(customerId: string, tierSlug: string): Promise<any> {
    const membership = await this.getMembershipByCustomer(customerId)
    if (!membership) {
      this.logger.warn(`[MEMBERSHIP] Cannot update tier - no membership for customer ${customerId}`)
      return null
    }

    if (membership.tier_slug === tierSlug) {
      // No change needed
      return membership
    }

    this.logger.info(
      `[MEMBERSHIP] Updating tier for customer ${customerId}: ` +
      `${membership.tier_slug} -> ${tierSlug}`
    )

    const updated = await this.updateMemberships({
      id: membership.id,
      tier_slug: tierSlug,
      tier_updated_at: new Date(),
    })

    return updated
  }

  /**
   * Get membership with tier details
   * Returns membership along with current activity stats
   */
  async getMembershipWithActivity(customerId: string): Promise<{
    membership: any
    activity: any
  } | null> {
    const membership = await this.getMembershipByCustomer(customerId)
    if (!membership) {
      return null
    }

    const activity = await this.getCustomerActivity(customerId)

    return {
      membership,
      activity: activity || {
        rolling_order_count: 0,
        rolling_spend_total: 0,
        last_calculated_at: null,
      },
    }
  }

  /**
   * Delete a membership and its associated activity data
   * This is a hard delete - use cancelMembership for soft delete
   */
  async deleteMembership(customerId: string): Promise<{ deleted: boolean }> {
    this.logger.info(`[MEMBERSHIP] Deleting membership for customer ${customerId}`)

    // Get membership
    const membership = await this.getMembershipByCustomer(customerId)
    if (!membership) {
      this.logger.warn(`[MEMBERSHIP] No membership found for customer ${customerId}`)
      return { deleted: false }
    }

    // Delete customer activity orders first (foreign key constraint)
    const activityOrders = await this.listCustomerActivityOrders(
      { customer_id: customerId },
      { take: 10000 }
    )
    for (const order of activityOrders) {
      await this.deleteCustomerActivityOrders(order.id)
    }

    // Delete customer activity record
    const activity = await this.getCustomerActivity(customerId)
    if (activity) {
      await this.deleteCustomerActivities(activity.id)
    }

    // Delete membership
    await this.deleteMemberships(membership.id)

    this.logger.info(`[MEMBERSHIP] Membership deleted for customer ${customerId}`)
    return { deleted: true }
  }
}

export default MembershipModuleService
