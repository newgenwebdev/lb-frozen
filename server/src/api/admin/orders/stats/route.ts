import type { MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { ORDER_EXTENSION_MODULE } from "../../../../modules/order-extension";
import { withAdminAuth } from "../../../../utils/admin-auth";

/**
 * GET /admin/orders/stats
 * Get order statistics for dashboard cards
 * Returns:
 * - total_orders: Total number of orders
 * - total_revenue: Sum of all order values
 * - awaiting_payment: Orders waiting for payment
 * - ready_to_ship: Paid orders that haven't been shipped yet
 * - in_transit: Orders that have been shipped
 * - completed: Delivered orders
 */
export const GET = withAdminAuth(async (req, res) => {
  const orderModule = req.scope.resolve(Modules.ORDER);
  const orderExtensionService = req.scope.resolve(ORDER_EXTENSION_MODULE) as any;
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  // Get all orders with items to calculate totals
  const orders = await orderModule.listOrders({}, {
    relations: ["items"],
  });

  // Get all order extensions
  const orderIds = orders.map((order) => order.id);

  // Fetch order extensions and payment status from payment collections in parallel
  const [orderExtensions, ordersWithPayment] = await Promise.all([
    orderIds.length > 0
      ? orderExtensionService.listOrderExtensions({ order_id: orderIds })
      : [],
    // Query payment status from payment collections (same as custom-orders endpoint)
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
  // This is the source of truth for whether payment was captured
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

  // Create extension map
  const extensionMap = new Map<string, any>(
    orderExtensions.map((ext: any): [string, any] => [ext.order_id, ext])
  );

  // Calculate statistics
  let totalOrders = orders.length;
  let totalRevenue = 0;

  // New status-based counts
  let awaitingPayment = 0;
  let readyToShip = 0;  // paid + unfulfilled
  let inTransit = 0;    // shipped
  let completed = 0;    // delivered

  // Legacy counts (for backwards compatibility)
  let paidOrders = 0;
  let unpaidOrders = 0;
  let pendingOrders = 0;
  let refundedOrders = 0;

  orders.forEach((order) => {
    // Get extension data if available
    const extension = extensionMap.get(order.id);

    // Get payment status from payment collections (source of truth)
    const paymentCollectionStatus = paymentStatusMap.get(order.id);

    // Handle cancelled orders
    // Check if the order was paid before cancellation using payment collection (source of truth)
    if (order.status === "canceled") {
      const wasPaid = paymentCollectionStatus === "captured" ||
                      extension?.payment_status === "paid" ||
                      extension?.payment_status === "refunded" ||
                      extension?.payment_status === "partially_refunded";

      if (wasPaid) {
        // Was paid before cancellation - count as paid (cancelled after payment)
        paidOrders++;
      } else {
        // Never paid - count as unpaid (cancelled before payment)
        unpaidOrders++;
      }
      // Don't count cancelled orders in revenue or fulfillment stats (Ready to Ship, In Transit, Completed)
      return;
    }

    // Calculate order total from items (only for non-cancelled orders)
    const orderTotal = order.items?.reduce((sum, item) => {
      return sum + (item.unit_price || 0) * (item.quantity || 0);
    }, 0) || 0;

    totalRevenue += orderTotal;

    // Determine payment status with priority:
    // 1. Payment collection status (actual Medusa payment status)
    // 2. Extension values (custom tracking)
    // 3. Derived from order status (fallback)
    let paymentStatus = paymentCollectionStatus || extension?.payment_status || "awaiting";

    // Determine fulfillment status from extension or fallback
    let fulfillmentStatus = extension?.fulfillment_status || "unfulfilled";

    // Fallback for orders without extension AND without payment collection status
    if (!paymentCollectionStatus && !extension) {
      if (order.status === "completed" || order.status === "archived") {
        paymentStatus = "paid";
        fulfillmentStatus = "delivered";
      } else if (order.status === "pending" || order.status === "requires_action") {
        paymentStatus = "awaiting";
        fulfillmentStatus = "unfulfilled";
      }
    }

    // Count by payment status
    // Treat "captured" as "paid" (Medusa 2.x uses "captured" for successful payments)
    const isPaid = paymentStatus === "paid" || paymentStatus === "captured";

    if (paymentStatus === "awaiting" || paymentStatus === "authorized") {
      awaitingPayment++;
      unpaidOrders++;
      pendingOrders++;
    } else if (isPaid) {
      paidOrders++;

      // Count by fulfillment status for paid orders
      if (fulfillmentStatus === "unfulfilled" || fulfillmentStatus === "processing") {
        readyToShip++;
      } else if (fulfillmentStatus === "shipped") {
        inTransit++;
      } else if (fulfillmentStatus === "delivered") {
        completed++;
      }
    } else if (paymentStatus === "refunded" || paymentStatus === "partially_refunded") {
      refundedOrders++;
    }
  });

  // Calculate paid percentage
  const paidPercentage = totalOrders > 0
    ? Math.round((paidOrders / totalOrders) * 100)
    : 0;

  res.json({
    // New status-based stats (primary)
    total_orders: totalOrders,
    total_revenue: totalRevenue,
    awaiting_payment: awaitingPayment,
    ready_to_ship: readyToShip,
    in_transit: inTransit,
    completed: completed,

    // Legacy stats (for backwards compatibility)
    paid_orders: paidOrders,
    unpaid_orders: unpaidOrders,
    pending_orders: pendingOrders,
    refunded_orders: refundedOrders,

    currency: "myr",
    paid_percentage: paidPercentage,
  });
});
