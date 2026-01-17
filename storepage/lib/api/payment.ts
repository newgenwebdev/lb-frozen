/**
 * Payment API Service
 * Handles payment-related operations for checkout
 */

import { apiClient } from './client';
import type { Cart, PaymentSession } from './types';
import { getStoredCartId, getCart } from './cart';

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
 * Update payment collection amount (for discounts like membership promo)
 */
export async function updatePaymentAmount(
  paymentCollectionId: string,
  cartId: string,
  amount: number
): Promise<{ success: boolean; new_amount?: number }> {
  return apiClient.post(`/store/payment-collections/${paymentCollectionId}/update-amount`, {
    cart_id: cartId,
    amount,
  });
}

/**
 * Full payment flow helper
 * 1. Create payment collection
 * 2. Initialize payment session with Stripe
 * 3. Update payment amount if there's a membership promo discount
 * 4. Return client secret for Stripe Elements
 */
export async function initializeStripePayment(cartId?: string): Promise<{
  paymentCollectionId: string;
  clientSecret: string;
}> {
  const id = cartId || getStoredCartId();
  if (!id) throw new Error('No cart found');

  // First, get the cart to check for membership promo discount
  // Use getCart which already fetches with +metadata
  const cart = await getCart(id);
  
  console.log('[STRIPE-INIT] Cart fetched:', { 
    id: cart.id, 
    total: cart.total, 
    metadata: (cart as any)?.metadata 
  });
  
  // Calculate adjusted amount (subtract membership promo discount from total)
  const membershipPromoDiscount = (cart as any)?.metadata?.applied_membership_promo_discount
    ? Number((cart as any).metadata.applied_membership_promo_discount)
    : 0;
  
  console.log('[STRIPE-INIT] Membership promo discount:', membershipPromoDiscount);
  
  // Step 1: Create payment collection
  const { payment_collection } = await createPaymentCollection(id);
  console.log('Payment collection created:', payment_collection?.id);

  // Step 2: Initialize Stripe payment session
  const { payment_session } = await initializePaymentSession(
    payment_collection.id,
    'pp_stripe_stripe'
  );
  console.log('Payment session:', payment_session);

  // Step 3: If there's a membership promo discount, update the payment amount
  console.log(`[STRIPE-INIT] Checking discount: membershipPromoDiscount=${membershipPromoDiscount}, cart.total=${cart.total}`);
  console.log(`[STRIPE-INIT] Full cart metadata:`, JSON.stringify((cart as any)?.metadata, null, 2));
  
  if (membershipPromoDiscount > 0) {
    const originalTotal = cart.total || 0;
    const adjustedTotal = Math.max(0, originalTotal - membershipPromoDiscount);
    
    console.log(`[STRIPE-INIT] *** APPLYING DISCOUNT ***`);
    console.log(`[STRIPE-INIT] Original: ${originalTotal} (RM ${(originalTotal/100).toFixed(2)})`);
    console.log(`[STRIPE-INIT] Discount: ${membershipPromoDiscount} (RM ${(membershipPromoDiscount/100).toFixed(2)})`);
    console.log(`[STRIPE-INIT] Adjusted: ${adjustedTotal} (RM ${(adjustedTotal/100).toFixed(2)})`);
    
    try {
      const updateResult = await updatePaymentAmount(payment_collection.id, id, adjustedTotal);
      console.log('[STRIPE-INIT] Payment amount update SUCCESS:', updateResult);
    } catch (error: any) {
      console.error('[STRIPE-INIT] Payment amount update FAILED:', error?.message || error);
      // Continue anyway - better to charge full price than fail completely
    }
  } else {
    console.log('[STRIPE-INIT] No membership promo discount found, skipping amount update');
  }

  // Step 4: Get client secret - check various locations
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

  console.log('[PAY-SAVED-CARD] Starting saved card payment');
  console.log('[PAY-SAVED-CARD] Cart ID:', id);
  console.log('[PAY-SAVED-CARD] Payment Method ID:', paymentMethodId);

  // Fetch cart with metadata to get membership promo discount
  const cart = await getCart(id);
  const membershipPromoDiscount = (cart as any)?.metadata?.applied_membership_promo_discount
    ? Number((cart as any).metadata.applied_membership_promo_discount)
    : 0;
  
  console.log('[PAY-SAVED-CARD] Cart metadata:', (cart as any)?.metadata);
  console.log('[PAY-SAVED-CARD] Membership promo discount:', membershipPromoDiscount);

  const payload = {
    payment_method_id: paymentMethodId,
    cart_id: id,
    // Pass discount info to backend for validation/use
    membership_promo_discount: membershipPromoDiscount,
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
