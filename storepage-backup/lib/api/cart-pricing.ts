/**
 * Cart Pricing Helper
 *
 * Provides frontend-side cart pricing calculations using data from
 * the /store/carts/:id/with-pricing endpoint.
 *
 * This enables:
 * - Instant price updates when quantity changes (no API call)
 * - PWP eligibility checking locally
 * - Accurate total calculations
 */

import { getStoredAuthToken } from './customer'

const API_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY || ''

// ============================================================================
// Types
// ============================================================================

export type BulkTier = {
  min_quantity: number
  max_quantity: number | null
  amount: number
  savings_percent: number
}

export type BulkPricingInfo = {
  base_price: number
  tiers: BulkTier[]
}

export type BulkPricingMap = Record<string, BulkPricingInfo>

export type PWPOffer = {
  id: string
  name: string
  description: string | null
  trigger_type: 'cart_value' | 'product'
  trigger_cart_value: number | null
  trigger_product_id: string | null
  reward_product_id: string
  reward_type: 'percentage' | 'fixed'
  reward_value: number
  is_eligible: boolean
  current_cart_value: number
  amount_needed: number | null
}

export type CartItemPricing = {
  base_price: number
  bulk_tiers: BulkTier[]
  current_tier: BulkTier | null
  correct_price: number
  price_needs_update: boolean
  is_bulk_price: boolean
}

export type EnhancedCartItem = {
  id: string
  variant_id: string
  quantity: number
  unit_price: number
  title: string
  thumbnail?: string | null
  metadata?: Record<string, unknown>
  inventory_quantity?: number
  _pricing: CartItemPricing
}

/** Inventory map: variant_id -> available quantity */
export type InventoryMap = Record<string, number>

export type CartWithPricingResponse = {
  cart: {
    id: string
    currency_code: string
    items: EnhancedCartItem[]
    metadata?: Record<string, unknown>
  }
  pricing: {
    bulk_pricing_map: BulkPricingMap
    pwp_offers: PWPOffer[]
  }
  /** Inventory map: variant_id -> available quantity */
  inventory: InventoryMap
  totals: {
    subtotal: number
    pwp_discount: number
    adjustment_discount: number
    points_discount: number
    total_discount: number
    total: number
  }
  needs_price_sync: boolean
}

export type AppliedTierDiscount = {
  slug: string
  name: string
  discount_percentage: number
  discount_amount: number
}

export type SyncPricesResponse = {
  success: boolean
  cart: {
    id: string
    items: EnhancedCartItem[]
    metadata?: Record<string, unknown>
  }
  changes: Array<{
    item_id: string
    type: string
    message: string
  }>
  totals: {
    subtotal: number
    pwp_discount: number
    adjustment_discount: number
    points_discount: number
    tier_discount: number
    total_discount: number
    total: number
  }
  tier_info: AppliedTierDiscount | null
  summary: {
    items_removed: number
    items_updated: number
    has_changes: boolean
  }
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch cart with all pricing information
 * Call this when loading the cart page or bag
 */
export async function fetchCartWithPricing(cartId: string): Promise<CartWithPricingResponse> {
  const response = await fetch(`${API_URL}/store/carts/${cartId}/with-pricing`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-publishable-api-key': PUBLISHABLE_API_KEY,
    },
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch cart with pricing: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Sync cart prices with server
 * Call this before checkout or when user clicks "Refresh prices"
 * Includes auth token to enable tier discount calculation for authenticated members
 */
export async function syncCartPrices(cartId: string): Promise<SyncPricesResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-publishable-api-key': PUBLISHABLE_API_KEY,
  }

  // Include auth token for tier discount calculation
  const token = getStoredAuthToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}/store/carts/${cartId}/sync-prices`, {
    method: 'POST',
    headers,
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`Failed to sync cart prices: ${response.statusText}`)
  }

  return response.json()
}

// ============================================================================
// Local Calculation Functions
// ============================================================================

/**
 * Get the correct price for a variant at a given quantity
 * Use this for instant UI updates without API calls
 */
export function getPriceForQuantity(
  variantId: string,
  quantity: number,
  pricingMap: BulkPricingMap
): { price: number; isBulkPrice: boolean; tier: BulkTier | null } {
  const pricing = pricingMap[variantId]

  if (!pricing) {
    return { price: 0, isBulkPrice: false, tier: null }
  }

  // Find applicable tier (highest tier where qty >= min_quantity)
  // Sort descending by min_quantity and find first match
  const sortedTiers = [...pricing.tiers].sort((a, b) => b.min_quantity - a.min_quantity)

  for (const tier of sortedTiers) {
    if (quantity >= tier.min_quantity) {
      const maxOk = tier.max_quantity === null || quantity <= tier.max_quantity
      if (maxOk) {
        return { price: tier.amount, isBulkPrice: true, tier }
      }
    }
  }

  // No tier applies, use base price
  return { price: pricing.base_price, isBulkPrice: false, tier: null }
}

/**
 * Calculate what the next tier savings would be
 * Useful for showing "Add X more for Y% off"
 */
export function getNextTierInfo(
  variantId: string,
  currentQuantity: number,
  pricingMap: BulkPricingMap
): { nextTier: BulkTier; quantityNeeded: number } | null {
  const pricing = pricingMap[variantId]

  if (!pricing || pricing.tiers.length === 0) {
    return null
  }

  // Find the next tier that requires more quantity
  const sortedTiers = [...pricing.tiers].sort((a, b) => a.min_quantity - b.min_quantity)

  for (const tier of sortedTiers) {
    if (tier.min_quantity > currentQuantity) {
      return {
        nextTier: tier,
        quantityNeeded: tier.min_quantity - currentQuantity,
      }
    }
  }

  return null // Already at highest tier
}

/**
 * Check if a PWP offer is eligible based on current cart value
 */
export function checkPWPEligibility(
  offer: PWPOffer,
  cartValueExcludingPWP: number,
  cartProductIds: string[]
): { isEligible: boolean; amountNeeded: number | null } {
  if (offer.trigger_type === 'cart_value') {
    const minValue = offer.trigger_cart_value || 0
    const isEligible = cartValueExcludingPWP >= minValue
    return {
      isEligible,
      amountNeeded: isEligible ? null : minValue - cartValueExcludingPWP,
    }
  }

  if (offer.trigger_type === 'product') {
    const isEligible = offer.trigger_product_id
      ? cartProductIds.includes(offer.trigger_product_id)
      : false
    return { isEligible, amountNeeded: null }
  }

  return { isEligible: false, amountNeeded: null }
}

/**
 * Calculate cart totals locally using pricing map
 * Use this for instant total updates when quantity changes
 */
export function calculateCartTotalsWithPricing(
  items: Array<{
    id: string
    variant_id: string
    quantity: number
    unit_price: number
    metadata?: Record<string, unknown>
  }>,
  pricingMap: BulkPricingMap
): {
  subtotal: number
  pwpDiscount: number
  itemCount: number
  items: Array<{
    id: string
    correctPrice: number
    isBulkPrice: boolean
    lineTotal: number
  }>
} {
  let subtotal = 0
  let pwpDiscount = 0
  let itemCount = 0
  const itemDetails: Array<{
    id: string
    correctPrice: number
    isBulkPrice: boolean
    lineTotal: number
  }> = []

  for (const item of items) {
    // PWP items have fixed pricing
    if (item.metadata?.is_pwp_item) {
      const discount = Number(item.metadata.pwp_discount_amount) || 0
      const lineTotal = (item.unit_price - discount) * item.quantity
      subtotal += item.unit_price * item.quantity
      pwpDiscount += discount * item.quantity
      itemCount += item.quantity
      itemDetails.push({
        id: item.id,
        correctPrice: item.unit_price - discount,
        isBulkPrice: false,
        lineTotal,
      })
      continue
    }

    // Regular items - calculate correct price
    const { price: correctPrice, isBulkPrice } = getPriceForQuantity(
      item.variant_id,
      item.quantity,
      pricingMap
    )

    // Check for variant discount from metadata (Set Discount Global from admin)
    // Priority: Bulk price > Variant discount > Unit price
    let effectivePrice: number
    let isVariantDiscount = false

    if (correctPrice > 0 && isBulkPrice) {
      // Bulk pricing takes priority
      effectivePrice = correctPrice
    } else if (item.metadata?.is_variant_discount && item.metadata?.variant_discount_amount) {
      // Variant discount from metadata
      const discountAmount = Number(item.metadata.variant_discount_amount) || 0
      const originalPrice = Number(item.metadata.original_unit_price) || item.unit_price
      effectivePrice = Math.max(0, originalPrice - discountAmount)
      isVariantDiscount = true
    } else if (correctPrice > 0) {
      // Use pricing map price (base price)
      effectivePrice = correctPrice
    } else {
      // Fallback to unit_price
      effectivePrice = item.unit_price
    }

    const lineTotal = effectivePrice * item.quantity

    subtotal += lineTotal
    itemCount += item.quantity
    itemDetails.push({
      id: item.id,
      correctPrice: effectivePrice,
      isBulkPrice: isBulkPrice || isVariantDiscount,
      lineTotal,
    })
  }

  return {
    subtotal,
    pwpDiscount,
    itemCount,
    items: itemDetails,
  }
}

/**
 * Check if any cart items need price updates
 */
export function cartNeedsPriceSync(
  items: Array<{
    variant_id: string
    quantity: number
    unit_price: number
    metadata?: Record<string, unknown>
  }>,
  pricingMap: BulkPricingMap
): boolean {
  for (const item of items) {
    // Skip PWP items
    if (item.metadata?.is_pwp_item) continue

    const { price: correctPrice } = getPriceForQuantity(
      item.variant_id,
      item.quantity,
      pricingMap
    )

    if (correctPrice > 0 && correctPrice !== item.unit_price) {
      return true
    }
  }

  return false
}

// ============================================================================
// Formatting Helpers
// ============================================================================

/**
 * Format price from cents to display string
 */
export function formatPrice(amountInCents: number, currencyCode: string = 'SGD'): string {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: currencyCode,
  }).format(amountInCents / 100)
}

/**
 * Format savings percentage
 */
export function formatSavings(savingsPercent: number): string {
  return `${savingsPercent}% off`
}

/**
 * Get bulk pricing message for display
 */
export function getBulkPricingMessage(
  variantId: string,
  currentQuantity: number,
  pricingMap: BulkPricingMap
): string | null {
  const nextTier = getNextTierInfo(variantId, currentQuantity, pricingMap)

  if (nextTier) {
    return `Add ${nextTier.quantityNeeded} more for ${nextTier.nextTier.savings_percent}% off`
  }

  // Check if currently on a bulk tier
  const { isBulkPrice, tier } = getPriceForQuantity(variantId, currentQuantity, pricingMap)

  if (isBulkPrice && tier) {
    return `Bulk discount: ${tier.savings_percent}% off`
  }

  return null
}

// ============================================================================
// Tier Discount Helper
// ============================================================================

/**
 * Extract tier discount from cart metadata
 * Returns null if no tier discount is applied
 */
export function getAppliedTierDiscountFromCart(
  cart: { metadata?: Record<string, unknown> } | null
): AppliedTierDiscount | null {
  if (!cart?.metadata) return null

  const tierSlug = cart.metadata.tier_slug as string | undefined
  const tierDiscountAmount = cart.metadata.tier_discount_amount as number | undefined

  if (!tierSlug || !tierDiscountAmount || tierDiscountAmount <= 0) {
    return null
  }

  return {
    slug: tierSlug,
    name: (cart.metadata.tier_name as string) || tierSlug,
    discount_percentage: (cart.metadata.tier_discount_percentage as number) || 0,
    discount_amount: tierDiscountAmount,
  }
}
