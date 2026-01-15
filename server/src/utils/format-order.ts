import { formatCustomerName } from "./format-customer"

/**
 * Convert any numeric value (number, string, BigNumber) to number
 */
function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") return value
  if (typeof value === "string") return parseFloat(value) || 0
  // Handle BigNumber objects that have a numeric property
  if (typeof value === "object" && value !== null) {
    const numValue = (value as { numeric?: number }).numeric
    if (typeof numValue === "number") return numValue
  }
  return 0
}

/**
 * Get original price before any variant discounts
 * For variant discount items, calculates original from unit_price + variant_discount_amount
 */
function getItemOriginalPrice(item: { unit_price?: unknown; metadata?: Record<string, unknown> | null }): number {
  const unitPrice = toNumber(item.unit_price)

  // Check for original_unit_price in metadata first
  if (item.metadata?.original_unit_price) {
    return toNumber(item.metadata.original_unit_price)
  }

  // For variant discount items, calculate original price from unit_price + discount
  if (item.metadata?.is_variant_discount && item.metadata?.variant_discount_amount) {
    return unitPrice + toNumber(item.metadata.variant_discount_amount)
  }

  return unitPrice
}

/**
 * Calculate order total from items using original prices (before variant discounts)
 * Uses 'any' type to handle Medusa's BigNumberValue (string | number | BigNumber)
 */
export function calculateOrderTotal(items: Array<{ unit_price?: unknown; quantity?: unknown; metadata?: Record<string, unknown> | null }> | null | undefined): number {
  return items?.reduce((sum, item) => {
    const originalPrice = getItemOriginalPrice(item)
    return sum + originalPrice * toNumber(item.quantity)
  }, 0) || 0
}

/**
 * Calculate discount total from order items' adjustments, PWP metadata, variant discounts, and wholesale/bulk discounts
 * Uses 'any' type to handle Medusa's BigNumberValue (string | number | BigNumber)
 */
export function calculateDiscountTotal(items: Array<{ unit_price?: unknown; adjustments?: Array<{ amount?: unknown }> | null; quantity?: unknown; metadata?: Record<string, unknown> | null }> | null | undefined): number {
  return items?.reduce((sum, item) => {
    // Calculate discount from adjustments
    const itemDiscount = item.adjustments?.reduce((adjSum, adj) => adjSum + toNumber(adj.amount), 0) || 0

    // Calculate PWP discount from item metadata (per item * quantity)
    let pwpDiscount = 0
    if (item.metadata?.is_pwp_item && item.metadata?.pwp_discount_amount) {
      pwpDiscount = toNumber(item.metadata.pwp_discount_amount) * toNumber(item.quantity)
    }

    // Calculate variant discount from item metadata (per item * quantity)
    let variantDiscount = 0
    if (item.metadata?.is_variant_discount && item.metadata?.variant_discount_amount) {
      variantDiscount = toNumber(item.metadata.variant_discount_amount) * toNumber(item.quantity)
    }

    // Calculate wholesale/bulk discount from item metadata (per item * quantity)
    let wholesaleDiscount = 0
    if (item.metadata?.is_bulk_price) {
      const originalPrice = getItemOriginalPrice(item)
      const currentPrice = toNumber(item.unit_price)
      wholesaleDiscount = (originalPrice - currentPrice) * toNumber(item.quantity)
    }

    return sum + itemDiscount + pwpDiscount + variantDiscount + wholesaleDiscount
  }, 0) || 0
}

/**
 * Calculate total items count
 * Uses 'any' type to handle Medusa's BigNumberValue (string | number | BigNumber)
 */
export function calculateItemsCount(items: Array<{ quantity?: unknown }> | null | undefined): number {
  return items?.reduce((sum, item) => sum + toNumber(item.quantity), 0) || 0
}

/**
 * Format order line item for API response
 */
export function formatOrderItem(
  item: {
    id: string
    variant_id?: string | null
    title?: string | null
    quantity?: number | null
    unit_price?: number | null
    metadata?: Record<string, any> | null
    [key: string]: any
  },
  variantInfo?: { thumbnail: string | null; product_name: string } | null
) {
  // Calculate effective price for PWP items (discount from metadata)
  const unitPrice = item.unit_price || 0
  let effectivePrice = unitPrice
  if (item.metadata?.is_pwp_item && item.metadata?.pwp_discount_amount) {
    const discountAmount = Number(item.metadata.pwp_discount_amount) || 0
    effectivePrice = unitPrice - discountAmount
  }

  return {
    id: item.id,
    product_id: item.product_id || "",
    variant_id: item.variant_id || "",
    product_name: item.title || variantInfo?.product_name || "Unknown Product",
    variant_title: item.variant_title || null,
    thumbnail: variantInfo?.thumbnail || null,
    quantity: item.quantity || 0,
    unit_price: unitPrice,
    effective_price: effectivePrice, // Price after PWP discount
    total: effectivePrice * (item.quantity || 0), // Total uses effective price
    sku: item.sku || null,
    metadata: item.metadata || null, // Include metadata for PWP info
  }
}

/**
 * Format order items array
 */
export function formatOrderItems(
  items: Array<any> | null | undefined,
  variantMap?: Map<string, { thumbnail: string | null; product_name: string }>
) {
  return items?.map((item) => {
    const variantInfo = variantMap?.get(item.variant_id || "")
    return formatOrderItem(item, variantInfo)
  }) || []
}

/**
 * Map Medusa 2.x payment status to frontend payment status
 * Medusa 2.x uses: not_paid, awaiting, captured, partially_captured, canceled, partially_refunded, refunded, requires_action
 * Frontend uses: awaiting, paid, captured, refunded, partially_refunded
 */
export function mapMedusaPaymentStatus(medusaStatus: string | null | undefined): string | null {
  if (!medusaStatus) return null

  switch (medusaStatus) {
    case "captured":
    case "partially_captured":
      return "captured"
    case "refunded":
      return "refunded"
    case "partially_refunded":
      return "partially_refunded"
    case "not_paid":
    case "awaiting":
    case "requires_action":
      return "awaiting"
    case "canceled":
      return "refunded"
    default:
      return null // Let it fall through to derived status
  }
}

/**
 * Derive payment status from order status
 */
export function derivePaymentStatus(orderStatus: string | null | undefined): string {
  if (orderStatus === "completed" || orderStatus === "archived") {
    return "paid"
  } else if (orderStatus === "canceled") {
    return "refunded"
  } else if (orderStatus === "pending") {
    return "awaiting"
  }
  return "awaiting"
}

/**
 * Derive fulfillment status from order status
 * Maps to frontend values: unfulfilled, processing, shipped, delivered, cancelled
 */
export function deriveFulfillmentStatus(orderStatus: string | null | undefined): string {
  if (orderStatus === "completed" || orderStatus === "archived") {
    return "delivered"
  } else if (orderStatus === "canceled") {
    return "cancelled"
  }
  return "unfulfilled"
}

/**
 * Format shipping address for API response
 */
export function formatShippingAddress(address: {
  first_name?: string | null
  last_name?: string | null
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
  country_code?: string | null
  phone?: string | null
} | null | undefined) {
  if (!address) return null

  return {
    first_name: address.first_name || "",
    last_name: address.last_name || "",
    address_1: address.address_1 || "",
    address_2: address.address_2 || "",
    city: address.city || "",
    province: address.province || "",
    postal_code: address.postal_code || "",
    country_code: address.country_code || "",
    phone: address.phone || "",
  }
}

type OrderFormatOptions = {
  order: {
    id: string
    display_id?: number | null
    customer_id?: string | null
    email?: string | null
    status?: string | null
    payment_status?: string | null // Medusa 2.x order payment status (captured, not_paid, etc.)
    fulfillment_status?: string | null // Medusa 2.x order fulfillment status
    currency_code?: string | null
    items?: Array<any> | null
    shipping_address?: any
    shipping_methods?: Array<any> | null // Shipping methods with amounts
    metadata?: Record<string, any> | null // Cart/order metadata (includes coupon info)
    created_at: Date | string
    updated_at?: Date | string | null
  }
  customer?: {
    first_name?: string | null
    last_name?: string | null
    email?: string | null
    phone?: string | null
  } | null
  variantMap?: Map<string, { thumbnail: string | null; product_name: string }>
  extension?: {
    payment_status?: string | null
    fulfillment_status?: string | null
    payment_method?: string | null
    tracking_number?: string | null
    courier?: string | null
    shipped_at?: Date | string | null
    delivered_at?: Date | string | null
    estimated_delivery?: Date | string | null
    paid_at?: Date | string | null
  } | null
  overrides?: {
    status?: string
    payment_status?: string
    fulfillment_status?: string
  }
}

/**
 * Format complete order for API response
 * Consolidates common order formatting logic
 */
export function formatOrderResponse(options: OrderFormatOptions) {
  const { order, customer, variantMap, extension, overrides } = options

  const orderSubtotal = calculateOrderTotal(order.items)

  // Calculate discount from item adjustments, PWP, variant, and wholesale discounts
  let discountTotal = calculateDiscountTotal(order.items)

  // Check if adjustments already include coupon discounts
  const hasItemAdjustments = order.items?.some(item =>
    (item as any).adjustments && (item as any).adjustments.length > 0
  ) || false

  // Only add coupon discount from order metadata if NOT already in item adjustments
  // This prevents double-counting when coupons are stored in both places
  if (!hasItemAdjustments && order.metadata?.applied_coupon_discount) {
    discountTotal += Number(order.metadata.applied_coupon_discount) || 0
  }

  // Also add points discount from order metadata if present
  const pointsDiscountAmount = Number(order.metadata?.points_discount_amount) || 0
  if (pointsDiscountAmount > 0) {
    discountTotal += pointsDiscountAmount
  }

  // Also add membership promo discount from order metadata if present
  const membershipPromoDiscount = Number(order.metadata?.applied_membership_promo_discount) || 0
  if (membershipPromoDiscount > 0) {
    discountTotal += membershipPromoDiscount
  }

  // Also add tier discount from order metadata if present (automatically applied based on membership tier)
  const tierDiscount = Number(order.metadata?.tier_discount_amount) || 0
  if (tierDiscount > 0) {
    discountTotal += tierDiscount
  }

  const itemsCount = calculateItemsCount(order.items)
  const formattedItems = formatOrderItems(order.items, variantMap)

  // Calculate shipping total from shipping methods or EasyParcel metadata
  const shippingMethods = order.shipping_methods || []
  const orderMetadata = order.metadata || {}

  // Check if EasyParcel shipping was used - prefer this over shipping_methods
  // because shipping_methods may contain a placeholder Medusa shipping option
  const easyParcelShipping = orderMetadata.easyparcel_shipping
  let shippingTotal: number

  if (easyParcelShipping && typeof easyParcelShipping.price === 'number') {
    // Use EasyParcel price from metadata (the actual selected shipping rate)
    shippingTotal = easyParcelShipping.price
  } else {
    // Fall back to shipping methods amount
    shippingTotal = shippingMethods.reduce((sum: number, method: any) => {
      return sum + (Number(method.amount) || 0)
    }, 0)
  }

  // If free shipping was applied, the effective shipping is 0
  const freeShippingApplied = orderMetadata.free_shipping_applied === true
  const effectiveShippingTotal = freeShippingApplied ? 0 : shippingTotal

  // Get the shipping method name
  const shippingMethodName = shippingMethods.length > 0
    ? (shippingMethods[0].name || shippingMethods[0].shipping_option?.name || null)
    : null

  // Calculate final total (subtotal + effective shipping - discount)
  const orderTotal = Math.max(0, orderSubtotal + effectiveShippingTotal - discountTotal)

  // Determine statuses - priority:
  // 1. Overrides (explicit)
  // 2. Medusa order's actual payment_status (from payment module)
  // 3. Extension values (custom tracking)
  // 4. Derived from order status (fallback)
  const payment_status = overrides?.payment_status
    ?? mapMedusaPaymentStatus(order.payment_status)
    ?? extension?.payment_status
    ?? derivePaymentStatus(order.status)

  const fulfillment_status = overrides?.fulfillment_status
    ?? extension?.fulfillment_status
    ?? deriveFulfillmentStatus(order.status)

  // Map Medusa status to frontend format
  // Medusa 2.x uses: pending, completed, draft, archived, canceled, requires_action
  let orderStatus = overrides?.status ?? order.status ?? "pending"
  // Map "canceled" to "cancelled" for frontend consistency
  if (orderStatus === "canceled") {
    orderStatus = "cancelled"
  }

  return {
    id: order.id,
    display_id: order.display_id || 0,
    customer_id: order.customer_id || "",
    customer_name: customer ? formatCustomerName(customer) : order.email || "Guest",
    customer_email: order.email || customer?.email || "",
    customer_phone: customer?.phone || null,
    status: orderStatus,
    payment_status,
    fulfillment_status,
    payment_method: extension?.payment_method || null,
    shipping_method: shippingMethodName,
    shipping_channel: null,
    subtotal: orderSubtotal,
    shipping_total: effectiveShippingTotal,
    tax_total: 0,
    discount_total: discountTotal,
    coupon_code: order.metadata?.applied_coupon_code || null,
    tier_discount: tierDiscount > 0 ? {
      slug: order.metadata?.tier_slug || null,
      name: order.metadata?.tier_name || null,
      discount_percentage: order.metadata?.tier_discount_percentage || 0,
      discount_amount: tierDiscount,
    } : null,
    total: orderTotal,
    currency: order.currency_code || "myr",
    items_count: itemsCount,
    items: formattedItems,
    tracking_number: extension?.tracking_number || null,
    courier: extension?.courier || null,
    shipped_at: extension?.shipped_at || null,
    delivered_at: extension?.delivered_at || null,
    estimated_delivery: extension?.estimated_delivery || null,
    paid_at: extension?.paid_at || null,
    has_rating: false,
    shipping_address: formatShippingAddress(order.shipping_address),
    metadata: order.metadata || null, // Include metadata for points, coupons, etc.
    created_at: order.created_at,
    updated_at: order.updated_at || order.created_at,
  }
}
