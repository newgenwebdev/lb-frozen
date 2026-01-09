import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { ORDER_EXTENSION_MODULE } from "../../../modules/order-extension"
import { mapMedusaPaymentStatus } from "../../../utils/format-order"
import { getVerifiedCustomerId } from "../../../utils/store-auth"

/**
 * GET /store/customer-orders
 * Get customer's orders with fulfillment status from order-extension
 * Requires customer authentication via Medusa's store auth
 * Query params:
 * - limit: number of orders per page (default: 10)
 * - offset: pagination offset (default: 0)
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  // Get customer ID from verified JWT token
  const customerId = getVerifiedCustomerId(req)

  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" } as any)
    return
  }

  const orderModule = req.scope.resolve(Modules.ORDER)
  const productModule = req.scope.resolve(Modules.PRODUCT)
  const orderExtensionService = req.scope.resolve(ORDER_EXTENSION_MODULE) as any
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Get query parameters
  const limit = parseInt(req.query.limit as string) || 10
  const offset = parseInt(req.query.offset as string) || 0

  // Query orders for this customer with shipping methods
  const [orders, totalCount] = await Promise.all([
    orderModule.listOrders(
      { customer_id: customerId },
      {
        relations: ["items", "items.adjustments", "shipping_address", "shipping_methods"],
        take: limit,
        skip: offset,
        order: { created_at: "DESC" },
      }
    ),
    orderModule.listOrders(
      { customer_id: customerId },
      { select: ["id"] }
    ).then((orders) => orders.length),
  ])

  // Get order IDs for fetching extensions and payment status
  const orderIds = orders.map((order) => order.id)

  // Fetch order extensions and payment status in parallel
  const [orderExtensions, ordersWithPayment] = await Promise.all([
    orderIds.length > 0
      ? orderExtensionService.listOrderExtensions({ order_id: orderIds })
      : [],
    // Query payment status from payment collections
    orderIds.length > 0
      ? query.graph({
          entity: "order",
          filters: { id: orderIds },
          fields: [
            "id",
            "payment_collections.id",
            "payment_collections.status",
            "payment_collections.payments.id",
            "payment_collections.payments.captured_at",
          ],
        }).then((result: any) => result.data || [])
      : [],
  ])

  // Create payment status map from payment collections
  const paymentStatusMap = new Map<string, string>()
  for (const orderWithPayment of ordersWithPayment) {
    const paymentCollections = orderWithPayment.payment_collections || []
    let hasCapture = false
    let hasPayment = false

    for (const collection of paymentCollections) {
      const payments = collection.payments || []
      for (const payment of payments) {
        hasPayment = true
        if (payment.captured_at) {
          hasCapture = true
          break
        }
      }
      if (hasCapture) break
    }

    if (hasCapture) {
      paymentStatusMap.set(orderWithPayment.id, "captured")
    } else if (hasPayment) {
      paymentStatusMap.set(orderWithPayment.id, "authorized")
    }
  }

  // Create extension map for quick lookup
  const extensionMap = new Map<string, any>(
    orderExtensions.map((ext: any): [string, any] => [ext.order_id, ext])
  )

  // Get unique variant IDs from all order items
  const variantIds = [
    ...new Set(
      orders.flatMap((order) =>
        order.items?.map((item) => item.variant_id).filter(Boolean) || []
      )
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

  // Format the orders
  const formattedOrders = orders.map((order) => {
    const extension = extensionMap.get(order.id)

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

    const itemsCount =
      order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0

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
    const paymentCollectionStatus = paymentStatusMap.get(order.id)
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

    return {
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
  })

  res.json({
    orders: formattedOrders,
    count: totalCount,
    limit,
    offset,
  })
}

/**
 * OPTIONS /store/customer-orders
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send()
}
