import { MedusaService, MedusaError } from "@medusajs/framework/utils"
import PointsBalance from "../models/points-balance"
import PointsTransaction from "../models/points-transaction"
import PointsConfig from "../models/points-config"
import {
  calculateEarnedPoints,
  convertPointsToDiscount,
  calculateMaxRedeemablePoints,
  validatePointsRedemption,
} from "../utils/calculate-points"

type InjectedDependencies = {
  logger: any
}

type EarnPointsInput = {
  customer_id: string
  order_id: string
  order_total: number // in cents
  points_multiplier?: number // Tier-based multiplier (1.0, 1.5, 2.0, 3.0)
}

type RedeemPointsInput = {
  customer_id: string
  points: number
  order_id?: string
  reason?: string
}

type AdminAdjustPointsInput = {
  customer_id: string
  amount: number // Positive to add, negative to remove
  reason: string
  admin_id: string
}

type ReturnPointsInput = {
  customer_id: string
  order_id: string
  return_id: string
  points_to_deduct: number // Points earned from order that should be deducted
  points_to_restore?: number // Points redeemed on order that should be restored
}

type CancelOrderPointsInput = {
  customer_id: string
  order_id: string
  points_to_deduct: number // Points earned from order that should be deducted
  points_to_restore?: number // Points redeemed on order that should be restored
}

/**
 * PointsModuleService
 * Manages customer points: earning, redeeming, balance tracking
 *
 * IMPORTANT: The service class name must NOT match the pattern {ModelName}Service
 * because it would conflict with the internal service that Medusa auto-generates
 * for each model. Use a different name like PointsModuleService instead.
 */
class PointsModuleService extends MedusaService({
  PointsBalance,
  PointsTransaction,
  PointsConfig,
}) {
  protected logger: any


  constructor({ logger }: InjectedDependencies) {
    super(...arguments)
    this.logger = logger
  }

  /**
   * Initialize points balance for a new member
   */
  async initializeBalance(customerId: string): Promise<any> {
    this.logger.info(`Initializing points balance for customer ${customerId}`)

    const existingBalance = await this.getBalance(customerId)
    if (existingBalance) {
      this.logger.warn(`Points balance already exists for customer ${customerId}`)
      return existingBalance
    }

    const balance = await this.createPointsBalances({
      customer_id: customerId,
      balance: 0,
      total_earned: 0,
      total_redeemed: 0,
    })

    this.logger.info(`Points balance initialized for customer ${customerId}`)
    return balance
  }

  /**
   * Get customer's points balance
   */
  async getBalance(customerId: string): Promise<any> {
    const balances = await this.listPointsBalances(
      { customer_id: customerId },
      { take: 1 }
    )

    return balances[0] || null
  }

  /**
   * Get points balances for multiple customers (batch operation)
   * Returns a Map for O(1) lookup by customer_id
   */
  async getBalances(customerIds: string[]): Promise<Map<string, any>> {
    if (!customerIds.length) {
      return new Map()
    }

    const balances = await this.listPointsBalances(
      { customer_id: customerIds },
      { take: customerIds.length }
    )

    const balanceMap = new Map<string, any>()
    for (const balance of balances) {
      balanceMap.set(balance.customer_id, balance)
    }

    return balanceMap
  }

  /**
   * Get current points configuration
   */
  async getConfig(): Promise<any> {
    const configs = await this.listPointsConfigs({}, { take: 1 })

    if (!configs || configs.length === 0) {
      // Create default config if doesn't exist
      return await this.createPointsConfigs({
        earning_type: "percentage",
        earning_rate: 5,
        redemption_rate: 0.01,
        is_enabled: true,
      })
    }

    return configs[0]
  }

  /**
   * Update points configuration
   */
  async updateConfig(data: {
    earning_type?: "percentage" | "per_currency"
    earning_rate?: number
    redemption_rate?: number
    is_enabled?: boolean
  }): Promise<any> {
    const config: any = await this.getConfig()

    const updated = await this.updatePointsConfigs({
      id: config.id,
      ...data,
    })

    this.logger.info(`Points configuration updated`)
    return updated
  }

  /**
   * Award points to customer after purchase
   * Supports tier-based multiplier for enhanced points earning
   */
  async earnPoints(data: EarnPointsInput): Promise<{
    points_earned: number
    new_balance: number
    base_points: number
    multiplier: number
  }> {
    const config: any = await this.getConfig()

    if (!config.is_enabled) {
      this.logger.info(`Points system is disabled, skipping point award`)
      return { points_earned: 0, new_balance: 0, base_points: 0, multiplier: 1 }
    }

    // Calculate base points earned (before multiplier)
    const basePoints = calculateEarnedPoints(data.order_total, {
      earning_type: config.earning_type,
      earning_rate: config.earning_rate,
    })

    // Apply tier-based multiplier (default: 1x)
    const multiplier = data.points_multiplier || 1
    const pointsEarned = Math.floor(basePoints * multiplier)

    if (pointsEarned === 0) {
      this.logger.info(`No points earned for order ${data.order_id}`)
      return { points_earned: 0, new_balance: 0, base_points: 0, multiplier }
    }

    // Get or create balance
    let balance: any = await this.getBalance(data.customer_id)
    if (!balance) {
      balance = await this.initializeBalance(data.customer_id)
    }

    // Update balance
    const newBalance = Number(balance.balance) + pointsEarned
    const newTotalEarned = Number(balance.total_earned) + pointsEarned

    await this.updatePointsBalances({
      id: balance.id,
      balance: newBalance,
      total_earned: newTotalEarned,
    })

    // Create transaction record with multiplier info
    const reason = multiplier > 1
      ? `Earned from order ${data.order_id} (${multiplier}x tier bonus)`
      : `Earned from order ${data.order_id}`

    await this.createPointsTransactions({
      customer_id: data.customer_id,
      type: "earned",
      amount: pointsEarned,
      order_id: data.order_id,
      reason,
      balance_after: newBalance,
    })

    this.logger.info(
      `Customer ${data.customer_id} earned ${pointsEarned} points ` +
      `(base: ${basePoints}, multiplier: ${multiplier}x) from order ${data.order_id}`
    )

    return {
      points_earned: pointsEarned,
      new_balance: newBalance,
      base_points: basePoints,
      multiplier,
    }
  }

  /**
   * Redeem points for discount
   */
  async redeemPoints(data: RedeemPointsInput): Promise<{
    points_redeemed: number
    discount_amount: number
    new_balance: number
  }> {
    const config: any = await this.getConfig()

    if (!config.is_enabled) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Points system is currently disabled"
      )
    }

    const balance: any = await this.getBalance(data.customer_id)
    if (!balance) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Customer has no points balance"
      )
    }

    // Validate redemption
    const validation = validatePointsRedemption(
      data.points,
      Number(balance.balance),
      data.points * config.redemption_rate * 100, // Rough estimate for validation
      config.redemption_rate
    )

    if (!validation.valid) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        validation.error || "Invalid points redemption"
      )
    }

    // Calculate discount
    const discountAmount = convertPointsToDiscount(data.points, config.redemption_rate)

    // Update balance
    const newBalance = Number(balance.balance) - data.points
    const newTotalRedeemed = Number(balance.total_redeemed) + data.points

    await this.updatePointsBalances({
      id: balance.id,
      balance: newBalance,
      total_redeemed: newTotalRedeemed,
    })

    // Create transaction record
    await this.createPointsTransactions({
      customer_id: data.customer_id,
      type: "redeemed",
      amount: -data.points, // Negative for redemption
      order_id: data.order_id || null,
      reason: data.reason || `Redeemed for discount`,
      balance_after: newBalance,
    })

    this.logger.info(
      `Customer ${data.customer_id} redeemed ${data.points} points for $${(discountAmount / 100).toFixed(2)} discount`
    )

    return {
      points_redeemed: data.points,
      discount_amount: discountAmount,
      new_balance: newBalance,
    }
  }

  /**
   * Admin manually adjust points
   */
  async adminAdjustPoints(data: AdminAdjustPointsInput): Promise<{
    amount: number
    new_balance: number
  }> {
    let balance: any = await this.getBalance(data.customer_id)
    if (!balance) {
      balance = await this.initializeBalance(data.customer_id)
    }

    const newBalance = Number(balance.balance) + data.amount

    if (newBalance < 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Cannot adjust points below zero"
      )
    }

    // Update balance
    await this.updatePointsBalances({
      id: balance.id,
      balance: newBalance,
    })

    // Create transaction record
    await this.createPointsTransactions({
      customer_id: data.customer_id,
      type: data.amount > 0 ? "admin_added" : "admin_removed",
      amount: data.amount,
      order_id: null,
      reason: data.reason,
      balance_after: newBalance,
      created_by: data.admin_id,
    })

    this.logger.info(
      `Admin ${data.admin_id} adjusted points for customer ${data.customer_id} by ${data.amount}`
    )

    return {
      amount: data.amount,
      new_balance: newBalance,
    }
  }

  /**
   * Handle points adjustment for product returns
   * - Deducts points that were earned from the original order
   * - Restores points that were redeemed as discount on the order
   */
  async handleReturnPoints(data: ReturnPointsInput): Promise<{
    points_deducted: number
    points_restored: number
    new_balance: number
  }> {
    this.logger.info(
      `[POINTS] Processing return points for order ${data.order_id}, return ${data.return_id}`
    )

    let balance: any = await this.getBalance(data.customer_id)
    if (!balance) {
      balance = await this.initializeBalance(data.customer_id)
    }

    let currentBalance = Number(balance.balance)
    let pointsDeducted = 0
    let pointsRestored = 0

    // 1. Deduct points that were earned from the order
    if (data.points_to_deduct > 0) {
      // Don't deduct more than the customer has
      const actualDeduction = Math.min(data.points_to_deduct, currentBalance)

      if (actualDeduction > 0) {
        currentBalance -= actualDeduction
        pointsDeducted = actualDeduction

        // Create deduction transaction
        await this.createPointsTransactions({
          customer_id: data.customer_id,
          type: "return_deducted",
          amount: -actualDeduction,
          order_id: data.order_id,
          reason: `Points deducted for return ${data.return_id} (order ${data.order_id})`,
          balance_after: currentBalance,
        })

        this.logger.info(
          `[POINTS] Deducted ${actualDeduction} points from customer ${data.customer_id} for return`
        )
      }
    }

    // 2. Restore points that were redeemed on the order
    if (data.points_to_restore && data.points_to_restore > 0) {
      currentBalance += data.points_to_restore
      pointsRestored = data.points_to_restore

      // Create restoration transaction
      await this.createPointsTransactions({
        customer_id: data.customer_id,
        type: "return_restored",
        amount: data.points_to_restore,
        order_id: data.order_id,
        reason: `Points restored for return ${data.return_id} (order ${data.order_id})`,
        balance_after: currentBalance,
      })

      this.logger.info(
        `[POINTS] Restored ${data.points_to_restore} points to customer ${data.customer_id} for return`
      )
    }

    // Update the balance
    await this.updatePointsBalances({
      id: balance.id,
      balance: currentBalance,
      total_redeemed: Number(balance.total_redeemed) - pointsRestored, // Reduce total_redeemed since points were restored
    })

    return {
      points_deducted: pointsDeducted,
      points_restored: pointsRestored,
      new_balance: currentBalance,
    }
  }

  /**
   * Handle points adjustment for order cancellation
   * - Deducts points that were earned from the cancelled order
   * - Restores points that were redeemed as discount on the order
   */
  async handleCancelOrderPoints(data: CancelOrderPointsInput): Promise<{
    points_deducted: number
    points_restored: number
    new_balance: number
  }> {
    this.logger.info(
      `[POINTS] Processing cancel order points for order ${data.order_id}`
    )

    let balance: any = await this.getBalance(data.customer_id)
    if (!balance) {
      balance = await this.initializeBalance(data.customer_id)
    }

    let currentBalance = Number(balance.balance)
    let pointsDeducted = 0
    let pointsRestored = 0

    // 1. Deduct points that were earned from the order
    if (data.points_to_deduct > 0) {
      // Don't deduct more than the customer has
      const actualDeduction = Math.min(data.points_to_deduct, currentBalance)

      if (actualDeduction > 0) {
        currentBalance -= actualDeduction
        pointsDeducted = actualDeduction

        // Create deduction transaction
        await this.createPointsTransactions({
          customer_id: data.customer_id,
          type: "cancel_deducted",
          amount: -actualDeduction,
          order_id: data.order_id,
          reason: `Points deducted for cancelled order ${data.order_id}`,
          balance_after: currentBalance,
        })

        this.logger.info(
          `[POINTS] Deducted ${actualDeduction} points from customer ${data.customer_id} for order cancellation`
        )
      }
    }

    // 2. Restore points that were redeemed on the order
    if (data.points_to_restore && data.points_to_restore > 0) {
      currentBalance += data.points_to_restore
      pointsRestored = data.points_to_restore

      // Create restoration transaction
      await this.createPointsTransactions({
        customer_id: data.customer_id,
        type: "cancel_restored",
        amount: data.points_to_restore,
        order_id: data.order_id,
        reason: `Points restored for cancelled order ${data.order_id}`,
        balance_after: currentBalance,
      })

      this.logger.info(
        `[POINTS] Restored ${data.points_to_restore} points to customer ${data.customer_id} for order cancellation`
      )
    }

    // Update the balance
    await this.updatePointsBalances({
      id: balance.id,
      balance: currentBalance,
      total_redeemed: Number(balance.total_redeemed) - pointsRestored, // Reduce total_redeemed since points were restored
    })

    return {
      points_deducted: pointsDeducted,
      points_restored: pointsRestored,
      new_balance: currentBalance,
    }
  }

  /**
   * Get points earned from a specific order
   * Used to calculate how many points to deduct on return
   */
  async getPointsEarnedFromOrder(
    customerId: string,
    orderId: string
  ): Promise<number> {
    const transactions = await this.listPointsTransactions(
      {
        customer_id: customerId,
        order_id: orderId,
        type: "earned",
      },
      { take: 10 }
    )

    return transactions.reduce((sum: number, t: any) => sum + Number(t.amount), 0)
  }

  /**
   * Get points redeemed on a specific order
   * Used to calculate how many points to restore on return
   */
  async getPointsRedeemedOnOrder(
    customerId: string,
    orderId: string
  ): Promise<number> {
    const transactions = await this.listPointsTransactions(
      {
        customer_id: customerId,
        order_id: orderId,
        type: "redeemed",
      },
      { take: 10 }
    )

    // Redeemed amounts are stored as negative, so we use Math.abs
    return transactions.reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount)), 0)
  }

  /**
   * Get transaction history for a customer
   */
  async getTransactionHistory(
    customerId: string,
    filters?: { limit?: number; offset?: number }
  ): Promise<[any[], number]> {
    const transactions = await this.listPointsTransactions(
      { customer_id: customerId },
      {
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
        order: { created_at: "DESC" },
      }
    )
    return [transactions, transactions.length]
  }

  /**
   * Calculate points that would be earned from an order
   */
  async calculatePotentialEarnings(orderTotal: number): Promise<number> {
    const config: any = await this.getConfig()

    if (!config.is_enabled) {
      return 0
    }

    return calculateEarnedPoints(orderTotal, {
      earning_type: config.earning_type,
      earning_rate: config.earning_rate,
    })
  }

  /**
   * Calculate discount for points redemption
   */
  async calculateRedemptionDiscount(points: number): Promise<number> {
    const config: any = await this.getConfig()
    // Use default redemption rate (0.01 = 100 points = $1) if config rate is 0 or undefined
    const redemptionRate = config.redemption_rate || 0.01
    return convertPointsToDiscount(points, redemptionRate)
  }

  /**
   * Get maximum points that can be redeemed for an order
   */
  async getMaxRedeemablePoints(
    customerId: string,
    orderTotal: number
  ): Promise<number> {
    const balance: any = await this.getBalance(customerId)
    if (!balance) {
      return 0
    }

    const config: any = await this.getConfig()
    // Use default redemption rate (0.01 = 100 points = $1) if config rate is 0 or undefined
    const redemptionRate = config.redemption_rate || 0.01

    return calculateMaxRedeemablePoints(
      orderTotal,
      Number(balance.balance),
      redemptionRate
    )
  }

  /**
   * Get total points statistics
   */
  async getStats(): Promise<{
    total_points_issued: number
    total_points_redeemed: number
    total_points_outstanding: number
  }> {
    const balances = await this.listPointsBalances({}, { take: 10000 })

    const total_points_issued = balances.reduce(
      (sum: number, b: any) => sum + Number(b.total_earned),
      0
    )
    const total_points_redeemed = balances.reduce(
      (sum: number, b: any) => sum + Number(b.total_redeemed),
      0
    )
    const total_points_outstanding = balances.reduce(
      (sum: number, b: any) => sum + Number(b.balance),
      0
    )

    return {
      total_points_issued,
      total_points_redeemed,
      total_points_outstanding,
    }
  }

  /**
   * Simple adjust points method for admin-created membership bonus
   */
  async adjustPoints(customerId: string, amount: number, reason: string): Promise<void> {
    let balance: any = await this.getBalance(customerId)
    if (!balance) {
      balance = await this.initializeBalance(customerId)
    }

    const newBalance = Number(balance.balance) + amount

    await this.updatePointsBalances({
      id: balance.id,
      balance: newBalance,
      total_earned: Number(balance.total_earned) + (amount > 0 ? amount : 0),
    })

    await this.createPointsTransactions({
      customer_id: customerId,
      type: amount > 0 ? "admin_added" : "admin_removed",
      amount: amount,
      order_id: null,
      reason: reason,
      balance_after: newBalance,
    })

    this.logger.info(`Adjusted ${amount} points for customer ${customerId}: ${reason}`)
  }

  /**
   * Delete points balance and all transactions for a customer
   * Used when deleting a membership
   */
  async deleteBalance(customerId: string): Promise<{ deleted: boolean }> {
    this.logger.info(`[POINTS] Deleting points data for customer ${customerId}`)

    // Get balance
    const balance = await this.getBalance(customerId)
    if (!balance) {
      this.logger.warn(`[POINTS] No points balance found for customer ${customerId}`)
      return { deleted: false }
    }

    // Delete all transactions first (foreign key constraint)
    const transactions = await this.listPointsTransactions(
      { customer_id: customerId },
      { take: 10000 }
    )
    for (const transaction of transactions) {
      await this.deletePointsTransactions(transaction.id)
    }

    // Delete balance
    await this.deletePointsBalances(balance.id)

    this.logger.info(`[POINTS] Points data deleted for customer ${customerId}`)
    return { deleted: true }
  }
}

export default PointsModuleService
