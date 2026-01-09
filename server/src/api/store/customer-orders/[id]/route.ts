import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { ORDER_EXTENSION_MODULE } from "../../../../modules/order-extension"
import { mapMedusaPaymentStatus } from "../../../../utils/format-order"
import { getVerifiedCustomerId } from "../../../../utils/store-auth"

/**
 * GET /store/customer-orders/:id
 * Get a single order by ID with fulfillment status from order-extension
 * Requires customer authentication - customer can only access their own orders
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  // Get customer ID from verified JWT token
  const customerId = getVerifiedCustomerId(req)

  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" } as any)
    return
  }

  const orderId = req.params.id

  const orderModule = req.scope.resolve(Modules.ORDER)
  const productModule = req.scope.resolve(Modules.PRODUCT)
  const orderExtensionService = req.scope.resolve(ORDER_EXTENSION_MODULE) as any
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Fetch the order with shipping methods
  const orders = await orderModule.listOrders(
    { id: orderId },
    {
      relations: ["items", "items.adjustments", "shipping_address", "shipping_methods"],
    }
  )

  const order = orders[0]

  if (!order) {
    res.status(404).json({ message: "Order not found" } as any)
    return
  }

  // Verify the order belongs to the authenticated customer
  if (order.customer_id !== customerId) {
    res.status(403).json({ message: "Access denied" } as any)
    return
  }

  // Fetch order extension and payment status
  const [orderExtensions, ordersWithPayment] = await Promise.all([
    orderExtensionService.listOrderExtensions({ order_id: [orderId] }),
    query.graph({
      entity: "order",
      filters: { id: [orderId] },
      fields: [
        "id",
        "payment_collections.id",
        "payment_collections.status",
        "payment_collections.payments.id",
        "payment_collections.payments.captured_at",
      ],
    }).then((result: any) => result.data || []),
  ])

  const extension = orderExtensions[0]

  // Determine payment status from payment collections
  let paymentCollectionStatus: string | undefined
  const orderWithPayment = ordersWithPayment[0]
  if (orderWithPayment) {
    const paymentCollections = orderWithPayment.payment_collections || []
    for (const collection of paymentCollections) {
      const payments = collection.payments || []
      for (const payment of payments) {
        if (payment.captured_at) {
          paymentCollectionStatus = "captured"
          break
        }
      }
      if (paymentCollectionStatus) break
    }
  }

  // Get unique variant IDs from order items
  const variantIds = [
    ...new Set(
      order.items?.map((item) => item.variant_id).filter(Boolean) || []
    ),
  ]

  // Fetch product variants with their products for thumbnails
  let variantMap = new Map<string, { thumbnail: string | null; product_name: string }>()
  if (variantIds.length > 0) {
    try {
      const variants = await productModule.listProductVariants(
        { id: variantIds },
        { relations: ["product"] }
      )
      variantMap = new Map(
        variants.map((v) => [
          v.id,
          {
            thumbnail: (v.product as any)?.thumbnail || null,
            product_name: (v.product as any)?.title || v.title || "Unknown Product",
          },
        ])
      )
    } catch {
      // If product module fails, continue without thumbnails
    }
  }

  // Calculate subtotal from items
  const orderSubtotal =
    order.items?.reduce((sum, item) => {
      const itemTotal = (item.unit_price || 0) * (item.quantity || 0)
      return sum + itemTotal
    }, 0) || 0

  // Calculate PWP discount from item metadata
  const pwpDiscountTotal = order.items?.reduce((sum, item) => {
    const itemMetadata = (item as any).metadata
    if (itemMetadata?.is_pwp_item && itemMetadata?.pwp_discount_amount) {
      const discountAmount = Number(itemMetadata.pwp_discount_amount) || 0
      return sum + (discountAmount * (item.quantity || 1))
    }
    return sum
  }, 0) || 0

  // Calculate coupon discount from item adjustments
  let couponDiscountTotal = order.items?.reduce((sum, item) => {
    const itemDiscount = (item as any).adjustments?.reduce(
      (adjSum: number, adj: any) => adjSum + (adj.amount || 0),
      0
    ) || 0
    return sum + itemDiscount
  }, 0) || 0

  // Fallback: check order metadata for coupon discount
  if (couponDiscountTotal === 0 && (order as any).metadata?.applied_coupon_discount) {
    couponDiscountTotal = Number((order as any).metadata.applied_coupon_discount) || 0
  }

  const discountTotal = pwpDiscountTotal + couponDiscountTotal

  // Format items with product info
  const formattedItems = order.items?.map((item) => {
    const variantInfo = variantMap.get(item.variant_id || "")
    return {
      id: item.id,
      title: item.title || variantInfo?.product_name || "Unknown Product",
      subtitle: (item as any).variant_title || null,
      thumbnail: variantInfo?.thumbnail || null,
      variant_id: item.variant_id || null,
      product_id: (item as any).product_id || null,
      quantity: item.quantity || 0,
      unit_price: item.unit_price || 0,
      subtotal: (item.unit_price || 0) * (item.quantity || 0),
      total: (item.unit_price || 0) * (item.quantity || 0),
      original_total: (item.unit_price || 0) * (item.quantity || 0),
      discount_total: 0,
      tax_total: 0,
      variant: variantInfo ? {
        id: item.variant_id || "",
        title: (item as any).variant_title || "",
        sku: (item as any).sku || null,
        product: {
          id: (item as any).product_id || "",
          title: variantInfo.product_name,
          handle: "",
          thumbnail: variantInfo.thumbnail,
        },
      } : undefined,
      metadata: (item as any).metadata || null,
    }
  }) || []

  // Get payment status - priority:
  // 1. Payment collection status (actual Medusa payment status)
  // 2. Extension values (custom tracking)
  // 3. Derived from order status (fallback)
  let payment_status = mapMedusaPaymentStatus(paymentCollectionStatus)
    || extension?.payment_status
    || "awaiting"

  // Get fulfillment status from extension or derive from order status
  let fulfillment_status = extension?.fulfillment_status || "not_fulfilled"

  // Fallback: derive from order status if no extension
  if (!extension) {
    if (order.status === "completed" || order.status === "archived") {
      payment_status = "captured"
      fulfillment_status = "delivered"
    } else if (order.status === "canceled") {
      payment_status = "refunded"
      fulfillment_status = "canceled"
    } else if (order.status === "pending") {
      fulfillment_status = "not_fulfilled"
    }
  }

  // Format shipping address
  const shippingAddr = order.shipping_address
  const formattedShippingAddress = shippingAddr ? {
    id: (shippingAddr as any).id || "",
    first_name: shippingAddr.first_name || "",
    last_name: shippingAddr.last_name || "",
    company: (shippingAddr as any).company || null,
    address_1: shippingAddr.address_1 || "",
    address_2: shippingAddr.address_2 || null,
    city: shippingAddr.city || "",
    province: shippingAddr.province || null,
    postal_code: shippingAddr.postal_code || "",
    country_code: shippingAddr.country_code || "",
    phone: shippingAddr.phone || null,
  } : undefined

  // Calculate shipping total from shipping methods or EasyParcel metadata
  const shippingMethods = (order as any).shipping_methods || []
  const orderMetadata = (order as any).metadata || {}

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

  // Format shipping methods for response
  const formattedShippingMethods = shippingMethods.map((method: any) => ({
    id: method.id || "",
    name: method.name || method.shipping_option?.name || "Standard Shipping",
    amount: Number(method.amount) || 0,
    data: method.data || null,
  }))

  // Recalculate total including effective shipping (0 if free shipping)
  const orderTotalWithShipping = Math.max(0, orderSubtotal + effectiveShippingTotal - discountTotal)

  const formattedOrder = {
    id: order.id,
    display_id: order.display_id || 0,
    status: order.status || "pending",
    fulfillment_status,
    payment_status,
    email: order.email || "",
    currency_code: order.currency_code || "sgd",
    subtotal: orderSubtotal,
    item_subtotal: orderSubtotal,
    shipping_total: effectiveShippingTotal,
    discount_total: discountTotal,
    tax_total: 0,
    total: orderTotalWithShipping,
    items: formattedItems,
    shipping_address: formattedShippingAddress,
    billing_address: formattedShippingAddress,
    shipping_methods: formattedShippingMethods,
    payments: [],
    // Tracking info from order extension
    courier: extension?.courier || null,
    tracking_number: extension?.tracking_number || null,
    created_at: order.created_at,
    updated_at: order.updated_at || order.created_at,
    metadata: (order as any).metadata || null,
  }

  res.json({ order: formattedOrder })
}

/**
 * OPTIONS /store/customer-orders/:id
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send()
}
