import type { MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { ORDER_EXTENSION_MODULE } from "../../../modules/order-extension";
import { withAdminAuth } from "../../../utils/admin-auth";
import { formatCustomerName } from "../../../utils/format-customer";
import { mapMedusaPaymentStatus } from "../../../utils/format-order";

/**
 * Helper function to get date range boundaries
 */
function getDateRange(range: string): { start: Date; end: Date } | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (range) {
    case "today":
      return {
        start: today,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      };
    case "yesterday": {
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      return {
        start: yesterday,
        end: today,
      };
    }
    case "this_week": {
      const dayOfWeek = today.getDay();
      const startOfWeek = new Date(today.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
      return {
        start: startOfWeek,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      };
    }
    case "last_week": {
      const dayOfWeek = today.getDay();
      const startOfThisWeek = new Date(today.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
      const startOfLastWeek = new Date(startOfThisWeek.getTime() - 7 * 24 * 60 * 60 * 1000);
      return {
        start: startOfLastWeek,
        end: startOfThisWeek,
      };
    }
    case "this_month": {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        start: startOfMonth,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      };
    }
    case "last_month": {
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return {
        start: startOfLastMonth,
        end: startOfThisMonth,
      };
    }
    default:
      return null;
  }
}

/**
 * GET /admin/custom-orders
 * Get paginated list of orders with filters
 * Query params:
 * - limit: number of orders per page (default: 10)
 * - offset: pagination offset (default: 0)
 * - status: filter by order status
 * - payment_status: filter by payment status (awaiting, paid, refunded, partially_refunded)
 * - fulfillment_status: filter by fulfillment status (unfulfilled, processing, shipped, delivered, cancelled)
 * - date_range: filter by date range (today, yesterday, this_week, last_week, this_month, last_month)
 * - q: search by customer name or email
 * - sort_by: sorting option (newest, oldest, highest, lowest)
 */
export const GET = withAdminAuth(async (req, res) => {
  const orderModule = req.scope.resolve(Modules.ORDER);
  const customerModule = req.scope.resolve(Modules.CUSTOMER);
  const productModule = req.scope.resolve(Modules.PRODUCT);
  const orderExtensionService = req.scope.resolve(ORDER_EXTENSION_MODULE) as any;
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  // Get query parameters
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = parseInt(req.query.offset as string) || 0;
  const status = req.query.status as string | undefined;
  const paymentStatus = req.query.payment_status as string | undefined;
  const fulfillmentStatus = req.query.fulfillment_status as string | undefined;
  const dateRangeParam = req.query.date_range as string | undefined;
  const search = req.query.q as string | undefined;
  const sortBy = (req.query.sort_by as string) || "newest";

  // Build filters
  const filters: Record<string, unknown> = {};

  if (status && status !== "all") {
    // Map frontend's "cancelled" to Medusa's "canceled"
    filters.status = status === "cancelled" ? "canceled" : status;
  }

  // Get date range boundaries
  const dateRange = dateRangeParam ? getDateRange(dateRangeParam) : null;

  // Determine sort order
  let orderBy: Record<string, "ASC" | "DESC"> = { created_at: "DESC" };
  switch (sortBy) {
    case "oldest":
      orderBy = { created_at: "ASC" };
      break;
    case "newest":
      orderBy = { created_at: "DESC" };
      break;
    // For highest/lowest, we'll sort after calculating totals
  }

  // Check if we need client-side filtering (which requires fetching all orders first)
  // These filters cannot be applied at the database level because they depend on
  // extension data or computed fields
  const needsClientSideFiltering = !!(
    paymentStatus ||
    fulfillmentStatus ||
    search ||
    dateRangeParam ||
    sortBy === "highest" ||
    sortBy === "lowest"
  );

  // Query orders with items, adjustments, and shipping methods for discount/shipping calculation
  // When client-side filtering is needed, fetch ALL orders first, then filter and paginate
  const [orders, totalCount] = await Promise.all([
    orderModule.listOrders(filters, {
      relations: ["items", "items.adjustments", "shipping_address", "shipping_methods"],
      take: needsClientSideFiltering ? undefined : limit,
      skip: needsClientSideFiltering ? undefined : offset,
      order: orderBy,
    }),
    orderModule.listOrders(filters, {
      select: ["id"],
    }).then((orders) => orders.length),
  ]);

  // Get customer IDs from orders
  const customerIds = [
    ...new Set(orders.map((order) => order.customer_id).filter(Boolean)),
  ];

  // Get order IDs for fetching extensions
  const orderIds = orders.map((order) => order.id);

  // Fetch customers, order extensions, and payment status in parallel
  const [customers, orderExtensions, ordersWithPayment] = await Promise.all([
    customerIds.length > 0
      ? customerModule.listCustomers({ id: customerIds })
      : [],
    orderIds.length > 0
      ? orderExtensionService.listOrderExtensions({ order_id: orderIds })
      : [],
    // Query payment status from payment collections using Query graph
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
  ]);

  // Create payment status map from payment collections
  const paymentStatusMap = new Map<string, string>();
  for (const orderWithPayment of ordersWithPayment) {
    const paymentCollections = orderWithPayment.payment_collections || [];
    let hasCapture = false;
    let hasPayment = false;

    for (const collection of paymentCollections) {
      const payments = collection.payments || [];
      for (const payment of payments) {
        hasPayment = true;
        if (payment.captured_at) {
          hasCapture = true;
          break;
        }
      }
      if (hasCapture) break;
    }

    if (hasCapture) {
      paymentStatusMap.set(orderWithPayment.id, "captured");
    } else if (hasPayment) {
      paymentStatusMap.set(orderWithPayment.id, "authorized");
    }
    // If no payments, it stays as "awaiting" (default)
  }

  // Create maps for quick lookup
  const customerMap = new Map<string, any>(
    customers.map((c: any): [string, any] => [c.id, c])
  );
  const extensionMap = new Map<string, any>(
    orderExtensions.map((ext: any): [string, any] => [ext.order_id, ext])
  );

  // Get unique variant IDs from all order items
  const variantIds = [
    ...new Set(
      orders.flatMap((order) =>
        order.items?.map((item) => item.variant_id).filter(Boolean) || []
      )
    ),
  ];

  // Fetch product variants with their products for thumbnails
  let variantMap = new Map<string, { thumbnail: string | null; product_name: string }>();
  if (variantIds.length > 0) {
    try {
      const variants = await productModule.listProductVariants(
        { id: variantIds },
        { relations: ["product"] }
      );
      variantMap = new Map(
        variants.map((v) => [
          v.id,
          {
            thumbnail: (v.product as any)?.thumbnail || null,
            product_name: (v.product as any)?.title || v.title || "Unknown Product",
          },
        ])
      );
    } catch {
      // If product module fails, continue without thumbnails
    }
  }

  const logger = req.scope.resolve("logger") as any;

  // Format the orders
  let formattedOrders = orders.map((order) => {
    const customer = customerMap.get(order.customer_id || "");
    const extension = extensionMap.get(order.id);

    // Debug: Log order metadata to see if it's being retrieved
    logger.info(`[ADMIN ORDERS] Order ${order.id} metadata: ${JSON.stringify((order as any).metadata)}`);

    // Calculate subtotal from items (original prices before PWP discount)
    const orderSubtotal =
      order.items?.reduce((sum, item) => {
        const itemTotal = (item.unit_price || 0) * (item.quantity || 0);
        return sum + itemTotal;
      }, 0) || 0;

    // Calculate PWP discount from item metadata
    const pwpDiscountTotal = order.items?.reduce((sum, item) => {
      const itemMetadata = (item as any).metadata;
      if (itemMetadata?.is_pwp_item && itemMetadata?.pwp_discount_amount) {
        const discountAmount = Number(itemMetadata.pwp_discount_amount) || 0;
        return sum + (discountAmount * (item.quantity || 1));
      }
      return sum;
    }, 0) || 0;

    // Calculate coupon/promo discount from item adjustments
    let couponDiscountTotal = order.items?.reduce((sum, item) => {
      const itemDiscount = (item as any).adjustments?.reduce(
        (adjSum: number, adj: any) => adjSum + (adj.amount || 0),
        0
      ) || 0;
      return sum + itemDiscount;
    }, 0) || 0;

    // Fallback: check order metadata for coupon discount if no adjustments
    if (couponDiscountTotal === 0 && (order as any).metadata?.applied_coupon_discount) {
      couponDiscountTotal = Number((order as any).metadata.applied_coupon_discount) || 0;
      logger.info(`[ADMIN ORDERS] Order ${order.id} using metadata discount: ${couponDiscountTotal}`);
    }

    // Get points discount from order metadata
    const pointsDiscountTotal = Number((order as any).metadata?.points_discount_amount) || 0;

    // Total discount is PWP + coupon + points discounts
    const discountTotal = pwpDiscountTotal + couponDiscountTotal + pointsDiscountTotal;

    const itemsCount =
      order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

    // Format items with product info
    const formattedItems = order.items?.map((item) => {
      const variantInfo = variantMap.get(item.variant_id || "");
      const unitPrice = item.unit_price || 0;
      const itemMetadata = (item as any).metadata || null;

      // Calculate effective price (after PWP discount)
      let effectivePrice = unitPrice;
      if (itemMetadata?.is_pwp_item && itemMetadata?.pwp_discount_amount) {
        const discountAmount = Number(itemMetadata.pwp_discount_amount) || 0;
        effectivePrice = unitPrice - discountAmount;
      }

      return {
        id: item.id,
        product_id: (item as any).product_id || "",
        variant_id: item.variant_id || "",
        product_name: item.title || variantInfo?.product_name || "Unknown Product",
        variant_title: (item as any).variant_title || null,
        thumbnail: variantInfo?.thumbnail || null,
        quantity: item.quantity || 0,
        unit_price: unitPrice,
        effective_price: effectivePrice,
        total: effectivePrice * (item.quantity || 0),
        sku: (item as any).sku || null,
        metadata: itemMetadata,
      };
    }) || [];

    // Get payment status - priority:
    // 1. Payment collection status (from query graph - actual Medusa payment status)
    // 2. Extension values (custom tracking)
    // 3. Derived from order status (fallback)
    const paymentCollectionStatus = paymentStatusMap.get(order.id);
    let payment_status = paymentCollectionStatus || extension?.payment_status || "awaiting";
    let fulfillment_status_value = extension?.fulfillment_status || "unfulfilled";

    // Fallback: derive from order status if no payment collection status or extension
    if (!paymentCollectionStatus && !extension) {
      if (order.status === "completed" || order.status === "archived") {
        payment_status = "paid";
        fulfillment_status_value = "delivered";
      } else if (order.status === "canceled") {
        payment_status = "refunded";
        fulfillment_status_value = "cancelled";
      } else if (order.status === "pending") {
        // Keep awaiting - already set above
        fulfillment_status_value = "unfulfilled";
      }
    }

    // Map Medusa's "canceled" to frontend's "cancelled"
    let orderStatus: string = order.status || "pending";
    if (orderStatus === "canceled") {
      orderStatus = "cancelled";
    }

    // Format shipping address
    const shippingAddr = order.shipping_address;
    const formattedShippingAddress = shippingAddr ? {
      first_name: shippingAddr.first_name || null,
      last_name: shippingAddr.last_name || null,
      address_1: shippingAddr.address_1 || null,
      address_2: shippingAddr.address_2 || null,
      city: shippingAddr.city || null,
      province: shippingAddr.province || null,
      postal_code: shippingAddr.postal_code || null,
      country_code: shippingAddr.country_code || null,
      phone: shippingAddr.phone || null,
    } : null;

    // Calculate shipping total from shipping methods or EasyParcel metadata
    const shippingMethods = (order as any).shipping_methods || [];
    const orderMetadata = (order as any).metadata || {};

    // Check if EasyParcel shipping was used - prefer this over shipping_methods
    // because shipping_methods may contain a placeholder Medusa shipping option
    const easyParcelShipping = orderMetadata.easyparcel_shipping;
    let shippingTotal: number;

    if (easyParcelShipping && typeof easyParcelShipping.price === 'number') {
      // Use EasyParcel price from metadata (the actual selected shipping rate)
      shippingTotal = easyParcelShipping.price;
    } else {
      // Fall back to shipping methods amount
      shippingTotal = shippingMethods.reduce((sum: number, method: any) => {
        return sum + (Number(method.amount) || 0);
      }, 0);
    }

    // If free shipping was applied, the effective shipping is 0
    const freeShippingApplied = orderMetadata.free_shipping_applied === true;
    const effectiveShippingTotal = freeShippingApplied ? 0 : shippingTotal;

    // Get the shipping method name - prefer EasyParcel courier name from metadata
    const shippingMethodName = easyParcelShipping?.courier_name
      ? `${easyParcelShipping.courier_name}${easyParcelShipping.service_name ? ` - ${easyParcelShipping.service_name}` : ''}`
      : (shippingMethods.length > 0
        ? (shippingMethods[0].name || shippingMethods[0].shipping_option?.name || null)
        : null);

    // Recalculate total including effective shipping (0 if free shipping)
    const orderTotalWithShipping = Math.max(0, orderSubtotal + effectiveShippingTotal - discountTotal);

    return {
      id: order.id,
      display_id: order.display_id || 0,
      customer_id: order.customer_id || "",
      customer_name: customer ? formatCustomerName(customer) : order.email || "Guest",
      customer_email: order.email || customer?.email || "",
      customer_phone: customer?.phone || null,
      status: orderStatus,
      payment_status,
      fulfillment_status: fulfillment_status_value,
      payment_method: extension?.payment_method || null,
      shipping_method: shippingMethodName,
      shipping_channel: null,
      shipping_address: formattedShippingAddress,
      subtotal: orderSubtotal,
      shipping_total: effectiveShippingTotal,
      tax_total: 0, // Would need tax calculation
      discount_total: discountTotal,
      coupon_code: (order as any).metadata?.applied_coupon_code || null,
      total: orderTotalWithShipping,
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
      metadata: (order as any).metadata || null, // Include metadata for points, coupons, etc.
      created_at: order.created_at,
      updated_at: order.updated_at || order.created_at,
    };
  });

  // Filter by date range if provided
  if (dateRange) {
    formattedOrders = formattedOrders.filter((order) => {
      const orderDate = new Date(order.created_at);
      return orderDate >= dateRange.start && orderDate < dateRange.end;
    });
  }

  // Filter by search if provided
  if (search) {
    const searchLower = search.toLowerCase();
    formattedOrders = formattedOrders.filter(
      (order) =>
        order.customer_name.toLowerCase().includes(searchLower) ||
        order.customer_email.toLowerCase().includes(searchLower) ||
        String(order.display_id).includes(searchLower)
    );
  }

  // Filter by payment status if provided
  if (paymentStatus && paymentStatus !== "all") {
    formattedOrders = formattedOrders.filter((order) => {
      // Treat "paid" and "captured" as equivalent (Medusa 2.x uses "captured")
      if (paymentStatus === "paid") {
        return order.payment_status === "paid" || order.payment_status === "captured";
      }
      // Treat "awaiting" and "authorized" as equivalent (both are unpaid)
      if (paymentStatus === "awaiting") {
        return order.payment_status === "awaiting" || order.payment_status === "authorized";
      }
      return order.payment_status === paymentStatus;
    });
  }

  // Filter by fulfillment status if provided
  if (fulfillmentStatus && fulfillmentStatus !== "all") {
    // Handle smart filter combinations (legacy support - frontend now sends separate params)
    switch (fulfillmentStatus) {
      case "ready_to_ship":
        // Paid/captured + unfulfilled or processing (not yet shipped)
        formattedOrders = formattedOrders.filter(
          (order) => (order.payment_status === "paid" || order.payment_status === "captured") &&
            (order.fulfillment_status === "unfulfilled" || order.fulfillment_status === "processing")
        );
        break;
      case "in_transit":
        // Shipped orders
        formattedOrders = formattedOrders.filter(
          (order) => order.fulfillment_status === "shipped"
        );
        break;
      case "delivered":
        // Completed/delivered orders - also check Medusa's native "completed" status as fallback
        // Exclude cancelled orders even if they were previously completed
        formattedOrders = formattedOrders.filter(
          (order) => order.status !== "cancelled" &&
            (order.fulfillment_status === "delivered" || order.status === "completed")
        );
        break;
      case "awaiting_payment":
        // Unpaid orders - include both "awaiting" and "authorized" (payment initiated but not captured)
        formattedOrders = formattedOrders.filter(
          (order) => order.payment_status === "awaiting" || order.payment_status === "authorized"
        );
        break;
      default:
        // Regular fulfillment status filter (unfulfilled, processing, shipped, cancelled)
        formattedOrders = formattedOrders.filter(
          (order) => order.fulfillment_status === fulfillmentStatus
        );
    }
  }

  // Sort by total if needed
  if (sortBy === "highest") {
    formattedOrders.sort((a, b) => b.total - a.total);
  } else if (sortBy === "lowest") {
    formattedOrders.sort((a, b) => a.total - b.total);
  }

  // Apply pagination for client-side filtered/sorted results
  const finalCount = formattedOrders.length;
  if (needsClientSideFiltering) {
    formattedOrders = formattedOrders.slice(offset, offset + limit);
  }

  res.json({
    orders: formattedOrders,
    count: needsClientSideFiltering ? finalCount : totalCount,
    limit,
    offset,
  });
});
