/**
 * Cart API Service
 * Handles all cart-related operations
 */

import { apiClient } from './client';
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
  const defaultRegion = process.env.NEXT_PUBLIC_DEFAULT_REGION || 'sg';
  
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
 * Create a new cart
 */
export async function createCart(): Promise<Cart> {
  const regionId = await getDefaultRegionId();
  
  const response = await apiClient.post<{ cart: Cart }>('/store/carts', {
    region_id: regionId,
  });

  setStoredCartId(response.cart.id);
  return response.cart;
}

/**
 * Get cart by ID
 */
export async function getCart(cartId: string): Promise<Cart> {
  const response = await apiClient.get<{ cart: Cart }>(`/store/carts/${cartId}`);
  return response.cart;
}

/**
 * Get or create cart
 */
export async function getOrCreateCart(): Promise<Cart> {
  const cartId = getStoredCartId();

  if (cartId) {
    try {
      return await getCart(cartId);
    } catch (error) {
      console.log('Cart not found, creating new cart');
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
    `/store/carts/${cart.id}/line-items`,
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
    `/store/carts/${cartId}/line-items/${lineItemId}`,
    { quantity }
  );

  return response.cart;
}

/**
 * Remove item from cart
 */
export async function removeFromCart(lineItemId: string): Promise<Cart> {
  const cartId = getStoredCartId();
  if (!cartId) throw new Error('No cart found');

  const response = await apiClient.delete<{ cart: Cart }>(
    `/store/carts/${cartId}/line-items/${lineItemId}`
  );

  return response.cart;
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

  const response = await apiClient.post<{ order: any }>(
    `/store/carts/${cartId}/complete`
  );

  // Clear cart after successful order
  clearStoredCartId();

  return response;
}
