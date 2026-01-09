import { MedusaService } from "@medusajs/framework/utils"
import type { InferTypeOf } from "@medusajs/framework/types"
import { Coupon, PWPRule } from "../models"

type CouponData = {
  code: string
  name: string
  type?: "percentage" | "fixed"
  value?: number
  currency_code?: string
  status?: "active" | "non-active"
  starts_at?: Date | null
  ends_at?: Date | null
  usage_limit?: number | null
  metadata?: Record<string, unknown> | null
}

type PWPRuleData = {
  name: string
  rule_description: string
  trigger_type?: "product" | "cart_value"
  trigger_product_id?: string | null
  trigger_cart_value?: number | null
  reward_product_id?: string | null
  reward_type?: "percentage" | "fixed"
  reward_value?: number
  status?: "active" | "non-active"
  starts_at?: Date | null
  ends_at?: Date | null
  usage_limit?: number | null
  metadata?: Record<string, unknown> | null
}

type CouponType = InferTypeOf<typeof Coupon>
type PWPRuleType = InferTypeOf<typeof PWPRule>

class PromoModuleService extends MedusaService({
  Coupon,
  PWPRule,
}) {
  /**
   * Get promo statistics
   */
  async getStats(): Promise<{
    totalPromo: number
    activePromo: number
    redemptionCoupons: number
  }> {
    const [coupons, pwpRules] = await Promise.all([
      this.listCoupons({}, {}),
      this.listPWPRules({}, {}),
    ])

    const now = new Date()

    // Helper to check if a promo is truly active (status=active AND not expired)
    const isActivePromo = (status: string, endsAt: Date | null): boolean => {
      if (status !== "active") return false
      if (endsAt && new Date(endsAt) < now) return false
      return true
    }

    const totalPromo = coupons.length + pwpRules.length
    const activeCoupons = coupons.filter((c) => isActivePromo(c.status, c.ends_at)).length
    const activePWP = pwpRules.filter((r) => isActivePromo(r.status, r.ends_at)).length
    const activePromo = activeCoupons + activePWP

    const redemptionCoupons = coupons.reduce(
      (sum, c) => sum + (c.usage_count || 0),
      0
    )

    return {
      totalPromo,
      activePromo,
      redemptionCoupons,
    }
  }

  /**
   * Create a new coupon
   * Note: timestamps are auto-managed by MikroORM
   */
  async createCoupon(data: CouponData): Promise<CouponType> {
    const coupon = await this.createCoupons(data)
    return coupon
  }

  /**
   * Update a coupon
   */
  async updateCoupon(
    id: string,
    data: Partial<CouponData>
  ): Promise<CouponType> {
    const coupon = await this.updateCoupons({
      id,
      ...data,
    })
    return coupon
  }

  /**
   * Soft delete a coupon
   */
  async deleteCoupon(id: string): Promise<void> {
    await this.softDeleteCoupons([id])
  }

  /**
   * Increment coupon usage count
   */
  async incrementCouponUsage(id: string): Promise<void> {
    const coupon = await this.retrieveCoupon(id)
    await this.updateCoupons({
      id,
      usage_count: (coupon.usage_count || 0) + 1,
    })
  }

  /**
   * Create a new PWP rule
   * Note: timestamps are auto-managed by MikroORM
   */
  async createPWPRule(data: PWPRuleData): Promise<PWPRuleType> {
    const rule = await this.createPWPRules(data)
    return rule
  }

  /**
   * Update a PWP rule
   */
  async updatePWPRule(
    id: string,
    data: Partial<PWPRuleData>
  ): Promise<PWPRuleType> {
    const rule = await this.updatePWPRules({
      id,
      ...data,
    })
    return rule
  }

  /**
   * Soft delete a PWP rule
   */
  async deletePWPRule(id: string): Promise<void> {
    await this.softDeletePWPRules([id])
  }

  /**
   * Increment PWP rule redemption count
   */
  async incrementPWPRedemption(id: string): Promise<void> {
    const rule = await this.retrievePWPRule(id)
    await this.updatePWPRules({
      id,
      redemption_count: (rule.redemption_count || 0) + 1,
    })
  }
}

export default PromoModuleService
