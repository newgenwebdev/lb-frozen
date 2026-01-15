/**
 * Payment Methods API Service
 * Handles saved payment methods (cards) for customers
 */

import { apiClient } from './client';

/**
 * Saved payment method type (card)
 */
export interface SavedPaymentMethod {
  id: string;
  type: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
    funding: string;
  } | null;
  billing_details: {
    name: string | null;
    email: string | null;
  };
  created: number;
}

/**
 * Get saved payment methods for the authenticated customer
 */
export async function getPaymentMethods(): Promise<SavedPaymentMethod[]> {
  const response = await apiClient.get<{ payment_methods: SavedPaymentMethod[] }>(
    '/store/customer/payment-methods'
  );
  return response.payment_methods || [];
}

/**
 * Create a SetupIntent for adding a new card
 * Returns the client_secret for Stripe Elements
 */
export async function createSetupIntent(): Promise<{
  client_secret: string;
  setup_intent_id: string;
}> {
  return apiClient.post('/store/customer/payment-methods', {});
}

/**
 * Delete a saved payment method
 */
export async function deletePaymentMethod(paymentMethodId: string): Promise<{ success: boolean }> {
  return apiClient.delete(`/store/customer/payment-methods/${paymentMethodId}`);
}

/**
 * Get card brand display name
 */
export function getCardBrandName(brand: string): string {
  const brandNames: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    discover: 'Discover',
    diners: 'Diners Club',
    jcb: 'JCB',
    unionpay: 'UnionPay',
  };
  return brandNames[brand.toLowerCase()] || brand;
}

/**
 * Get card brand color gradient for display
 */
export function getCardBrandGradient(brand: string): string {
  const gradients: Record<string, string> = {
    visa: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
    mastercard: 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)',
    amex: 'linear-gradient(135deg, #006fcf 0%, #00adff 100%)',
    discover: 'linear-gradient(135deg, #ff6600 0%, #ff9900 100%)',
    diners: 'linear-gradient(135deg, #004c99 0%, #0066cc 100%)',
    jcb: 'linear-gradient(135deg, #003087 0%, #009cde 100%)',
    unionpay: 'linear-gradient(135deg, #e21836 0%, #f56600 100%)',
  };
  return gradients[brand.toLowerCase()] || 'linear-gradient(135deg, #374151 0%, #1f2937 100%)';
}
