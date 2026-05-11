/**
 * Cart API Service
 * Handles all cart-related operations
 */

import { apiClient, getAuthHeaders } from './client';
import { isAuthenticated } from './auth';
import type { Cart, LineItem } from './types';

const CART_ID_KEY =
  process.env.NEXT_PUBLIC_CART_ID_KEY || 'lb-frozen-cart-id';

/**
 * Get stored cart ID from localStorage
 */
export function getStoredCartId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CART_ID_KEY);
}

/**
 * Store cart ID in localStorage
 */
export function setStoredCartId(cartId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_ID_KEY, cartId);
}

/**
 * Clear stored cart ID
 */
export function clearStoredCartId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CART_ID_KEY);
}

/**
 * Get default region ID
 */
async function getDefaultRegionId(): Promise<string> {
  const defaultRegion = process.env.NEXT_PUBLIC_DEFAULT_REGION || 'my';
  
  try {
    const response = await apiClient.get<{ regions: any[] }>('/store/regions');
    const region = response.regions.find((r: any) => r.name.toLowerCase() === defaultRegion.toLowerCase());
    return region?.id || response.regions[0]?.id;
  } catch (error) {
    console.error('Failed to fetch regions:', error);
    throw error;
  }
}

/**
 * Transfer a cart to the authenticated customer. Medusa's POST /store/carts
 * does NOT auto-attach the customer even with a Bearer token, so we explicitly
 * call this Medusa-built-in route. Without this, line items get re-priced using
 * the default price (retail) instead of the customer's role price.
 */
export async function transferCartToCustomer(cartId: string): Promise<Cart> {
  const response = await apiClient.post<{ cart: Cart }>(
    `/store/carts/${cartId}/customer`,
    {}
  );
  return response.cart;
}

/**
 * Create a new cart
 */
export async function createCart(): Promise<Cart> {
  const regionId = await getDefaultRegionId();

  const response = await apiClient.post<{ cart: Cart }>('/store/carts', {
    region_id: regionId,
  });

  let cart = response.cart;
  setStoredCartId(cart.id);

  if (isAuthenticated()) {
    try {
      cart = await transferCartToCustomer(cart.id);
    } catch (err) {
      console.error('Failed to attach customer to new cart:', err);
    }
  }

  return cart;
}

/**
 * Get cart by ID
 */
export async function getCart(cartId: string): Promise<Cart> {
  const response = await apiClient.get<{ cart: Cart }>(
    `/store/carts/${cartId}?fields=*items,*items.variant,*items.variant.product,+metadata`
  );
  return response.cart;
}

/**
 * Get or create cart
 *
 * Detects carts with completed payment sessions (PaymentIntent succeeded) and
 * creates a fresh cart so Medusa doesn't choke trying to refresh the payment
 * collection with "Could not delete all payment sessions".
 */
export async function getOrCreateCart(): Promise<Cart> {
  const cartId = getStoredCartId();

  if (cartId) {
    try {
      const cart = await getCart(cartId);
      
      // Check if cart has completed_at (order already created) or has succeeded payment sessions
      // This prevents the "Could not delete all payment sessions" error
      if ((cart as any).completed_at) {
        clearStoredCartId();
        return createCart();
      }
      
      // Check for payment collection with succeeded payment intent
      // We need to create a new cart if the payment has already succeeded
      const paymentCollection = (cart as any).payment_collection;
      if (paymentCollection?.payment_sessions?.length > 0) {
        const hasSucceededPayment = paymentCollection.payment_sessions.some(
          (session: any) =>
            session.status === 'authorized' ||
            session.status === 'captured' ||
            session.data?.status === 'succeeded' ||
            session.data?.status === 'requires_capture'
        );

        if (hasSucceededPayment) {
          clearStoredCartId();
          return createCart();
        }
      }

      // Cart exists but isn't yet attached to the logged-in customer (e.g.
      // created as guest, or association lost). Without transferring it,
      // line items get re-priced as retail and role pricing is ignored.
      if (isAuthenticated() && !(cart as any).customer_id) {
        try {
          return await transferCartToCustomer(cart.id);
        } catch (err) {
          console.error('Failed to attach customer to existing cart:', err);
        }
      }

      return cart;
    } catch (error) {
      clearStoredCartId();
    }
  }

  return createCart();
}

/**
 * Add item to cart
 */
export async function addToCart(
  variantId: string,
  quantity: number
): Promise<Cart> {
  const cart = await getOrCreateCart();

  const response = await apiClient.post<{ cart: Cart }>(
    `/store/carts/${cart.id}/line-items?fields=*items,*items.variant,*items.variant.product,+metadata`,
    {
      variant_id: variantId,
      quantity,
    }
  );

  return response.cart;
}

/**
 * Update cart item quantity
 */
export async function updateCartItem(
  lineItemId: string,
  quantity: number
): Promise<Cart> {
  const cartId = getStoredCartId();
  if (!cartId) throw new Error('No cart found');

  const response = await apiClient.post<{ cart: Cart }>(
    `/store/carts/${cartId}/line-items/${lineItemId}?fields=*items,*items.variant,*items.variant.product,+metadata`,
    { quantity }
  );

  return response.cart;
}

/**
 * Remove item from cart
 * Note: Medusa returns the deleted line item, not the cart. We need to fetch cart after delete.
 */
export async function removeFromCart(lineItemId: string): Promise<Cart> {
  const cartId = getStoredCartId();
  if (!cartId) throw new Error('No cart found');

  // Delete the line item
  await apiClient.delete<{ id: string; object: string; deleted: boolean }>(
    `/store/carts/${cartId}/line-items/${lineItemId}`
  );

  // Fetch updated cart after deletion
  const cartResponse = await apiClient.get<{ cart: Cart }>(
    `/store/carts/${cartId}?fields=*items,*items.variant,*items.variant.product,+metadata`
  );

  return cartResponse.cart;
}

/**
 * Clear entire cart
 */
export async function clearCart(): Promise<void> {
  clearStoredCartId();
}

/**
 * Update cart information (email, addresses, etc.)
 */
export async function updateCart(data: {
  email?: string;
  shipping_address?: any;
  billing_address?: any;
}): Promise<Cart> {
  const cartId = getStoredCartId();
  if (!cartId) throw new Error('No cart found');

  const response = await apiClient.post<{ cart: Cart }>(
    `/store/carts/${cartId}`,
    data
  );

  return response.cart;
}

/**
 * Apply coupon code to cart
 */
export async function applyCoupon(code: string): Promise<Cart> {
  const cartId = getStoredCartId();
  if (!cartId) throw new Error('No cart found');

  const response = await apiClient.post<{ cart: Cart }>(
    `/store/carts/${cartId}/apply-coupon`,
    { code }
  );

  return response.cart;
}

/**
 * Remove coupon from cart
 */
export async function removeCoupon(): Promise<Cart> {
  const cartId = getStoredCartId();
  if (!cartId) throw new Error('No cart found');

  const response = await apiClient.delete<{ cart: Cart }>(
    `/store/carts/${cartId}/remove-coupon`
  );

  return response.cart;
}

/**
 * Apply points to cart
 */
export async function applyPoints(points: number): Promise<Cart> {
  const cartId = getStoredCartId();
  if (!cartId) throw new Error('No cart found');

  const response = await apiClient.post<{ cart: Cart }>(
    `/store/carts/${cartId}/apply-points`,
    { points }
  );

  return response.cart;
}

/**
 * Remove points from cart
 */
export async function removePoints(): Promise<Cart> {
  const cartId = getStoredCartId();
  if (!cartId) throw new Error('No cart found');

  const response = await apiClient.delete<{ cart: Cart }>(
    `/store/carts/${cartId}/remove-points`
  );

  return response.cart;
}

/**
 * Force backend to re-price cart line items using the authoritative
 * role resolver (reads customer.metadata.pricing_role). Call this after
 * any cart update that may have triggered Medusa's internal price
 * recompute with the wrong customer group.
 */
export async function syncCartPrices(): Promise<Cart> {
  const cartId = getStoredCartId();
  if (!cartId) throw new Error('No cart found');

  const response = await apiClient.post<{ cart: Cart }>(
    `/store/carts/${cartId}/sync-prices`,
    {}
  );

  return response.cart;
}

/**
 * Select shipping method
 */
export async function selectShippingMethod(
  shippingMethodId: string
): Promise<Cart> {
  const cartId = getStoredCartId();
  if (!cartId) throw new Error('No cart found');

  const response = await apiClient.post<{ cart: Cart }>(
    `/store/carts/${cartId}/shipping-methods`,
    { option_id: shippingMethodId }
  );

  return response.cart;
}

/**
 * Complete cart/create order
 */
export async function completeCart(): Promise<{ order: any }> {
  const cartId = getStoredCartId();
  if (!cartId) throw new Error('No cart found');

  const headers = getAuthHeaders();

  const response = await apiClient.post<{ order: any }>(
    `/store/carts/${cartId}/complete`
  );

  // Clear cart after successful order
  clearStoredCartId();

  return response;
}
