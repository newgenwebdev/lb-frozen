import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

/**
 * POST /store/orders/:id/capture-payment
 *
 * Captures payment for an order. This is used for manual payment provider
 * to automatically mark orders as paid after checkout completion.
 *
 * This endpoint is meant for use with pp_system_default (manual payment).
 * When using a real payment provider like Stripe, payment capture happens
 * through the payment provider's flow.
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { id: orderId } = req.params;
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  try {
    // Get the order with payment collections
    const { data: orders } = await query.graph({
      entity: "order",
      filters: { id: orderId },
      fields: [
        "id",
        "payment_collections.id",
        "payment_collections.status",
        "payment_collections.payments.id",
        "payment_collections.payments.captured_at",
        "payment_collections.payments.amount",
      ],
    });

    if (!orders || orders.length === 0) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    const order = orders[0];
    const paymentCollections = order.payment_collections || [];

    if (paymentCollections.length === 0) {
      res.status(400).json({ message: "No payment collection found for order" });
      return;
    }

    // Get the payment module service
    const paymentModuleService = req.scope.resolve("payment");

    let capturedCount = 0;

    // Capture all uncaptured payments
    for (const collection of paymentCollections) {
      const payments = collection.payments || [];

      for (const payment of payments) {
        if (!payment.captured_at) {
          try {
            // Capture the payment
            await paymentModuleService.capturePayment({
              payment_id: payment.id,
              amount: payment.amount,
            });
            capturedCount++;
          } catch (captureError) {
            console.error(`Failed to capture payment ${payment.id}:`, captureError);
            // Continue with other payments
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Captured ${capturedCount} payment(s)`,
      order_id: orderId,
    });
  } catch (error) {
    console.error("Failed to capture payment:", error);
    res.status(500).json({
      message: "Failed to capture payment",
    });
  }
}
