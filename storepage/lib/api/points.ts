/**
 * Points & Loyalty API Service
 * Handles customer points/loyalty operations
 */

import { apiClient } from './client';
import type { PointsBalance, PointsTransaction } from './types';

/**
 * Get customer points balance
 */
export async function getPointsBalance(): Promise<PointsBalance> {
  const response = await apiClient.get<{ balance: PointsBalance }>(
    '/store/points/balance'
  );
  return response.balance;
}

/**
 * Get points transaction history
 */
export async function getPointsTransactions(params?: {
  limit?: number;
  offset?: number;
}): Promise<{ transactions: PointsTransaction[]; count: number }> {
  const queryParams = new URLSearchParams();
  
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const queryString = queryParams.toString();
  const endpoint = `/store/points/transactions${queryString ? `?${queryString}` : ''}`;

  return apiClient.get(endpoint);
}
