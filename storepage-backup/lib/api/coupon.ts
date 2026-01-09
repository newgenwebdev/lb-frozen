import type { MedusaCart } from './cart'

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY

// ============================================================================
// Types
// ============================================================================

export type CouponInfo = {
  id: string
  code: string
  name: string
  type: 'percentage' | 'fixed'
  value: number
  currency_code: string
}

export type DiscountInfo = {
  amount: number
  formatted: string
}

export type ValidateCouponResponse = {
  valid: boolean
  message?: string
  coupon?: CouponInfo
  discount?: DiscountInfo
  cart_subtotal?: number
  new_total?: number
}

export type AppliedCoupon = {
  code: string
  name: string
  type: 'percentage' | 'fixed'
  value: number
  discount_amount: number
  discount_formatted: string
  currency_code: string
}

export type ApplyCouponResponse = {
  success: boolean
  cart: MedusaCart
  applied_coupon: AppliedCoupon
}

export type RemoveCouponResponse = {
  success: boolean
  message: string
  removed_code?: string
  cart: MedusaCart
}

// ============================================================================
// Coupon Operations
// ============================================================================

/**
 * Validate a coupon code without applying it
 * Returns discount preview if valid
 */
export async function validateCouponCode(
  cartId: string,
  code: string
): Promise<ValidateCouponResponse> {
  const response = await fetch(`${BACKEND_URL}/store/coupons/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-publishable-api-key': PUBLISHABLE_API_KEY || '',
    },
    body: JSON.stringify({
      cart_id: cartId,
      code: code.toUpperCase(),
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to validate coupon' }))
    throw new Error(error.message || 'Failed to validate coupon')
  }

  return response.json()
}

/**
 * Apply a coupon code to the cart
 * Applies the discount and returns updated cart
 */
export async function applyCouponCode(
  cartId: string,
  code: string
): Promise<ApplyCouponResponse> {
  console.log('[Coupon] Applying coupon:', { cartId, code: code.toUpperCase() })

  const response = await fetch(`${BACKEND_URL}/store/coupons/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-publishable-api-key': PUBLISHABLE_API_KEY || '',
    },
    body: JSON.stringify({
      cart_id: cartId,
      code: code.toUpperCase(),
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to apply coupon' }))
    throw new Error(error.message || 'Failed to apply coupon')
  }

  const result = await response.json()

  // Debug: Log the response with cart metadata
  console.log('[Coupon] Apply response:', {
    success: result.success,
    applied_coupon: result.applied_coupon,
    cart_metadata: result.cart?.metadata,
  })

  return result
}

/**
 * Remove an applied coupon from the cart
 */
export async function removeCouponCode(cartId: string): Promise<RemoveCouponResponse> {
  const response = await fetch(`${BACKEND_URL}/store/coupons/remove`, {
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
    const error = await response.json().catch(() => ({ message: 'Failed to remove coupon' }))
    throw new Error(error.message || 'Failed to remove coupon')
  }

  return response.json()
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract applied coupon info from cart metadata
 */
export function getAppliedCouponFromCart(cart: MedusaCart): AppliedCoupon | null {
  // Check if coupon code exists and is not null/empty
  const couponCode = cart.metadata?.applied_coupon_code
  if (!couponCode || couponCode === null) {
    return null
  }

  const discountAmount = (cart.metadata?.applied_coupon_discount as number) || 0
  const currencyCode = (cart.metadata?.applied_coupon_currency as string) || 'SGD'

  return {
    code: couponCode as string,
    name: (cart.metadata?.applied_coupon_name as string) || '',
    type: (cart.metadata?.applied_coupon_type as 'percentage' | 'fixed') || 'percentage',
    value: (cart.metadata?.applied_coupon_value as number) || 0,
    discount_amount: discountAmount,
    discount_formatted: formatDiscountAmount(discountAmount, currencyCode),
    currency_code: currencyCode,
  }
}

/**
 * Format discount amount for display
 */
export function formatDiscountAmount(amountInCents: number, currencyCode: string = 'SGD'): string {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: currencyCode,
  }).format(amountInCents / 100)
}

/**
 * Format discount value for display (percentage or fixed)
 */
export function formatDiscountValue(
  type: 'percentage' | 'fixed',
  value: number,
  currencyCode: string = 'SGD'
): string {
  if (type === 'percentage') {
    return `${value}%`
  }
  return formatDiscountAmount(value, currencyCode)
}
