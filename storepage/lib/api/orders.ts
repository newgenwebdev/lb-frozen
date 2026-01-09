/**
 * Order API Service
 * Handles customer order operations
 */

import { apiClient } from './client';
import type { Order, PaginatedResponse } from './types';

/**
 * Get customer orders
 */
export async function getOrders(params?: {
  limit?: number;
  offset?: number;
}): Promise<PaginatedResponse<Order>> {
  const queryParams = new URLSearchParams();
  
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const queryString = queryParams.toString();
  const endpoint = `/store/customers/me/orders${queryString ? `?${queryString}` : ''}`;

  return apiClient.get(endpoint);
}

/**
 * Get order by ID
 */
export async function getOrder(orderId: string): Promise<{ order: Order }> {
  return apiClient.get(`/store/customer-orders/${orderId}`);
}

/**
 * Download order invoice
 */
export async function downloadInvoice(orderId: string): Promise<Blob> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/customer-orders/${orderId}/invoice`,
    {
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('lb-frozen-auth-token') || ''}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to download invoice');
  }

  return response.blob();
}

/**
 * Request order return
 */
export async function requestReturn(orderId: string, data: {
  items: Array<{
    item_id: string;
    quantity: number;
    reason?: string;
  }>;
  note?: string;
}): Promise<{ return: any }> {
  return apiClient.post(`/store/orders/${orderId}/return`, data);
}

/**
 * Cancel order (if allowed)
 */
export async function cancelOrder(orderId: string): Promise<{ order: Order }> {
  return apiClient.post(`/store/orders/${orderId}/cancel`);
}
