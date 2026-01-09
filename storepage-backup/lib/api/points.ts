/**
 * Points API Client
 * Handles all points-related API calls for the customer frontend
 */

import type { MedusaCart } from './cart'
import { getStoredAuthToken } from './customer'

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY || ''

// ============================================================================
// Types
// ============================================================================

export type PointsBalanceResponse = {
  balance: number
  total_earned: number
  total_redeemed: number
  redemption_rate: number
  redemption_info: {
    points_per_dollar: number
    example: string
  }
}

export type AppliedPoints = {
  points: number
  discount_amount: number
  discount_formatted: string
}

export type ApplyPointsResponse = {
  cart: MedusaCart
  points_applied: AppliedPoints
}

export type RemovePointsResponse = {
  success: boolean
  message: string
  cart: MedusaCart
}

// ============================================================================
// Points Operations
// ============================================================================

/**
 * Get customer's points balance
 * Requires authentication + membership
 */
export async function getPointsBalance(): Promise<PointsBalanceResponse | null> {
  const token = getStoredAuthToken()

  if (!token) {
    return null
  }

  try {
    const url = `${BACKEND_URL}/store/points`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-publishable-api-key': PUBLISHABLE_API_KEY,
      },
      credentials: 'include',
    })

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return null
      }
      throw new Error('Failed to fetch points balance')
    }

    const data = await response.json()
    return data
  } catch {
    return null
  }
}

/**
 * Apply points as discount to cart
 * Requires authentication + membership
 */
export async function applyPointsToCart(
  cartId: string,
  pointsToRedeem: number
): Promise<ApplyPointsResponse> {
  const token = getStoredAuthToken()

  if (!token) {
    throw new Error('Authentication required')
  }

  const url = `${BACKEND_URL}/store/cart/${cartId}/apply-points`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-publishable-api-key': PUBLISHABLE_API_KEY,
    },
    credentials: 'include',
    body: JSON.stringify({ points_to_redeem: pointsToRedeem }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to apply points' }))
    throw new Error(error.message || 'Failed to apply points')
  }

  return response.json()
}

/**
 * Remove applied points from cart
 * Requires authentication
 */
export async function removePointsFromCart(cartId: string): Promise<RemovePointsResponse> {
  const token = getStoredAuthToken()

  if (!token) {
    throw new Error('Authentication required')
  }

  const response = await fetch(`${BACKEND_URL}/store/cart/${cartId}/remove-points`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-publishable-api-key': PUBLISHABLE_API_KEY,
    },
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to remove points' }))
    throw new Error(error.message || 'Failed to remove points')
  }

  return response.json()
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract applied points info from cart metadata
 */
export function getAppliedPointsFromCart(cart: MedusaCart): AppliedPoints | null {
  const pointsToRedeem = cart.metadata?.points_to_redeem as number | undefined
  const discountAmount = cart.metadata?.points_discount_amount as number | undefined

  if (!pointsToRedeem || pointsToRedeem <= 0) {
    return null
  }

  return {
    points: pointsToRedeem,
    discount_amount: discountAmount || 0,
    discount_formatted: `$${((discountAmount || 0) / 100).toFixed(2)}`,
  }
}

/**
 * Format points for display with comma separators
 */
export function formatPoints(points: number): string {
  return new Intl.NumberFormat('en-US').format(points)
}

/**
 * Calculate discount amount from points
 */
export function calculatePointsDiscount(points: number, redemptionRate: number): number {
  return Math.floor(points * redemptionRate * 100) // Returns cents
}
