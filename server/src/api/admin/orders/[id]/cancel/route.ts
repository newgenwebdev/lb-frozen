import type { MedusaResponse } from "@medusajs/framework/http";
import { Modules, MedusaError, ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { ORDER_EXTENSION_MODULE } from "../../../../../modules/order-extension";
import { POINTS_MODULE } from "../../../../../modules/points";
import { withAdminAuth } from "../../../../../utils/admin-auth";
import { formatOrderResponse } from "../../../../../utils/format-order";
import Stripe from "stripe";

/**
 * POST /admin/orders/:id/cancel
 * Cancel an order by updating its status to "canceled"
 * Also processes a full refund via Stripe if the order was paid
 */
export const POST = withAdminAuth(async (req, res) => {
  const orderModule = req.scope.resolve(Modules.ORDER);
  const customerModule = req.scope.resolve(Modules.CUSTOMER);
  const orderExtensionService = req.scope.resolve(ORDER_EXTENSION_MODULE) as any;
  const pointsService = req.scope.resolve(POINTS_MODULE) as any;
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const logger = req.scope.resolve("logger") as any;

  const { id } = req.params;

  // Get the order first to verify it exists
  const orders = await orderModule.listOrders(
    { id },
    { relations: ["items", "shipping_address"] }
  );

  if (!orders || orders.length === 0) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Order with id ${id} not found`
    );
  }

  const order = orders[0];

  // Check if order can be canceled
  if (order.status === "canceled") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Order is already canceled"
    );
  }

  if (order.status === "completed" || order.status === "archived") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Cannot cancel a completed or archived order"
    );
  }

  // Check order extension for fulfillment status
  const extension = await orderExtensionService.getByOrderId(id);
  if (extension) {
    // Cannot cancel shipped orders - would need refund/return flow instead
    if (extension.fulfillment_status === "shipped") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Cannot cancel a shipped order. Please use the refund or return process instead."
      );
    }

    // Cannot cancel delivered orders
    if (extension.fulfillment_status === "delivered") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Cannot cancel a delivered order. Please use the refund or return process instead."
      );
    }

    // Cannot cancel if already cancelled in extension
    if (extension.fulfillment_status === "cancelled") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Order is already cancelled"
      );
    }
  }

  // Cancel the order by updating its status
  const updatedOrders = await orderModule.updateOrders([
    {
      id: order.id,
      status: "canceled",
    },
  ]);

  const updatedOrder = updatedOrders[0];

  // Process Stripe refund if the order was paid
  let refundResult: { refunded: boolean; stripe_refund_id?: string; error?: string } = { refunded: false };
  
  try {
    // Get the order's payment collection using Query graph API
    const { data: ordersWithPayments } = await query.graph({
      entity: "order",
      filters: { id },
      fields: [
        "id",
        "payment_collections.id",
        "payment_collections.status",
        "payment_collections.payments.id",
        "payment_collections.payments.provider_id",
        "payment_collections.payments.captured_at",
        "payment_collections.payments.data",
        "payment_collections.payments.amount",
      ],
    });

    if (ordersWithPayments && ordersWithPayments.length > 0) {
      const orderWithPayments = ordersWithPayments[0] as any;
      const paymentCollections = orderWithPayments.payment_collections || [];

      // Find a successful Stripe payment (captured)
      let stripePayment: any = null;
      for (const collection of paymentCollections) {
        const payments = collection.payments || [];
        stripePayment = payments.find(
          (p: any) =>
            p.provider_id === "pp_stripe_stripe" && p.captured_at !== null
        );
        if (stripePayment) break;
      }

      if (stripePayment) {
        // Initialize Stripe
        const stripeApiKey = process.env.STRIPE_API_KEY;
        if (stripeApiKey) {
          const stripe = new Stripe(stripeApiKey, {
            // @ts-ignore - Using latest Stripe API version
            apiVersion: "2024-12-18.acacia",
          });

          // Get the payment intent ID from the payment data
          const paymentData = stripePayment.data as any;
          const paymentIntentId = paymentData?.id;

          if (paymentIntentId) {
            // Create a full refund in Stripe
            const stripeRefund = await stripe.refunds.create({
              payment_intent: paymentIntentId,
              reason: "requested_by_customer",
              metadata: {
                order_id: id,
                cancellation_reason: "order_cancelled",
              },
            });

            refundResult = {
              refunded: true,
              stripe_refund_id: stripeRefund.id,
            };

            logger.info(
              `[CANCEL] Stripe refund processed for order ${id}: refund_id=${stripeRefund.id}, amount=${stripeRefund.amount}`
            );
          } else {
            logger.warn(`[CANCEL] Could not find payment intent ID for order ${id}`);
            refundResult.error = "Could not find payment intent ID";
          }
        } else {
          logger.warn(`[CANCEL] Stripe API key not configured, skipping refund for order ${id}`);
          refundResult.error = "Stripe API key not configured";
        }
      } else {
        logger.info(`[CANCEL] No captured Stripe payment found for order ${id}, no refund needed`);
      }
    }
  } catch (refundError: any) {
    logger.error(`[CANCEL] Error processing refund for order ${id}: ${refundError.message}`);
    refundResult.error = refundError.message;
    // Don't fail the cancellation if refund fails - order is already cancelled
  }

  // Update order extension to reflect cancelled status and payment status
  const paymentStatus = refundResult.refunded ? "refunded" : (extension?.payment_status || "awaiting");
  
  if (extension) {
    await orderExtensionService.updateOrderExtensions({
      id: extension.id,
      fulfillment_status: "cancelled",
      payment_status: paymentStatus,
    });
  } else {
    // Create extension if it doesn't exist
    await orderExtensionService.createOrderExtensions({
      order_id: id,
      payment_status: paymentStatus,
      fulfillment_status: "cancelled",
    });
  }

  // Get customer info
  let customer = null;
  if (updatedOrder.customer_id) {
    const customers = await customerModule.listCustomers({
      id: [updatedOrder.customer_id],
    });
    customer = customers[0] || null;
  }

  // Handle points adjustment for the cancelled order
  let pointsResult = null;
  if (order.customer_id) {
    try {
      // Get points earned from the original order
      const pointsEarned = await pointsService.getPointsEarnedFromOrder(
        order.customer_id,
        order.id
      );

      // Get points redeemed on the original order
      const pointsRedeemed = await pointsService.getPointsRedeemedOnOrder(
        order.customer_id,
        order.id
      );

      if (pointsEarned > 0 || pointsRedeemed > 0) {
        pointsResult = await pointsService.handleCancelOrderPoints({
          customer_id: order.customer_id,
          order_id: order.id,
          points_to_deduct: pointsEarned,
          points_to_restore: pointsRedeemed,
        });

        logger.info(
          `[CANCEL] Points adjusted for order ${id}: ` +
          `deducted=${pointsResult.points_deducted}, restored=${pointsResult.points_restored}, ` +
          `new_balance=${pointsResult.new_balance}`
        );
      }
    } catch (pointsError: any) {
      // Log but don't fail the cancellation if points adjustment fails
      logger.error(`[CANCEL] Error adjusting points for order ${id}: ${pointsError.message}`);
    }
  }

  const formattedOrder = formatOrderResponse({
    order: { ...updatedOrder, items: order.items },
    customer,
    overrides: {
      status: "cancelled",
      payment_status: paymentStatus,
      fulfillment_status: "cancelled",
    },
  });

  res.json({
    order: formattedOrder,
    points: pointsResult,
    refund: refundResult,
  });
});
