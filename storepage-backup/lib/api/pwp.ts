import type { MedusaCart } from './cart'

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY

// ============================================================================
// Types
// ============================================================================

export type PWPVariant = {
  id: string
  title: string
  sku: string | null
  prices: Array<{
    amount: number
    currency_code: string
  }>
  inventory_quantity?: number
}

export type PWPRewardProduct = {
  id: string
  title: string
  thumbnail: string | null
  variants: PWPVariant[]
}

export type PWPOffer = {
  rule_id: string
  name: string
  description: string
  trigger_type: 'product' | 'cart_value'
  trigger_cart_value: number | null
  trigger_product_id: string | null
  trigger_met: boolean
  reward_product_id: string | null
  reward_product: PWPRewardProduct | null
  reward_type: 'percentage' | 'fixed'
  reward_value: number
  original_price: number | null
  discounted_price: number | null
  already_applied: boolean
  is_out_of_stock?: boolean
  total_inventory?: number
}

export type CheckPWPResponse = {
  success: boolean
  cart_value: number
  currency_code: string
  eligible_offers: PWPOffer[]
  all_offers: PWPOffer[]
}

export type ApplyPWPResponse = {
  success: boolean
  message: string
  pwp_item: {
    line_item_id: string
    variant_id: string
    original_price: number
    discounted_price: number
    discount_amount: number
    rule_name: string
  }
  cart: MedusaCart
}

export type RemovePWPResponse = {
  success: boolean
  message: string
  removed_item_id: string
  cart: MedusaCart
}

// ============================================================================
// PWP Operations
// ============================================================================

/**
 * Check PWP eligibility for a cart
 * Returns list of available PWP offers based on cart contents and value
 */
export async function checkPWPEligibility(cartId: string): Promise<CheckPWPResponse> {
  console.log('[PWP] Checking eligibility for cart:', cartId)

  const response = await fetch(`${BACKEND_URL}/store/pwp/check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-publishable-api-key': PUBLISHABLE_API_KEY || '',
    },
    body: JSON.stringify({
      cart_id: cartId,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to check PWP eligibility' }))
    throw new Error(error.message || 'Failed to check PWP eligibility')
  }

  const result = await response.json()
  console.log('[PWP] Eligibility check result:', {
    eligible_count: result.eligible_offers?.length || 0,
    all_count: result.all_offers?.length || 0,
  })

  return result
}

/**
 * Apply a PWP offer to the cart
 * Adds the reward product at discounted price
 */
export async function applyPWPOffer(
  cartId: string,
  pwpRuleId: string,
  variantId: string
): Promise<ApplyPWPResponse> {
  console.log('[PWP] Applying PWP offer:', { cartId, pwpRuleId, variantId })

  const response = await fetch(`${BACKEND_URL}/store/pwp/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-publishable-api-key': PUBLISHABLE_API_KEY || '',
    },
    body: JSON.stringify({
      cart_id: cartId,
      pwp_rule_id: pwpRuleId,
      variant_id: variantId,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to apply PWP offer' }))
    throw new Error(error.message || 'Failed to apply PWP offer')
  }

  const result = await response.json()
  console.log('[PWP] Apply result:', result)

  return result
}

/**
 * Remove a PWP item from the cart
 */
export async function removePWPItem(cartId: string, lineItemId: string): Promise<RemovePWPResponse> {
  console.log('[PWP] Removing PWP item:', { cartId, lineItemId })

  const response = await fetch(`${BACKEND_URL}/store/pwp/remove`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-publishable-api-key': PUBLISHABLE_API_KEY || '',
    },
    body: JSON.stringify({
      cart_id: cartId,
      line_item_id: lineItemId,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to remove PWP item' }))
    throw new Error(error.message || 'Failed to remove PWP item')
  }

  const result = await response.json()
  console.log('[PWP] Remove result:', result)

  return result
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a cart item is a PWP item
 */
export function isPWPItem(item: { metadata?: Record<string, unknown> }): boolean {
  return item.metadata?.is_pwp_item === true
}

/**
 * Get PWP info from a cart item
 */
export function getPWPItemInfo(item: { metadata?: Record<string, unknown> }): {
  rule_id: string
  rule_name: string
  original_price: number
  discount_amount: number
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  trigger_type: 'cart_value' | 'product'
  trigger_cart_value: number | null
  trigger_product_id: string | null
} | null {
  if (!isPWPItem(item)) return null

  return {
    rule_id: (item.metadata?.pwp_rule_id as string) || '',
    rule_name: (item.metadata?.pwp_rule_name as string) || '',
    original_price: (item.metadata?.pwp_original_price as number) || 0,
    discount_amount: (item.metadata?.pwp_discount_amount as number) || 0,
    discount_type: (item.metadata?.pwp_discount_type as 'percentage' | 'fixed') || 'percentage',
    discount_value: (item.metadata?.pwp_discount_value as number) || 0,
    trigger_type: (item.metadata?.pwp_trigger_type as 'cart_value' | 'product') || 'cart_value',
    trigger_cart_value: (item.metadata?.pwp_trigger_cart_value as number) || null,
    trigger_product_id: (item.metadata?.pwp_trigger_product_id as string) || null,
  }
}

/**
 * Format price for display
 */
export function formatPrice(amountInCents: number, currencyCode: string = 'SGD'): string {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: currencyCode,
  }).format(amountInCents / 100)
}

/**
 * Format discount for display
 */
export function formatPWPDiscount(
  type: 'percentage' | 'fixed',
  value: number,
  currencyCode: string = 'SGD'
): string {
  if (type === 'percentage') {
    return `${value}% OFF`
  }
  return `${formatPrice(value, currencyCode)} OFF`
}

/**
 * Get the best price for a variant based on currency
 */
export function getVariantPrice(
  variant: PWPVariant,
  currencyCode: string = 'SGD'
): number | null {
  const price = variant.prices.find(
    (p) => p.currency_code.toLowerCase() === currencyCode.toLowerCase()
  ) || variant.prices[0]

  return price?.amount || null
}
