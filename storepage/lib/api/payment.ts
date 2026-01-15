/**
 * Payment API Service
 * Handles payment-related operations for checkout
 */

import { apiClient } from './client';
import type { Cart, PaymentSession } from './types';
import { getStoredCartId } from './cart';

/**
 * Shipping option type
 */
export interface ShippingOption {
  id: string;
  name: string;
  price_type: 'flat_rate' | 'calculated';
  amount: number;
  is_return: boolean;
  provider_id: string;
  data?: Record<string, any>;
}

/**
 * Payment provider type
 */
export interface PaymentProvider {
  id: string;
  is_installed: boolean;
}

/**
 * Get available shipping options for the cart's region
 */
export async function getShippingOptions(cartId?: string): Promise<{ shipping_options: ShippingOption[] }> {
  const id = cartId || getStoredCartId();
  if (!id) throw new Error('No cart found');

  return apiClient.get(`/store/shipping-options?cart_id=${id}`);
}

/**
 * Add shipping method to cart
 */
export async function addShippingMethod(optionId: string): Promise<Cart> {
  const cartId = getStoredCartId();
  if (!cartId) throw new Error('No cart found');

  const response = await apiClient.post<{ cart: Cart }>(
    `/store/carts/${cartId}/shipping-methods`,
    { option_id: optionId }
  );

  return response.cart;
}

/**
 * Initialize payment sessions for the cart
 */
export async function initializePaymentSessions(): Promise<Cart> {
  const cartId = getStoredCartId();
  if (!cartId) throw new Error('No cart found');

  const response = await apiClient.post<{ cart: Cart }>(
    `/store/carts/${cartId}/payment-sessions`
  );

  return response.cart;
}

/**
 * Select/set payment session provider
 */
export async function setPaymentSession(providerId: string): Promise<Cart> {
  const cartId = getStoredCartId();
  if (!cartId) throw new Error('No cart found');

  const response = await apiClient.post<{ cart: Cart }>(
    `/store/carts/${cartId}/payment-session`,
    { provider_id: providerId }
  );

  return response.cart;
}

/**
 * Create a payment collection for the cart (Medusa v2)
 */
export async function createPaymentCollection(cartId?: string): Promise<{ payment_collection: any }> {
  const id = cartId || getStoredCartId();
  if (!id) throw new Error('No cart found');

  return apiClient.post(`/store/payment-collections`, {
    cart_id: id,
  });
}

/**
 * Initialize payment session in payment collection (Medusa v2)
 */
export async function initializePaymentSession(
  paymentCollectionId: string,
  providerId: string = 'pp_stripe_stripe'
): Promise<{ payment_session: PaymentSession }> {
  const response = await apiClient.post<any>(`/store/payment-collections/${paymentCollectionId}/payment-sessions`, {
    provider_id: providerId,
  });
  
  // Handle different response structures
  if (response.payment_session) {
    return { payment_session: response.payment_session };
  }
  if (response.payment_collection?.payment_sessions?.[0]) {
    return { payment_session: response.payment_collection.payment_sessions[0] };
  }
  
  console.log('Payment session response:', JSON.stringify(response, null, 2));
  throw new Error('Failed to initialize payment session');
}

/**
 * Authorize payment (for manual capture flow)
 */
export async function authorizePayment(
  paymentCollectionId: string,
  sessionId: string
): Promise<{ payment_session: PaymentSession }> {
  return apiClient.post(`/store/payment-collections/${paymentCollectionId}/payment-sessions/${sessionId}/authorize`);
}

/**
 * Get Stripe client secret for payment
 */
export async function getStripeClientSecret(paymentCollectionId: string): Promise<{ client_secret: string }> {
  // The client secret is usually in the payment session data
  const response = await apiClient.get<{ payment_collection: { payment_sessions?: Array<{ data?: { client_secret?: string } }> } }>(`/store/payment-collections/${paymentCollectionId}`);
  
  const paymentSession = response.payment_collection?.payment_sessions?.[0];
  if (!paymentSession?.data?.client_secret) {
    throw new Error('No client secret found');
  }

  return { client_secret: paymentSession.data.client_secret };
}

/**
 * Full payment flow helper
 * 1. Create payment collection
 * 2. Initialize payment session with Stripe
 * 3. Return client secret for Stripe Elements
 */
export async function initializeStripePayment(cartId?: string): Promise<{
  paymentCollectionId: string;
  clientSecret: string;
}> {
  const id = cartId || getStoredCartId();
  if (!id) throw new Error('No cart found');

  // Step 1: Create payment collection
  const { payment_collection } = await createPaymentCollection(id);
  console.log('Payment collection created:', payment_collection?.id);

  // Step 2: Initialize Stripe payment session
  const { payment_session } = await initializePaymentSession(
    payment_collection.id,
    'pp_stripe_stripe'
  );
  console.log('Payment session:', payment_session);

  // Step 3: Get client secret - check various locations
  const clientSecret = 
    payment_session?.data?.client_secret || 
    (payment_session as any)?.client_secret ||
    (payment_session as any)?.data?.clientSecret;
    
  if (!clientSecret) {
    console.error('Payment session data:', payment_session);
    throw new Error('Failed to get Stripe client secret from payment session');
  }

  return {
    paymentCollectionId: payment_collection.id,
    clientSecret,
  };
}

/**
 * Pay with a saved payment method (Stripe)
 * Uses an existing saved card to make payment via server endpoint
 */
export async function payWithSavedCard(
  paymentMethodId: string,
  cartId?: string
): Promise<{
  success: boolean;
  paymentIntentId?: string;
  paymentCollectionId?: string;
  requiresAction?: boolean;
  clientSecret?: string;
  error?: string;
}> {
  const id = cartId || getStoredCartId();
  if (!id) throw new Error('No cart found');

  const payload = {
    payment_method_id: paymentMethodId,
    cart_id: id,
  };

  console.log('Sending request to /store/customer/pay-with-saved-card');
  console.log('Payload:', payload);

  try {
    const response = await apiClient.post<{
      success: boolean;
      payment_intent_id?: string;
      payment_collection_id?: string;
      requires_action?: boolean;
      payment_intent_client_secret?: string;
      error?: string;
    }>('/store/customer/pay-with-saved-card', payload);

    console.log('Server response:', response);

    if (response.error === 'You cannot confirm this PaymentIntent because it has already succeeded after being previously confirmed.') {
      console.warn('PaymentIntent has already succeeded. Skipping confirmation.');
      return {
        success: true,
        paymentIntentId: response.payment_intent_id,
        paymentCollectionId: response.payment_collection_id,
        clientSecret: response.payment_intent_client_secret,
      };
    }

    return {
      success: response.success,
      paymentIntentId: response.payment_intent_id,
      paymentCollectionId: response.payment_collection_id,
      requiresAction: response.requires_action,
      clientSecret: response.payment_intent_client_secret,
      error: response.error,
    };
  } catch (error) {
    console.error('Error during payWithSavedCard:', error);
    throw error;
  }
}
