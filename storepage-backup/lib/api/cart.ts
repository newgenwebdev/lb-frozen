import { medusa } from './medusa'

// Constants
const CART_ID_KEY = 'lb-frozen-cart-id'
const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY || ''

// Field expansion for cart queries - ensures items are fully populated
// Including variant.prices for wholesale tier information and inventory_quantity for stock validation
// +items.subtitle for variant size/option display (set by our custom add-line-item endpoint)
const CART_FIELDS = '+items,+items.subtitle,+items.variant,+items.variant.product,+items.variant.prices,+items.variant.inventory_quantity,+items.variant.options,+items.variant.options.option,+items.adjustments,+shipping_address,+billing_address,+shipping_methods,+payment_collection,+payment_collection.payment_sessions'

// ============================================================================
// Types
// ============================================================================

export type MedusaLineItemAdjustment = {
  id: string
  item_id: string
  code: string | null
  amount: number
  description: string | null
  promotion_id: string | null
}

export type MedusaCartLineItem = {
  id: string
  title: string
  subtitle: string | null
  thumbnail: string | null
  quantity: number
  unit_price: number
  variant_id: string
  product_id: string
  variant_title?: string // Size/option value (e.g., "100 ml")
  product_title?: string
  product_handle?: string // URL handle for product detail page
  adjustments?: MedusaLineItemAdjustment[] // Line item adjustments (discounts)
  variant?: {
    id: string
    title: string
    sku: string | null
    inventory_quantity?: number // Available stock for this variant
    product?: {
      id: string
      title: string
      handle: string
      thumbnail: string | null
    }
    prices?: Array<{
      amount: number
      currency_code: string
      min_quantity?: number | null
      max_quantity?: number | null
    }>
    options?: Array<{
      value: string
      option?: {
        id: string
        title: string
      }
    }>
  }
  product?: {
    id: string
    title: string
    handle: string
    thumbnail: string | null
  }
  metadata?: Record<string, unknown>
}

export type MedusaCartAddress = {
  first_name?: string
  last_name?: string
  address_1?: string
  address_2?: string
  city?: string
  province?: string
  postal_code?: string
  country_code?: string
  phone?: string
}

export type MedusaShippingOption = {
  id: string
  name: string
  amount: number
  price_type: string
  data?: Record<string, unknown>
}

export type MedusaPaymentCollection = {
  id: string
  status: string
  amount: number
  currency_code: string
  payment_sessions?: Array<{
    id: string
    provider_id: string
    status: string
    amount: number
    data?: Record<string, unknown>
  }>
}

export type MedusaCart = {
  id: string
  email?: string
  customer_id?: string
  region_id?: string
  currency_code?: string
  items?: MedusaCartLineItem[]
  shipping_address?: MedusaCartAddress
  billing_address?: MedusaCartAddress
  shipping_methods?: Array<{
    id: string
    shipping_option_id: string
    amount: number
    data?: Record<string, unknown>
  }>
  payment_collection?: MedusaPaymentCollection
  subtotal?: number
  shipping_total?: number
  tax_total?: number
  discount_total?: number
  total?: number
  item_total?: number
  metadata?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export type AddToCartInput = {
  variant_id: string
  quantity: number
  metadata?: Record<string, unknown>
}

export type UpdateLineItemInput = {
  quantity: number
  metadata?: Record<string, unknown>
}

// ============================================================================
// Cart ID Management
// ============================================================================

/**
 * Get the stored cart ID from localStorage
 */
export function getStoredCartId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(CART_ID_KEY)
}

/**
 * Store cart ID in localStorage
 */
export function setStoredCartId(cartId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(CART_ID_KEY, cartId)
}

/**
 * Clear cart ID from localStorage
 */
export function clearStoredCartId(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CART_ID_KEY)
}

// ============================================================================
// Region Helper
// ============================================================================

/**
 * Get the default region ID for cart creation
 */
async function getDefaultRegionId(): Promise<string> {
  const response = await medusa.store.region.list()
  const region = response.regions?.[0]
  if (!region) {
    throw new Error('No regions configured')
  }
  return region.id
}

// ============================================================================
// Cart Operations
// ============================================================================

/**
 * Create a new cart
 */
export async function createCart(): Promise<MedusaCart> {
  const regionId = await getDefaultRegionId()

  const response = await medusa.store.cart.create({
    region_id: regionId,
  })

  const cart = response.cart as MedusaCart
  setStoredCartId(cart.id)

  return cart
}

/**
 * Get an existing cart by ID
 */
export async function getCart(cartId: string): Promise<MedusaCart | null> {
  try {
    const response = await medusa.store.cart.retrieve(cartId, {
      fields: CART_FIELDS,
    })

    return response.cart as MedusaCart
  } catch (error) {
    // Cart might not exist anymore
    console.error('Failed to retrieve cart:', error)
    return null
  }
}

/**
 * Get or create a cart
 * Returns existing cart if cart ID is stored and valid, otherwise creates new cart
 */
export async function getOrCreateCart(): Promise<MedusaCart> {
  const storedCartId = getStoredCartId()

  if (storedCartId) {
    const existingCart = await getCart(storedCartId)
    if (existingCart) {
      return existingCart
    }
    // Cart doesn't exist anymore, clear stored ID
    clearStoredCartId()
  }

  // Create new cart
  return createCart()
}

/**
 * Add item to cart using custom endpoint that applies variant discounts
 * This endpoint checks variant metadata for discount and applies it to unit_price
 */
export async function addLineItem(
  cartId: string,
  input: AddToCartInput
): Promise<MedusaCart> {
  // Use custom endpoint that applies variant discounts and bulk pricing
  const response = await fetch(`${BACKEND_URL}/store/cart/${cartId}/line-items`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-publishable-api-key': PUBLISHABLE_API_KEY,
    },
    body: JSON.stringify({
      variant_id: input.variant_id,
      quantity: input.quantity,
      metadata: input.metadata,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || 'Failed to add item to cart')
  }

  const data = await response.json()

  // Re-fetch cart with full fields to ensure proper data structure
  const cart = await getCart(cartId)
  if (!cart) {
    throw new Error('Failed to retrieve cart after adding item')
  }

  return cart
}

/**
 * Update line item quantity using custom endpoint that recalculates pricing
 * This endpoint handles both bulk pricing and variant discounts
 */
export async function updateLineItem(
  cartId: string,
  lineItemId: string,
  input: UpdateLineItemInput
): Promise<MedusaCart> {
  // Use custom endpoint that recalculates bulk pricing and variant discounts
  const response = await fetch(`${BACKEND_URL}/store/cart/${cartId}/line-items/${lineItemId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-publishable-api-key': PUBLISHABLE_API_KEY,
    },
    body: JSON.stringify({
      quantity: input.quantity,
      metadata: input.metadata,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || 'Failed to update line item')
  }

  // Re-fetch cart with full fields to ensure proper data structure
  const cart = await getCart(cartId)
  if (!cart) {
    throw new Error('Failed to retrieve cart after updating item')
  }

  return cart
}

/**
 * Remove line item from cart using custom endpoint
 */
export async function removeLineItem(
  cartId: string,
  lineItemId: string
): Promise<MedusaCart> {
  // Use custom endpoint
  const response = await fetch(`${BACKEND_URL}/store/cart/${cartId}/line-items/${lineItemId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-publishable-api-key': PUBLISHABLE_API_KEY,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || 'Failed to remove line item')
  }

  // Re-fetch cart with full fields to ensure proper data structure
  const cart = await getCart(cartId)
  if (!cart) {
    throw new Error('Failed to retrieve cart after removing item')
  }

  return cart
}

/**
 * Update cart (email, shipping address, etc.)
 */
export async function updateCart(
  cartId: string,
  data: {
    email?: string
    shipping_address?: MedusaCartAddress
    billing_address?: MedusaCartAddress
    metadata?: Record<string, unknown>
  }
): Promise<MedusaCart> {
  const response = await medusa.store.cart.update(cartId, data)

  return response.cart as MedusaCart
}

/**
 * Get available shipping options for a cart
 */
export async function getShippingOptions(cartId: string): Promise<MedusaShippingOption[]> {
  const response = await medusa.store.fulfillment.listCartOptions({
    cart_id: cartId,
  })

  return (response.shipping_options || []) as MedusaShippingOption[]
}

/**
 * Add shipping method to cart
 */
export async function addShippingMethod(
  cartId: string,
  shippingOptionId: string
): Promise<MedusaCart> {
  const response = await medusa.store.cart.addShippingMethod(cartId, {
    option_id: shippingOptionId,
  })

  return response.cart as MedusaCart
}

/**
 * Complete cart and create order
 * This should be called after payment is confirmed
 */
export async function completeCart(cartId: string): Promise<{ order: unknown; cart: MedusaCart }> {
  const response = await medusa.store.cart.complete(cartId)

  // Clear cart ID after successful order
  if (response.type === 'order') {
    clearStoredCartId()
  }

  return {
    order: response.type === 'order' ? response.order : null,
    cart: response.type === 'cart' ? (response.cart as MedusaCart) : (null as unknown as MedusaCart),
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate the effective price of a line item after adjustments
 * Handles PWP items, variant discounts, and regular adjustments
 */
export function getLineItemEffectivePrice(item: MedusaCartLineItem): number {
  // Check if this is a PWP item - use metadata discount which persists
  if (item.metadata?.is_pwp_item && item.metadata?.pwp_discount_amount) {
    const discountAmount = Number(item.metadata.pwp_discount_amount) || 0
    return item.unit_price - discountAmount
  }

  // Check for variant discount (Set Discount Global from admin)
  // If variant discount metadata exists, calculate price from original - discount
  if (item.metadata?.is_variant_discount && item.metadata?.variant_discount_amount) {
    const discountAmount = Number(item.metadata.variant_discount_amount) || 0
    const originalPrice = Number(item.metadata.original_unit_price) || item.unit_price
    // Return the discounted price
    return Math.max(0, originalPrice - discountAmount)
  }

  // For non-PWP, non-variant-discount items, use adjustments
  const totalAdjustments = (item.adjustments || []).reduce((sum, adj) => sum + adj.amount, 0)
  return item.unit_price - totalAdjustments
}

/**
 * Calculate cart totals from items
 * Useful for optimistic UI updates
 */
export function calculateCartTotals(items: MedusaCartLineItem[]): {
  subtotal: number
  itemCount: number
} {
  const subtotal = items.reduce((sum, item) => {
    const effectivePrice = getLineItemEffectivePrice(item)
    return sum + effectivePrice * item.quantity
  }, 0)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return { subtotal, itemCount }
}

/**
 * Get size/option value from line item
 */
export function getLineItemOptionValue(
  item: MedusaCartLineItem,
  optionTitle: string
): string | undefined {
  if (!item.variant?.options) return undefined
  const opt = item.variant.options.find((o) => o.option?.title === optionTitle)
  return opt?.value
}

/**
 * Format price from cents to display format
 */
export function formatPrice(amountInCents: number, currencyCode: string = 'SGD'): string {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: currencyCode,
  }).format(amountInCents / 100)
}

/**
 * Transfer cart to logged-in customer
 * This links the current guest cart to the authenticated customer
 */
export async function transferCartToCustomer(cartId: string): Promise<MedusaCart | null> {
  try {
    const response = await medusa.store.cart.transferCart(cartId)
    return response.cart as MedusaCart
  } catch (error) {
    // Transfer might fail if cart is already linked or customer not authenticated
    console.warn('Cart transfer failed:', error)
    return null
  }
}

/**
 * Wholesale tier information for a line item
 */
export type LineItemWholesaleTier = {
  minQty: number
  maxQty: number | null
  tierPrice: number // price per unit in this tier (cents)
  basePrice: number // base price per unit (cents)
  savings: number // percentage savings
  isActive: boolean
}

/**
 * Get wholesale tier info for a line item
 * Returns information about the applied tier if any
 */
export function getLineItemWholesaleInfo(item: MedusaCartLineItem): {
  hasTiers: boolean
  activeTier: LineItemWholesaleTier | null
  basePrice: number
  allTiers: LineItemWholesaleTier[]
} {
  const prices = item.variant?.prices
  if (!prices || prices.length === 0) {
    return {
      hasTiers: false,
      activeTier: null,
      basePrice: item.unit_price,
      allTiers: [],
    }
  }

  // Find base price (no min_quantity or min_quantity <= 1)
  const basePriceEntry = prices.find((p) => !p.min_quantity || p.min_quantity <= 1)
  const basePrice = basePriceEntry?.amount || prices[0].amount

  // Get wholesale tiers (min_quantity > 1)
  const wholesalePrices = prices
    .filter((p) => p.min_quantity && p.min_quantity > 1)
    .sort((a, b) => (a.min_quantity || 0) - (b.min_quantity || 0))

  if (wholesalePrices.length === 0) {
    return {
      hasTiers: false,
      activeTier: null,
      basePrice,
      allTiers: [],
    }
  }

  // Build tier list with active status
  const allTiers: LineItemWholesaleTier[] = wholesalePrices.map((p) => {
    const minQty = p.min_quantity || 1
    const maxQty = p.max_quantity || null
    const isActive =
      item.quantity >= minQty && (maxQty === null || item.quantity <= maxQty)

    return {
      minQty,
      maxQty,
      tierPrice: p.amount,
      basePrice,
      savings: basePrice > 0 ? Math.round((1 - p.amount / basePrice) * 100) : 0,
      isActive,
    }
  })

  // Find the active tier (highest tier where quantity >= minQty)
  const activeTier =
    [...allTiers].reverse().find((t) => item.quantity >= t.minQty) || null

  return {
    hasTiers: true,
    activeTier,
    basePrice,
    allTiers,
  }
}
