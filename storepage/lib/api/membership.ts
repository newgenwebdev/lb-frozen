/**
 * Membership API Service
 * Handles customer membership operations
 */

import { apiClient } from './client';
import type { Membership, MembershipTier } from './types';

/**
 * Get customer membership
 */
export async function getMembership(): Promise<{ membership: Membership | null }> {
  try {
    return await apiClient.get('/store/membership');
  } catch (error) {
    return { membership: null };
  }
}

/**
 * Get available membership tiers
 */
export async function getMembershipTiers(): Promise<{ tiers: MembershipTier[] }> {
  return apiClient.get('/store/membership/tiers');
}

/**
 * Purchase or upgrade membership
 */
export async function purchaseMembership(
  tierId: string
): Promise<{ membership: Membership }> {
  return apiClient.post('/store/membership/purchase', { tier_id: tierId });
}

/**
 * Cancel membership
 */
export async function cancelMembership(): Promise<{ message: string }> {
  return apiClient.post('/store/membership/cancel');
}

/**
 * Get membership benefits
 */
export async function getMembershipBenefits(): Promise<{
  benefits: Record<string, any>;
}> {
  const response = await getMembership();
  return {
    benefits: response.membership?.tier?.benefits || {},
  };
}
