import type { MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { withAdminAuth } from "../../../../utils/admin-auth";
import { formatCustomerName } from "../../../../utils/format-customer";
import { calculateOrderTotal, calculateDiscountTotal, calculateItemsCount } from "../../../../utils/format-order";
import { ORDER_EXTENSION_MODULE, OrderExtensionService } from "../../../../modules/order-extension";

type OrderExtensionRecord = {
  order_id: string;
  payment_status: string;
  fulfillment_status: string;
};

/**
 * Derive a user-friendly display status from payment and fulfillment statuses
 * Priority: Cancelled > Refunded > Delivered > Shipped > Processing > Paid > Pending
 */
function deriveDisplayStatus(
  orderStatus: string | null,
  paymentStatus: string | null,
  fulfillmentStatus: string | null
): string {
  // Check for cancelled/refunded first
  if (orderStatus === "canceled" || fulfillmentStatus === "cancelled") {
    return "cancelled";
  }
  if (paymentStatus === "refunded") {
    return "refunded";
  }
  if (paymentStatus === "partially_refunded") {
    return "partially_refunded";
  }

  // Check fulfillment status
  if (fulfillmentStatus === "delivered") {
    return "delivered";
  }
  if (fulfillmentStatus === "shipped") {
    return "shipped";
  }
  if (fulfillmentStatus === "processing") {
    return "processing";
  }

  // Check payment status
  if (paymentStatus === "paid" || paymentStatus === "captured") {
    return "paid";
  }

  // Default to pending
  return "pending";
}

/**
 * GET /admin/orders/recent
 * Get recent orders with customer information
 * Query params:
 * - limit: number of orders to return (default: 10)
 */
export const GET = withAdminAuth(async (req, res) => {
  const orderModule = req.scope.resolve(Modules.ORDER);
  const customerModule = req.scope.resolve(Modules.CUSTOMER);
  const orderExtensionService = req.scope.resolve(ORDER_EXTENSION_MODULE) as OrderExtensionService;

  // Get limit from query params, default to 10
  const limit = parseInt(req.query.limit as string) || 10;

  // Query recent orders with items, adjustments, and shipping methods for discount/shipping calculation
  const orders = await orderModule.listOrders({}, {
    relations: ["items", "items.adjustments", "shipping_methods"],
    take: limit,
    order: { created_at: "DESC" }
  });

  // Get customer IDs from orders
  const customerIds = [...new Set(orders.map(order => order.customer_id).filter(Boolean))];

  // Fetch customers
  const customers = await customerModule.listCustomers({
    id: customerIds
  });

  // Create a customer map for quick lookup
  const customerMap = new Map(customers.map(c => [c.id, c]));

  // Fetch order extensions for all orders to get real payment/fulfillment status
  const orderIds = orders.map(order => order.id);
  let extensionMap = new Map<string, OrderExtensionRecord>();

  try {
    const extensions: OrderExtensionRecord[] = await orderExtensionService.listOrderExtensions(
      { order_id: orderIds },
      { take: orderIds.length }
    );
    extensionMap = new Map(extensions.map((ext) => [ext.order_id, ext]));
  } catch (error) {
    // If order extension module fails, continue without it
    console.warn("Failed to fetch order extensions:", error);
  }

  // Format the response
  const recentOrders = orders.map(order => {
    const customer = customerMap.get(order.customer_id || "");
    const extension = extensionMap.get(order.id);

    // Calculate subtotal from items (gross, before any discounts)
    const subtotal = calculateOrderTotal(order.items);

    // Calculate discount from item adjustments, PWP, variant, and wholesale discounts
    let discountTotal = calculateDiscountTotal(order.items);

    // Check if adjustments already include coupon discounts
    const hasItemAdjustments = order.items?.some(item =>
      (item as any).adjustments && (item as any).adjustments.length > 0
    ) || false;

    // Only add coupon discount from order metadata if NOT already in item adjustments
    // This prevents double-counting when coupons are stored in both places
    if (!hasItemAdjustments && (order as any).metadata?.applied_coupon_discount) {
      discountTotal += Number((order as any).metadata.applied_coupon_discount) || 0;
    }

    // Add points discount from order metadata
    if ((order as any).metadata?.points_discount_amount) {
      discountTotal += Number((order as any).metadata.points_discount_amount) || 0;
    }

    // Add membership promo discount from order metadata
    if ((order as any).metadata?.applied_membership_promo_discount) {
      discountTotal += Number((order as any).metadata.applied_membership_promo_discount) || 0;
    }

    // Add tier discount from order metadata (automatically applied based on membership tier)
    if ((order as any).metadata?.tier_discount_amount) {
      discountTotal += Number((order as any).metadata.tier_discount_amount) || 0;
    }

    // Calculate shipping total from shipping methods or EasyParcel metadata
    const orderMetadata = (order as any).metadata || {};
    const shippingMethods = (order as any).shipping_methods || [];

    // Check if EasyParcel shipping was used - prefer this over shipping_methods
    // because shipping_methods may contain a placeholder Medusa shipping option
    const easyParcelShipping = orderMetadata.easyparcel_shipping;
    let rawShippingTotal: number;

    if (easyParcelShipping && typeof easyParcelShipping.price === 'number') {
      // Use EasyParcel price from metadata (the actual selected shipping rate)
      rawShippingTotal = easyParcelShipping.price;
    } else {
      // Fall back to shipping methods amount
      rawShippingTotal = shippingMethods.reduce((sum: number, method: any) => {
        return sum + (Number(method.amount) || 0);
      }, 0);
    }

    // If free shipping was applied, the effective shipping is 0
    const freeShippingApplied = orderMetadata.free_shipping_applied === true;
    const effectiveShipping = freeShippingApplied ? 0 : rawShippingTotal;

    // Final total = subtotal + shipping - discount
    const orderTotal = Math.max(0, subtotal + effectiveShipping - discountTotal);
    const itemsCount = calculateItemsCount(order.items);

    // Derive display status from extension data or order status
    const displayStatus = deriveDisplayStatus(
      order.status,
      extension?.payment_status || null,
      extension?.fulfillment_status || null
    );

    return {
      id: order.id,
      display_id: order.display_id,
      customer_name: formatCustomerName(customer),
      customer_email: order.email || customer?.email || "",
      total: orderTotal,
      currency: order.currency_code || "myr",
      items_count: itemsCount,
      created_at: order.created_at,
      status: displayStatus
    };
  });

  res.json({
    orders: recentOrders
  });
});
