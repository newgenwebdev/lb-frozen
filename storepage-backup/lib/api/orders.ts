import { getStoredAuthToken } from './customer'

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY || ''

// ============================================================================
// Types
// ============================================================================

export type MedusaOrderItem = {
  id: string
  title: string
  subtitle: string | null
  thumbnail: string | null
  variant_id: string | null
  product_id: string | null
  quantity: number
  unit_price: number
  subtotal: number
  total: number
  original_total: number
  discount_total: number
  tax_total: number
  variant?: {
    id: string
    title: string
    sku: string | null
    product?: {
      id: string
      title: string
      handle: string
      thumbnail: string | null
    }
  }
  metadata?: Record<string, unknown>
}

export type MedusaOrderAddress = {
  id: string
  first_name: string
  last_name: string
  company: string | null
  address_1: string
  address_2: string | null
  city: string
  province: string | null
  postal_code: string
  country_code: string
  phone: string | null
}

export type MedusaShippingMethod = {
  id: string
  name: string
  amount: number
  data?: Record<string, unknown>
}

export type MedusaPayment = {
  id: string
  amount: number
  currency_code: string
  provider_id: string
  data?: Record<string, unknown>
}

export type MedusaOrder = {
  id: string
  display_id: number
  status: 'pending' | 'completed' | 'archived' | 'canceled' | 'requires_action'
  fulfillment_status: 'not_fulfilled' | 'partially_fulfilled' | 'fulfilled' | 'partially_shipped' | 'shipped' | 'partially_delivered' | 'delivered' | 'canceled'
  payment_status: 'not_paid' | 'awaiting' | 'captured' | 'partially_refunded' | 'refunded' | 'canceled' | 'requires_action'
  email: string
  currency_code: string
  subtotal: number
  item_subtotal?: number // Items subtotal (without shipping)
  shipping_total: number
  discount_total: number
  tax_total: number
  total: number
  items?: MedusaOrderItem[]
  shipping_address?: MedusaOrderAddress
  billing_address?: MedusaOrderAddress
  shipping_methods?: MedusaShippingMethod[]
  payments?: MedusaPayment[]
  // Tracking info
  courier?: string | null
  tracking_number?: string | null
  created_at: string
  updated_at: string
  metadata?: Record<string, unknown>
}

export type OrderListParams = {
  limit?: number
  offset?: number
}

// ============================================================================
// Order Operations
// ============================================================================

/**
 * Get customer's orders
 * Requires customer to be authenticated
 * Uses custom endpoint that includes fulfillment_status from order-extension
 */
export async function getCustomerOrders(
  params?: OrderListParams
): Promise<{ orders: MedusaOrder[]; count: number }> {
  // Get auth token from localStorage
  const token = getStoredAuthToken()

  if (!token) {
    return { orders: [], count: 0 }
  }

  const queryParams = new URLSearchParams()
  queryParams.set('limit', String(params?.limit || 10))
  queryParams.set('offset', String(params?.offset || 0))

  const response = await fetch(`${BACKEND_URL}/store/customer-orders?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-publishable-api-key': PUBLISHABLE_API_KEY,
    },
    credentials: 'include',
  })

  if (!response.ok) {
    return { orders: [], count: 0 }
  }

  const data = await response.json()

  return {
    orders: (data.orders || []) as MedusaOrder[],
    count: data.count || 0,
  }
}

/**
 * Get order by ID
 * Customer can only access their own orders
 * Uses custom endpoint that includes fulfillment_status from order-extension
 */
export async function getOrderById(orderId: string): Promise<MedusaOrder | null> {
  try {
    // Get auth token from localStorage
    const token = getStoredAuthToken()

    if (!token) {
      return null
    }

    const response = await fetch(`${BACKEND_URL}/store/customer-orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-publishable-api-key': PUBLISHABLE_API_KEY,
      },
      credentials: 'include',
    })

    if (!response.ok) {
      console.error('Failed to retrieve order:', response.status)
      return null
    }

    const data = await response.json()
    return data.order as MedusaOrder
  } catch (error) {
    console.error('Failed to retrieve order:', error)
    return null
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get display status for order
 * Maps order statuses to user-friendly display text matching admin dashboard
 * Handles both Medusa default values and custom extension values
 */
export function getOrderDisplayStatus(order: MedusaOrder): string {
  // Check if order is cancelled first (handles both 'canceled' and 'cancelled' spellings)
  if (order.status === 'canceled' || order.fulfillment_status === 'canceled' || (order.fulfillment_status as string) === 'cancelled') {
    return 'Cancelled'
  }

  // Check fulfillment status (shipping progress)
  // Handles both Medusa defaults and custom extension values
  if (order.fulfillment_status === 'delivered' || order.fulfillment_status === 'partially_delivered') {
    return 'Delivered'
  }
  if (order.fulfillment_status === 'shipped' || order.fulfillment_status === 'partially_shipped') {
    return 'In Shipping'
  }
  if (order.fulfillment_status === 'fulfilled' || order.fulfillment_status === 'partially_fulfilled') {
    return 'Fulfilled'
  }
  // Handle 'processing' status from extension
  if ((order.fulfillment_status as string) === 'processing') {
    return 'Processing'
  }

  // Check payment status (before shipping)
  if (order.payment_status === 'awaiting' || order.payment_status === 'not_paid') {
    return 'Awaiting Payment'
  }
  if (order.payment_status === 'requires_action') {
    return 'Payment Required'
  }
  if (order.payment_status === 'refunded') {
    return 'Refunded'
  }
  if (order.payment_status === 'partially_refunded') {
    return 'Partially Refunded'
  }

  // Check if order is completed
  if (order.status === 'completed') {
    return 'Completed'
  }

  // If payment is captured/paid but not yet shipped (unfulfilled or not_fulfilled)
  if (order.payment_status === 'captured' &&
      (order.fulfillment_status === 'not_fulfilled' || (order.fulfillment_status as string) === 'unfulfilled')) {
    return 'Waiting for Shipping'
  }

  // Default: order is pending/processing
  return 'Processing'
}

/**
 * Format order date
 */
export function formatOrderDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Format price from cents
 */
export function formatOrderPrice(amountInCents: number, currencyCode: string = 'SGD'): string {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: currencyCode,
  }).format(amountInCents / 100)
}

/**
 * Check if an order item is a PWP item
 */
export function isOrderItemPWP(item: MedusaOrderItem): boolean {
  return item.metadata?.is_pwp_item === true
}

/**
 * Check if an order item has a variant discount (Set Discount Global from admin)
 */
export function isOrderItemVariantDiscount(item: MedusaOrderItem): boolean {
  return item.metadata?.is_variant_discount === true
}

/**
 * Get effective price for an order item (after PWP discount or variant discount)
 * PWP discount and variant discount are stored in item metadata since adjustments may be cleared
 * Priority: PWP > Variant discount > unit_price
 */
export function getOrderItemEffectivePrice(item: MedusaOrderItem): number {
  // Check for PWP discount first
  if (item.metadata?.is_pwp_item && item.metadata?.pwp_discount_amount) {
    const discountAmount = Number(item.metadata.pwp_discount_amount) || 0
    return item.unit_price - discountAmount
  }

  // Check for variant discount (Set Discount Global from admin)
  // Use getOrderItemOriginalPrice to handle missing original_unit_price
  if (item.metadata?.is_variant_discount && item.metadata?.variant_discount_amount) {
    const discountAmount = Number(item.metadata.variant_discount_amount) || 0
    const originalPrice = getOrderItemOriginalPrice(item)
    return Math.max(0, originalPrice - discountAmount)
  }

  return item.unit_price
}

/**
 * Get the original price for an order item (before any discount)
 * Returns the original price if available in metadata, otherwise returns unit_price
 */
export function getOrderItemOriginalPrice(item: MedusaOrderItem): number {
  // If original_unit_price exists in metadata, use it
  if (item.metadata?.original_unit_price) {
    return Number(item.metadata.original_unit_price)
  }

  // For variant discount items without original_unit_price, calculate from unit_price + discount
  // This handles cases where the order was created before original_unit_price was stored
  if (item.metadata?.is_variant_discount && item.metadata?.variant_discount_amount) {
    return item.unit_price + Number(item.metadata.variant_discount_amount)
  }

  // For PWP items, original price is the unit_price (PWP discount is subtracted from it)
  // No need for special handling

  return item.unit_price
}

/**
 * Get the discounted price for an order item (after variant/wholesale discount)
 * This calculates the correct price regardless of what's stored in unit_price
 * Use this for displaying the current (discounted) price of items
 */
export function getOrderItemDiscountedPrice(item: MedusaOrderItem): number {
  // For variant discount items, calculate from original - discount
  if (item.metadata?.is_variant_discount && item.metadata?.variant_discount_amount) {
    const originalPrice = getOrderItemOriginalPrice(item)
    const discountAmount = Number(item.metadata.variant_discount_amount) || 0
    return Math.max(0, originalPrice - discountAmount)
  }

  // For wholesale tier items or regular items, unit_price is the current price
  return item.unit_price
}

/**
 * Download invoice PDF for an order
 * Returns true if download was successful, false otherwise
 */
export async function downloadOrderInvoice(orderId: string, displayId: number): Promise<boolean> {
  try {
    const token = getStoredAuthToken()

    if (!token) {
      console.error('[INVOICE] No auth token found')
      return false
    }

    const response = await fetch(`${BACKEND_URL}/store/customer-orders/${orderId}/invoice`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-publishable-api-key': PUBLISHABLE_API_KEY,
      },
      credentials: 'include',
    })

    if (!response.ok) {
      console.error('[INVOICE] Failed to download invoice:', response.status)
      return false
    }

    // Get the PDF blob
    const blob = await response.blob()

    // Create download link
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `invoice-${displayId}.pdf`
    document.body.appendChild(link)
    link.click()

    // Cleanup
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    return true
  } catch (error) {
    console.error('[INVOICE] Failed to download invoice:', error)
    return false
  }
}
