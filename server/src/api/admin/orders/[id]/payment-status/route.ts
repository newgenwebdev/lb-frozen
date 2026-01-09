import type { MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { ORDER_EXTENSION_MODULE } from "../../../../../modules/order-extension";
import { withAdminAuth } from "../../../../../utils/admin-auth";

type PaymentStatusBody = {
  payment_status: "awaiting" | "paid" | "refunded" | "partially_refunded";
  payment_method?: string;
};

/**
 * PATCH /admin/orders/:id/payment-status
 * Update the payment status of an order
 */
export const PATCH = withAdminAuth(async (req, res) => {
  const { id } = req.params;
  const body = req.body as PaymentStatusBody;

  // Validate payment_status
  const validStatuses = ["awaiting", "paid", "refunded", "partially_refunded"];
  if (!body.payment_status || !validStatuses.includes(body.payment_status)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid payment_status. Must be one of: ${validStatuses.join(", ")}`
    );
  }

  const orderExtensionService = req.scope.resolve(ORDER_EXTENSION_MODULE) as any;

  // Update payment status
  const extension = await orderExtensionService.updatePaymentStatus({
    order_id: id,
    payment_status: body.payment_status,
    payment_method: body.payment_method,
    paid_at: body.payment_status === "paid" ? new Date() : undefined,
  });

  res.json({
    success: true,
    order_id: id,
    payment_status: extension.payment_status,
    paid_at: extension.paid_at,
  });
});
