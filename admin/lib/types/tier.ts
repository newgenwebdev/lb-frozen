/**
 * Tier Configuration Types
 * Types for the membership tier system
 */

/**
 * Tier configuration as returned from the API
 */
export type TierConfig = {
  id: string
  name: string
  slug: string
  rank: number
  order_threshold: number
  spend_threshold: number // in cents
  points_multiplier: number
  discount_percentage: number
  birthday_voucher_amount: number // in cents
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * API response for listing tiers
 */
export type TierListResponse = {
  tiers: TierConfig[]
  count: number
}

/**
 * API response for single tier
 */
export type TierResponse = {
  tier: TierConfig
}

/**
 * Input for creating a new tier
 */
export type CreateTierInput = {
  name: string
  slug: string
  rank: number
  order_threshold?: number
  spend_threshold?: number // in cents
  points_multiplier?: number
  discount_percentage?: number
  birthday_voucher_amount?: number // in cents
  is_default?: boolean
}

/**
 * Input for updating a tier
 */
export type UpdateTierInput = {
  name?: string
  slug?: string
  rank?: number
  order_threshold?: number
  spend_threshold?: number // in cents
  points_multiplier?: number
  discount_percentage?: number
  birthday_voucher_amount?: number // in cents
  is_default?: boolean
  is_active?: boolean
}

/**
 * Tier for display in UI (with formatted values)
 */
export type TierDisplay = {
  id: string
  name: string
  slug: string
  rank: number
  orderThreshold: number
  spendThresholdFormatted: string // e.g., "$500.00"
  spendThresholdCents: number
  pointsMultiplier: string // e.g., "1.5x"
  discountPercentage: string // e.g., "5%"
  birthdayVoucherFormatted: string // e.g., "$5.00"
  birthdayVoucherCents: number
  isDefault: boolean
  isActive: boolean
}
