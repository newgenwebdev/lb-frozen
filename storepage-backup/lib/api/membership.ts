/**
 * Membership API Client
 * Handles all membership-related API calls for the customer frontend
 * Supports dynamic membership system (free or paid, configurable tiers)
 */

import type {
  MembershipStatusResponse,
  TiersResponse,
  MembershipInfoResponse,
  MembershipPurchaseResponse,
} from '../types/membership'
import { getStoredAuthToken } from './customer'

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY || ''

/**
 * Get auth token from localStorage
 * Uses the shared token storage from customer module
 */
function getAuthToken(): string | null {
  return getStoredAuthToken()
}

/**
 * Get membership status for authenticated customer
 * Returns full membership details including tier, points, and activity
 */
export async function getMembershipStatus(): Promise<MembershipStatusResponse | null> {
  const token = getAuthToken()

  if (!token) {
    return null
  }

  try {
    const response = await fetch(`${BACKEND_URL}/store/membership/status`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-publishable-api-key': PUBLISHABLE_API_KEY,
      },
      credentials: 'include',
    })

    if (!response.ok) {
      if (response.status === 401) {
        return null
      }
      throw new Error('Failed to fetch membership status')
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching membership status:', error)
    return null
  }
}

/**
 * Get all active tiers (public endpoint)
 * Used for displaying tier comparison
 */
export async function getTiers(): Promise<TiersResponse | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/store/tiers`, {
      headers: {
        'x-publishable-api-key': PUBLISHABLE_API_KEY,
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      throw new Error('Failed to fetch tiers')
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching tiers:', error)
    return null
  }
}

/**
 * Get membership program info (public endpoint)
 * Returns dynamic configuration set by admin:
 * - program_type: "free" or "paid"
 * - price, currency, duration
 * - tiers configuration
 * - benefits list
 */
export async function getMembershipInfo(): Promise<MembershipInfoResponse | null> {
  try {
    const token = getAuthToken()

    const headers: Record<string, string> = {
      'x-publishable-api-key': PUBLISHABLE_API_KEY,
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${BACKEND_URL}/store/membership`, {
      headers,
      cache: 'no-store', // Don't cache - config can change
    })

    if (!response.ok) {
      throw new Error('Failed to fetch membership info')
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching membership info:', error)
    return null
  }
}

/**
 * Create a PaymentIntent for membership purchase
 * Returns client_secret for Stripe Elements
 * Requires authentication
 */
export async function createMembershipPaymentIntent(): Promise<{
  client_secret: string
  payment_intent_id: string
  amount: number
  currency: string
}> {
  const token = getAuthToken()

  if (!token) {
    throw new Error('Authentication required')
  }

  const response = await fetch(`${BACKEND_URL}/store/membership/payment-intent`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-publishable-api-key': PUBLISHABLE_API_KEY,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create payment intent')
  }

  return await response.json()
}

/**
 * Complete membership purchase after successful Stripe payment
 * Requires authentication and successful PaymentIntent
 */
export async function completeMembershipPurchase(
  paymentIntentId: string
): Promise<MembershipPurchaseResponse> {
  const token = getAuthToken()

  if (!token) {
    throw new Error('Authentication required')
  }

  const response = await fetch(`${BACKEND_URL}/store/membership/purchase`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-publishable-api-key': PUBLISHABLE_API_KEY,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ payment_intent_id: paymentIntentId }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to complete membership purchase')
  }

  return await response.json()
}

/**
 * Purchase membership (legacy flow with payment_method_id)
 * Requires authentication and Stripe payment method
 * @deprecated Use createMembershipPaymentIntent + completeMembershipPurchase instead
 */
export async function purchaseMembership(
  paymentMethodId: string
): Promise<MembershipPurchaseResponse | null> {
  const token = getAuthToken()

  if (!token) {
    throw new Error('Authentication required')
  }

  try {
    const response = await fetch(`${BACKEND_URL}/store/membership/purchase`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-publishable-api-key': PUBLISHABLE_API_KEY,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ payment_method_id: paymentMethodId }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to purchase membership')
    }

    return await response.json()
  } catch (error) {
    console.error('Error purchasing membership:', error)
    throw error
  }
}

/**
 * Format currency amount from cents to display string
 * Uses en-SG locale to display $ symbol (consistent with rest of site)
 */
export function formatCurrency(amountInCents: number, currency: string = 'SGD'): string {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountInCents / 100)
}

/**
 * Format points number with commas
 */
export function formatPoints(points: number): string {
  return new Intl.NumberFormat('en-US').format(points)
}

/**
 * Pre-defined tier color mappings for common tier names
 */
const TIER_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  // Premium tiers
  platinum: { bg: 'bg-gradient-to-r from-gray-700 to-gray-900', text: 'text-white', border: 'border-gray-700' },
  diamond: { bg: 'bg-gradient-to-r from-cyan-400 to-blue-500', text: 'text-white', border: 'border-cyan-400' },
  vip: { bg: 'bg-gradient-to-r from-purple-600 to-purple-800', text: 'text-white', border: 'border-purple-600' },
  elite: { bg: 'bg-gradient-to-r from-indigo-600 to-indigo-800', text: 'text-white', border: 'border-indigo-600' },

  // High tiers
  gold: { bg: 'bg-gradient-to-r from-yellow-500 to-yellow-600', text: 'text-white', border: 'border-yellow-500' },
  premium: { bg: 'bg-gradient-to-r from-amber-500 to-orange-500', text: 'text-white', border: 'border-amber-500' },

  // Mid tiers
  silver: { bg: 'bg-gradient-to-r from-gray-300 to-gray-400', text: 'text-gray-800', border: 'border-gray-400' },
  bronze: { bg: 'bg-gradient-to-r from-orange-300 to-orange-400', text: 'text-orange-900', border: 'border-orange-400' },

  // Base tiers
  classic: { bg: 'bg-white', text: 'text-black', border: 'border-[#E3E3E3]' },
  basic: { bg: 'bg-white', text: 'text-black', border: 'border-[#E3E3E3]' },
  starter: { bg: 'bg-white', text: 'text-black', border: 'border-[#E3E3E3]' },
  member: { bg: 'bg-white', text: 'text-black', border: 'border-[#E3E3E3]' },
}

/**
 * Color palette for dynamically assigning colors based on rank
 */
const RANK_COLORS = [
  { bg: 'bg-white', text: 'text-black', border: 'border-[#E3E3E3]' },                            // Rank 0
  { bg: 'bg-gradient-to-r from-gray-300 to-gray-400', text: 'text-gray-800', border: 'border-gray-400' },     // Rank 1
  { bg: 'bg-gradient-to-r from-yellow-500 to-yellow-600', text: 'text-white', border: 'border-yellow-500' },  // Rank 2
  { bg: 'bg-gradient-to-r from-gray-700 to-gray-900', text: 'text-white', border: 'border-gray-700' },        // Rank 3
  { bg: 'bg-gradient-to-r from-purple-600 to-purple-800', text: 'text-white', border: 'border-purple-600' },  // Rank 4+
]

/**
 * Get tier display color based on tier slug or rank
 * Supports both predefined tier names and dynamic tiers
 */
export function getTierColor(tierSlug: string, rank?: number): { bg: string; text: string; border: string } {
  const slug = tierSlug.toLowerCase()

  // First check if we have a predefined color for this tier name
  if (TIER_COLOR_MAP[slug]) {
    return TIER_COLOR_MAP[slug]
  }

  // If rank is provided, use rank-based coloring
  if (typeof rank === 'number') {
    const colorIndex = Math.min(rank, RANK_COLORS.length - 1)
    return RANK_COLORS[colorIndex]
  }

  // Default fallback
  return { bg: 'bg-white', text: 'text-black', border: 'border-[#E3E3E3]' }
}

/**
 * Get tier rank stars (for visual display)
 * Dynamically adjusts based on the max rank in the tier system
 */
export function getTierStars(rank: number, maxRank: number = 3): string {
  const filled = Math.min(rank + 1, maxRank + 1)
  const empty = maxRank + 1 - filled
  return '★'.repeat(filled) + '☆'.repeat(empty)
}

/**
 * Get tier icon based on rank
 * Returns an emoji representation for the tier
 */
export function getTierIcon(rank: number): string {
  if (rank >= 4) return '💎'
  if (rank === 3) return '👑'
  if (rank === 2) return '🥇'
  if (rank === 1) return '🥈'
  return '⭐'
}
