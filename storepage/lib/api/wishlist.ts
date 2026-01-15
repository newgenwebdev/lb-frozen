import { apiClient } from './client';

export interface WishlistItem {
  id: string;
  customer_id: string;
  product_id: string;
  variant_id?: string;
  title: string;
  thumbnail?: string | null;
  price: number;
  original_price?: number;
  created_at: string;
  updated_at: string;
}

export interface WishlistResponse {
  wishlist: WishlistItem[];
}

/**
 * Fetch customer's wishlist from server
 */
export async function fetchWishlist(): Promise<WishlistItem[]> {
  const response = await apiClient.get<WishlistResponse>('/store/wishlist');
  return response.wishlist || [];
}

/**
 * Add item to wishlist
 */
export async function addToWishlist(data: {
  product_id: string;
  variant_id?: string;
  title: string;
  thumbnail?: string | null;
  price: number;
  original_price?: number;
}): Promise<WishlistItem> {
  const response = await apiClient.post<{ item: WishlistItem }>('/store/wishlist', data);
  return response.item;
}

/**
 * Remove item from wishlist
 */
export async function removeFromWishlist(product_id: string): Promise<void> {
  await apiClient.delete(`/store/wishlist/${product_id}`);
}
