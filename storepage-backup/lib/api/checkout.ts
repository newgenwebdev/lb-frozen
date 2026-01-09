import { medusa } from './medusa'
import type { MedusaCart, MedusaCartAddress } from './cart'

// ============================================================================
// Types
// ============================================================================

export type PaymentSession = {
  id: string
  provider_id: string
  status: string
  amount: number
  currency_code: string
  data: Record<string, unknown>
}

export type PaymentCollection = {
  id: string
  status: string
  amount: number
  currency_code: string
  payment_sessions?: PaymentSession[]
}

export type ShippingOption = {
  id: string
  name: string
  amount: number
  price_type: string
  provider_id: string
  data?: Record<string, unknown>
}

export type MedusaOrder = {
  id: string
  display_id: number
  status: string
  email: string
  currency_code: string
  subtotal: number
  shipping_total: number
  tax_total: number
  discount_total: number
  total: number
  items: Array<{
    id: string
    title: string
    quantity: number
    unit_price: number
    thumbnail: string | null
  }>
  shipping_address: MedusaCartAddress
  billing_address: MedusaCartAddress
  created_at: string
}

export type CreatePaymentIntentResponse = {
  client_secret: string
  payment_intent_id: string
}

// ============================================================================
// Checkout Operations
// ============================================================================

/**
 * Update cart with customer email
 */
export async function setCartEmail(cartId: string, email: string): Promise<MedusaCart> {
  const response = await medusa.store.cart.update(cartId, { email })
  return response.cart as MedusaCart
}

/**
 * Update cart shipping address
 */
export async function setShippingAddress(
  cartId: string,
  address: MedusaCartAddress
): Promise<MedusaCart> {
  const response = await medusa.store.cart.update(cartId, {
    shipping_address: address,
  })
  return response.cart as MedusaCart
}

/**
 * Update cart billing address
 */
export async function setBillingAddress(
  cartId: string,
  address: MedusaCartAddress
): Promise<MedusaCart> {
  const response = await medusa.store.cart.update(cartId, {
    billing_address: address,
  })
  return response.cart as MedusaCart
}

/**
 * Get available shipping options for cart
 */
export async function getShippingOptions(cartId: string): Promise<ShippingOption[]> {
  const response = await medusa.store.fulfillment.listCartOptions({
    cart_id: cartId,
  })
  return (response.shipping_options || []) as ShippingOption[]
}

/**
 * Add shipping method to cart
 */
export async function addShippingMethod(
  cartId: string,
  optionId: string,
  data?: Record<string, unknown>
): Promise<MedusaCart> {
  const response = await medusa.store.cart.addShippingMethod(cartId, {
    option_id: optionId,
    data,
  })
  return response.cart as MedusaCart
}

/**
 * Create payment collection for cart
 * In Medusa 2.x, the payment collection must be created explicitly before checkout
 * Returns the payment collection and any existing client_secret if a Stripe session already exists
 *
 * IMPORTANT: This function first checks if a payment collection already exists for the cart
 * to prevent duplicate payment collections (which cause checkout to fail - GitHub issue #11235)
 */
export async function createPaymentCollection(cartId: string): Promise<{
  paymentCollection: PaymentCollection
  existingClientSecret: string | null
}> {
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY || ''

  // First, fetch the cart to check if payment collection already exists
  // This prevents duplicate payment collections which break checkout
  try {
    const cartResponse = await fetch(`${backendUrl}/store/carts/${cartId}?fields=*payment_collection,*payment_collection.payment_sessions`, {
      headers: {
        'x-publishable-api-key': publishableKey,
      },
    })

    if (cartResponse.ok) {
      const cartData = await cartResponse.json()
      const existingPaymentCollection = cartData.cart?.payment_collection

      if (existingPaymentCollection && existingPaymentCollection.id) {
        console.log('[createPaymentCollection] Found existing payment collection:', existingPaymentCollection.id)

        // Check if there's already a Stripe payment session with client_secret
        const existingStripeSession = existingPaymentCollection.payment_sessions?.find(
          (session: PaymentSession) => session.provider_id === 'pp_stripe_stripe'
        )
        const existingClientSecret = existingStripeSession?.data?.client_secret as string | null || null

        console.log('[createPaymentCollection] Existing sessions:', existingPaymentCollection.payment_sessions?.length || 0)
        console.log('[createPaymentCollection] Existing client_secret:', existingClientSecret ? 'yes' : 'no')

        return {
          paymentCollection: existingPaymentCollection as PaymentCollection,
          existingClientSecret,
        }
      }
    }
  } catch (err) {
    console.warn('[createPaymentCollection] Failed to check for existing payment collection:', err)
    // Continue to create a new one
  }

  // No existing payment collection, create a new one
  console.log('[createPaymentCollection] No existing payment collection found, creating new one...')

  const response = await fetch(`${backendUrl}/store/payment-collections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-publishable-api-key': publishableKey,
    },
    body: JSON.stringify({
      cart_id: cartId,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create payment collection')
  }

  const data = await response.json()
  const paymentCollection = data.payment_collection as PaymentCollection

  // Check if there's already a Stripe payment session with client_secret
  const existingStripeSession = paymentCollection.payment_sessions?.find(
    (session) => session.provider_id === 'pp_stripe_stripe'
  )
  const existingClientSecret = existingStripeSession?.data?.client_secret as string | null || null

  console.log('[createPaymentCollection] Created new payment collection:', paymentCollection.id)
  console.log('[createPaymentCollection] Sessions:', paymentCollection.payment_sessions?.length || 0)
  console.log('[createPaymentCollection] Client_secret:', existingClientSecret ? 'yes' : 'no')

  return {
    paymentCollection,
    existingClientSecret,
  }
}

/**
 * Initialize payment session on a payment collection
 * This must be called after creating the payment collection
 * @param paymentCollectionId - The payment collection ID
 * @param useStripe - Whether to use Stripe (true) or manual payment (false)
 */
export async function initializePaymentSession(
  paymentCollectionId: string,
  useStripe: boolean = false
): Promise<{
  paymentCollection: PaymentCollection | null
  clientSecret: string | null
}> {
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY || ''

  const providerId = useStripe ? 'pp_stripe_stripe' : 'pp_system_default'

  const response = await fetch(`${backendUrl}/store/payment-collections/${paymentCollectionId}/payment-sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-publishable-api-key': publishableKey,
    },
    body: JSON.stringify({
      provider_id: providerId,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to initialize payment session')
  }

  const data = await response.json()

  // Extract client_secret from Stripe payment session data
  const clientSecret = data.payment_collection?.payment_sessions?.[0]?.data?.client_secret || null

  return {
    paymentCollection: data.payment_collection as PaymentCollection || null,
    clientSecret,
  }
}

/**
 * Update payment amount to the correct total
 * This MUST be called after initializePaymentSession but before the customer pays.
 *
 * Medusa's payment collection uses the cart's raw total, which doesn't include
 * custom discounts stored in metadata (PWP, tier discount, points, free shipping).
 * This endpoint updates the Stripe PaymentIntent to the correct discounted amount.
 *
 * @param paymentCollectionId - The payment collection ID
 * @param cartId - The cart ID (for validation)
 * @param amount - The correct total amount in cents (from frontend calculation)
 */
export async function updatePaymentAmount(
  paymentCollectionId: string,
  cartId: string,
  amount: number
): Promise<{
  success: boolean
  previous_amount?: number
  new_amount?: number
  currency?: string
}> {
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY || ''

  const response = await fetch(`${backendUrl}/store/payment-collections/${paymentCollectionId}/update-amount`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-publishable-api-key': publishableKey,
    },
    body: JSON.stringify({
      cart_id: cartId,
      amount: amount,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to update payment amount')
  }

  return response.json()
}

/**
 * Create payment intent for Stripe
 * This is called after initializing the payment session
 */
export async function createStripePaymentIntent(
  cartId: string
): Promise<CreatePaymentIntentResponse> {
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY || ''

  const response = await fetch(`${backendUrl}/store/payment-collections/${cartId}/payment-sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-publishable-api-key': publishableKey,
    },
    body: JSON.stringify({
      provider_id: 'pp_stripe_stripe',
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create payment intent')
  }

  const data = await response.json()
  return {
    client_secret: data.payment_session?.data?.client_secret || '',
    payment_intent_id: data.payment_session?.data?.id || '',
  }
}

/**
 * Complete cart after successful payment
 * This creates the order in Medusa
 */
export async function completeCheckout(cartId: string): Promise<{
  order: MedusaOrder | null
  type: 'order' | 'cart'
}> {
  // Debug: Log cart state before completing
  console.log('[Checkout] Completing cart:', cartId)

  const response = await medusa.store.cart.complete(cartId)

  // Debug: Log the response
  console.log('[Checkout] Complete response type:', response.type)

  if (response.type === 'order') {
    const order = response.order as MedusaOrder

    // Debug: Log order details to see if coupon data is present
    console.log('[Checkout] Order created:', {
      id: order.id,
      display_id: order.display_id,
      subtotal: order.subtotal,
      discount_total: order.discount_total,
      total: order.total,
    })

    // Auto-capture payment for manual payment provider
    // This marks the order as "paid" since we're not using a real payment gateway
    try {
      await captureOrderPayment(order.id)
    } catch (error) {
      // Log but don't fail - order is still created
      console.warn('Failed to auto-capture payment:', error)
    }

    return {
      order,
      type: 'order',
    }
  }

  return {
    order: null,
    type: 'cart',
  }
}

/**
 * Capture payment for an order
 * This marks the order payment as captured/paid
 * Used for manual payment provider to auto-mark orders as paid
 */
export async function captureOrderPayment(orderId: string): Promise<void> {
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY || ''

  // Get the order's payment collections to find the payment to capture
  const orderResponse = await fetch(`${backendUrl}/store/orders/${orderId}?fields=*payment_collections,*payment_collections.payments`, {
    headers: {
      'x-publishable-api-key': publishableKey,
    },
  })

  if (!orderResponse.ok) {
    throw new Error('Failed to get order payment info')
  }

  const orderData = await orderResponse.json()
  const paymentCollections = orderData.order?.payment_collections || []

  // Find payments that need to be captured
  for (const collection of paymentCollections) {
    const payments = collection.payments || []
    for (const payment of payments) {
      if (payment.captured_at === null) {
        // Capture this payment via admin API (store API doesn't have capture endpoint)
        // For now, we'll need a custom endpoint on the server
        await fetch(`${backendUrl}/store/orders/${orderId}/capture-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-publishable-api-key': publishableKey,
          },
          body: JSON.stringify({ payment_id: payment.id }),
        })
      }
    }
  }
}

/**
 * Get order by ID
 */
export async function getOrder(orderId: string): Promise<MedusaOrder | null> {
  try {
    const response = await medusa.store.order.retrieve(orderId)
    return response.order as MedusaOrder
  } catch (error) {
    console.error('Failed to retrieve order:', error)
    return null
  }
}

// ============================================================================
// Checkout Flow Helper
// ============================================================================

export type CheckoutData = {
  email: string
  shippingAddress: MedusaCartAddress
  billingAddress?: MedusaCartAddress
  shippingOptionId: string
}

/**
 * Prepare cart for checkout
 * Updates cart with all required information before payment
 */
export async function prepareCartForCheckout(
  cartId: string,
  data: CheckoutData
): Promise<MedusaCart> {
  // Update email
  await setCartEmail(cartId, data.email)

  // Update shipping address
  await setShippingAddress(cartId, data.shippingAddress)

  // Update billing address (same as shipping if not provided)
  const billingAddress = data.billingAddress || data.shippingAddress
  await setBillingAddress(cartId, billingAddress)

  // Add shipping method
  const updatedCart = await addShippingMethod(cartId, data.shippingOptionId)

  return updatedCart
}

// ============================================================================
// Country/Region Helpers
// ============================================================================

export type Country = {
  iso_2: string
  name: string
  display_name: string
}

/**
 * Get available countries from the current region
 */
export async function getAvailableCountries(): Promise<Country[]> {
  const response = await medusa.store.region.list()
  const regions = response.regions || []

  // Collect all countries from all regions
  const countries: Country[] = []
  for (const region of regions) {
    if (region.countries) {
      for (const country of region.countries) {
        // Skip countries with missing required fields
        if (!country.iso_2 || !country.name || !country.display_name) continue
        if (!countries.find((c) => c.iso_2 === country.iso_2)) {
          countries.push({
            iso_2: country.iso_2,
            name: country.name,
            display_name: country.display_name,
          })
        }
      }
    }
  }

  return countries.sort((a, b) => a.display_name.localeCompare(b.display_name))
}
