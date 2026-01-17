/**
 * Admin Review API
 * Handles review management operations
 */

import { api } from "./client";

export interface AdminReview {
  id: string;
  product_id: string;
  customer_id: string | null;
  order_id: string | null;
  order_item_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  rating: number;
  title: string | null;
  content: string | null;
  images: { items: string[] };
  is_verified_purchase: boolean;
  is_guest_review: boolean;
  is_approved: boolean;
  is_featured: boolean;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  // Populated fields
  customer?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  } | null;
  product?: {
    id: string;
    title: string;
    handle: string;
    thumbnail: string | null;
  } | null;
}

export interface AdminReviewListResponse {
  reviews: AdminReview[];
  count: number;
  limit: number;
  offset: number;
}

export interface AdminReviewFilters {
  limit?: number;
  offset?: number;
  is_approved?: boolean;
  is_featured?: boolean;
  is_guest_review?: boolean;
  product_id?: string;
  customer_id?: string;
}

/**
 * Get all reviews with filters
 */
export async function getAdminReviews(
  filters?: AdminReviewFilters
): Promise<AdminReviewListResponse> {
  const params = new URLSearchParams();
  
  if (filters?.limit) params.append("limit", filters.limit.toString());
  if (filters?.offset) params.append("offset", filters.offset.toString());
  if (filters?.is_approved !== undefined) params.append("is_approved", filters.is_approved.toString());
  if (filters?.is_featured !== undefined) params.append("is_featured", filters.is_featured.toString());
  if (filters?.is_guest_review !== undefined) params.append("is_guest_review", filters.is_guest_review.toString());
  if (filters?.product_id) params.append("product_id", filters.product_id);
  if (filters?.customer_id) params.append("customer_id", filters.customer_id);

  const queryString = params.toString();
  const response = await api.get<AdminReviewListResponse>(
    `/admin/reviews${queryString ? `?${queryString}` : ""}`
  );
  return response.data;
}

/**
 * Get single review by ID
 */
export async function getAdminReviewById(id: string): Promise<AdminReview> {
  const response = await api.get<{ review: AdminReview }>(`/admin/reviews/${id}`);
  return response.data.review;
}

/**
 * Approve a review
 */
export async function approveReview(id: string): Promise<AdminReview> {
  const response = await api.post<{ review: AdminReview; message: string }>(
    `/admin/reviews/${id}/approve`
  );
  return response.data.review;
}

/**
 * Reject/Unapprove a review
 */
export async function rejectReview(id: string): Promise<AdminReview> {
  const response = await api.post<{ review: AdminReview; message: string }>(
    `/admin/reviews/${id}/reject`
  );
  return response.data.review;
}

/**
 * Toggle featured status
 */
export async function toggleFeaturedReview(id: string, featured: boolean): Promise<AdminReview> {
  const response = await api.put<{ review: AdminReview; message: string }>(
    `/admin/reviews/${id}`,
    { is_featured: featured }
  );
  return response.data.review;
}

/**
 * Delete a review
 */
export async function deleteAdminReview(id: string): Promise<void> {
  await api.delete(`/admin/reviews/${id}`);
}

/**
 * Get pending reviews count (for badge)
 */
export async function getPendingReviewsCount(): Promise<number> {
  const response = await getAdminReviews({ is_approved: false, limit: 1 });
  return response.count;
}
