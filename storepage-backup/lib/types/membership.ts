/**
 * Membership Types for Customer Frontend
 * These types match the dynamic membership system configured by admins
 */

/**
 * Tier configuration from the server
 */
export type Tier = {
  slug: string
  name: string
  rank: number
  order_threshold: number
  spend_threshold: number
  points_multiplier: number
  discount_percentage: number
  birthday_voucher_amount: number
  is_default?: boolean
}

/**
 * Next tier with progress information
 */
export type NextTier = Tier & {
  orders_needed: number
  spend_needed: number
}

/**
 * Points balance information
 */
export type PointsBalance = {
  balance: number
  total_earned: number
  total_redeemed: number
}

/**
 * Customer activity stats (rolling period based on config)
 */
export type CustomerActivity = {
  rolling_order_count: number
  rolling_spend_total: number
  last_calculated_at: string | null
}

/**
 * Membership record
 */
export type Membership = {
  id: string
  status: 'active' | 'cancelled'
  tier_slug: string
  activated_at: string
  tier_updated_at: string | null
}

/**
 * Current tier details (simplified for display)
 */
export type CurrentTier = {
  slug: string
  name: string
  rank: number
  points_multiplier: number
  discount_percentage: number
  birthday_voucher_amount: number
}

/**
 * Full membership status response from /store/membership/status
 */
export type MembershipStatusResponse = {
  is_member: boolean
  membership: Membership | null
  tier: CurrentTier | null
  activity: CustomerActivity | null
  next_tier: NextTier | null
  points: PointsBalance | null
  all_tiers: Tier[]
}

/**
 * Public tiers response from /store/tiers
 */
export type TiersResponse = {
  tiers: Tier[]
}

/**
 * Membership program configuration (set by admin)
 */
export type MembershipConfig = {
  program_type: 'free' | 'paid'
  price: number                      // Price in cents (0 for free programs)
  currency: string                   // Currency code (e.g., "myr", "usd")
  duration_months: number | null     // null = lifetime membership
  auto_enroll_on_first_order: boolean
  evaluation_period_months: number   // Rolling period for tier evaluation
  is_enabled: boolean
}

/**
 * Default tier info
 */
export type DefaultTier = {
  slug: string
  name: string
}

/**
 * Membership program info response from /store/membership (public)
 * Contains dynamic configuration set by admin
 */
export type MembershipInfoResponse = {
  // Program configuration (dynamic from admin)
  config: MembershipConfig
  // Tier information
  tiers: {
    default_tier: DefaultTier | null
    all_tiers: Tier[]
  }
  // Dynamic benefits list
  benefits: string[]
  // User's current membership status (if authenticated)
  user_status: {
    is_member: boolean
    activated_at: string
    tier_slug: string
  } | null
}

/**
 * Membership purchase request
 */
export type MembershipPurchaseRequest = {
  payment_method_id: string
}

/**
 * Membership purchase response
 */
export type MembershipPurchaseResponse = {
  membership: {
    id: string
    status: string
    tier: string
    activated_at: string
  }
  payment: {
    id: string
    amount: number
    currency: string
    status: string
  }
}
