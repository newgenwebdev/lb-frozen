import type { MedusaCart } from './cart'
import { getStoredAuthToken } from './customer'

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY

// ============================================================================
// Types
// ============================================================================

export type AppliedMembershipPromo = {
  id: string
  name: string
  description?: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  discount_amount: number
  discount_formatted: string
}

export type ApplyMembershipPromoResponse = {
  success: boolean
  message?: string
  is_member?: boolean
  cart: MedusaCart
  applied_promo?: AppliedMembershipPromo
}

export type RemoveMembershipPromoResponse = {
  success: boolean
  message: string
  removed_promo_id?: string
  removed_promo_name?: string
  cart: MedusaCart
}

// ============================================================================
// Membership Promo Operations
// ============================================================================

/**
 * Apply membership promo to cart
 * Automatically finds and applies the best active promo for the customer
 * Requires authentication
 */
export async function applyMembershipPromo(
  cartId: string
): Promise<ApplyMembershipPromoResponse> {
  const token = getStoredAuthToken()

  if (!token) {
    throw new Error('Authentication required to apply membership promo')
  }

  const response = await fetch(`${BACKEND_URL}/store/membership-promo/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-publishable-api-key': PUBLISHABLE_API_KEY || '',
    },
    credentials: 'include',
    body: JSON.stringify({
      cart_id: cartId,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to apply membership promo' }))
    throw new Error(error.message || 'Failed to apply membership promo')
  }

  return response.json()
}

/**
 * Remove membership promo from cart
 */
export async function removeMembershipPromo(
  cartId: string
): Promise<RemoveMembershipPromoResponse> {
  const response = await fetch(`${BACKEND_URL}/store/membership-promo/remove`, {
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
    const error = await response.json().catch(() => ({ message: 'Failed to remove membership promo' }))
    throw new Error(error.message || 'Failed to remove membership promo')
  }

  return response.json()
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract applied membership promo info from cart metadata
 */
export function getAppliedMembershipPromoFromCart(cart: MedusaCart): AppliedMembershipPromo | null {
  const promoId = cart.metadata?.applied_membership_promo_id
  if (!promoId || promoId === null) {
    return null
  }

  const discountAmount = (cart.metadata?.applied_membership_promo_discount as number) || 0

  return {
    id: promoId as string,
    name: (cart.metadata?.applied_membership_promo_name as string) || '',
    discount_type: (cart.metadata?.applied_membership_promo_type as 'percentage' | 'fixed') || 'percentage',
    discount_value: (cart.metadata?.applied_membership_promo_value as number) || 0,
    discount_amount: discountAmount,
    discount_formatted: formatDiscountAmount(discountAmount),
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
