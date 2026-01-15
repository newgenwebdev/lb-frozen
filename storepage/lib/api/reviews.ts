/**
 * Review API Service
 * Handles all review-related API calls
 */

import { apiClient, getAuthHeaders } from './client';

export interface Review {
  id: string;
  product_id: string;
  customer_id: string;
  customer_name?: string; // Customer display name
  customer_avatar?: string | null; // Customer profile picture URL
  order_id?: string;
  order_item_id?: string;
  rating: number;
  title?: string;
  content?: string;
  // Handle both formats: { items: string[] } and legacy { items: { items: string[] } }
  images?: { items: string[] | { items: string[] } };
  is_verified_purchase: boolean;
  is_approved: boolean;
  is_featured: boolean;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

export interface ReviewStats {
  average_rating: number;
  total_reviews: number;
  rating_breakdown: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface ProductReviewsResponse {
  reviews: Review[];
  count: number;
  limit: number;
  offset: number;
  stats: ReviewStats;
}

export interface CreateReviewData {
  product_id: string;
  rating: number;
  title?: string;
  content?: string;
  images?: string[];
  order_id?: string;
}

export interface UpdateReviewData {
  rating?: number;
  title?: string;
  content?: string;
  images?: string[];
}

/**
 * Get all reviews for a product
 */
export async function getProductReviews(
  productId: string,
  options?: { limit?: number; offset?: number }
): Promise<ProductReviewsResponse> {
  const params = new URLSearchParams();
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.offset) params.append('offset', options.offset.toString());
  
  const queryString = params.toString();
  const endpoint = `/store/reviews/product/${productId}${queryString ? `?${queryString}` : ''}`;
  
  return apiClient.get<ProductReviewsResponse>(endpoint);
}

/**
 * Get rating stats for a product (lightweight, no reviews list)
 */
export async function getProductReviewStats(productId: string): Promise<ReviewStats & { product_id: string }> {
  return apiClient.get(`/store/reviews/product/${productId}/stats`);
}

/**
 * Get current customer's reviews
 */
export async function getMyReviews(
  options?: { limit?: number; offset?: number }
): Promise<{ reviews: Review[]; count: number; limit: number; offset: number }> {
  const params = new URLSearchParams();
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.offset) params.append('offset', options.offset.toString());
  
  const queryString = params.toString();
  const endpoint = `/store/customer/reviews${queryString ? `?${queryString}` : ''}`;
  
  return apiClient.get(endpoint, { headers: getAuthHeaders() });
}

/**
 * Check if customer has reviewed a product
 */
export async function getMyProductReview(
  productId: string
): Promise<{ has_reviewed: boolean; review: Review | null }> {
  return apiClient.get(`/store/customer/reviews/product/${productId}`, {
    headers: getAuthHeaders(),
  });
}

/**
 * Create a new review
 */
export async function createReview(
  data: CreateReviewData
): Promise<{ review: Review; message: string }> {
  return apiClient.post('/store/customer/reviews', data, {
    headers: getAuthHeaders(),
  });
}

/**
 * Update a review
 */
export async function updateReview(
  reviewId: string,
  data: UpdateReviewData
): Promise<{ review: Review; message: string }> {
  return apiClient.put(`/store/customer/reviews/${reviewId}`, data, {
    headers: getAuthHeaders(),
  });
}

/**
 * Delete a review
 */
export async function deleteReview(reviewId: string): Promise<{ message: string }> {
  return apiClient.delete(`/store/customer/reviews/${reviewId}`, {
    headers: getAuthHeaders(),
  });
}

/**
 * Mark a review as helpful
 */
export async function markReviewHelpful(
  reviewId: string
): Promise<{ review: Review; message: string }> {
  return apiClient.post(`/store/customer/reviews/${reviewId}/helpful`, {}, {
    headers: getAuthHeaders(),
  });
}

export interface FeaturedReview {
  id: string;
  rating: number;
  title?: string;
  content?: string;
  customer_name: string;
  customer_avatar?: string;
  is_verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
  photo_urls: string[];
  product: {
    id: string;
    title: string;
    handle: string;
    thumbnail?: string;
    price: string | null;
    currency: string;
  } | null;
}

/**
 * Get featured reviews with photos for landing page
 */
export async function getFeaturedReviews(
  options?: { limit?: number }
): Promise<{ reviews: FeaturedReview[]; count: number }> {
  const params = new URLSearchParams();
  if (options?.limit) params.append('limit', options.limit.toString());
  
  const queryString = params.toString();
  const endpoint = `/store/reviews/featured${queryString ? `?${queryString}` : ''}`;
  
  return apiClient.get(endpoint);
}

