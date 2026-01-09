'use client'

import { useEffect, useRef } from 'react'
import { useCustomer } from '@/lib/context/CustomerContext'
import { useCart } from '@/lib/context/CartContext'

/**
 * Component that syncs cart state with authentication state.
 *
 * When a user logs out, this component automatically clears the cart
 * to prevent cart data from being shared between different user accounts.
 *
 * This component should be rendered inside both CustomerProvider and CartProvider.
 */
export function CartAuthSync(): null {
  const { isAuthenticated } = useCustomer()
  const { clearCart, medusaCart } = useCart()

  // Track previous auth state to detect logout
  const wasAuthenticatedRef = useRef<boolean | null>(null)

  useEffect(() => {
    // Skip on initial mount (wasAuthenticatedRef is null)
    if (wasAuthenticatedRef.current === null) {
      wasAuthenticatedRef.current = isAuthenticated
      return
    }

    // Detect logout: was authenticated, now is not
    if (wasAuthenticatedRef.current && !isAuthenticated) {
      // User logged out - clear cart to prevent data leaking to next user
      console.log('[CartAuthSync] Logout detected, clearing cart...')
      clearCart().catch((err) => {
        console.error('[CartAuthSync] Failed to clear cart on logout:', err)
      })
    }

    // Update ref for next render
    wasAuthenticatedRef.current = isAuthenticated
  }, [isAuthenticated, clearCart, medusaCart])

  // This component doesn't render anything
  return null
}
