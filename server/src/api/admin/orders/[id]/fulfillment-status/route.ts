import type { MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { ORDER_EXTENSION_MODULE } from "../../../../../modules/order-extension";
import { withAdminAuth } from "../../../../../utils/admin-auth";

type FulfillmentStatusBody = {
  fulfillment_status: "unfulfilled" | "processing" | "shipped" | "delivered" | "cancelled";
  courier?: string;
  tracking_number?: string;
  estimated_delivery?: string; // ISO date string
};

/**
 * PATCH /admin/orders/:id/fulfillment-status
 * Update the fulfillment status of an order
 */
export const PATCH = withAdminAuth(async (req, res) => {
  const { id } = req.params;
  const body = req.body as FulfillmentStatusBody;

  // Validate fulfillment_status
  const validStatuses = ["unfulfilled", "processing", "shipped", "delivered", "cancelled"];
  if (!body.fulfillment_status || !validStatuses.includes(body.fulfillment_status)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid fulfillment_status. Must be one of: ${validStatuses.join(", ")}`
    );
  }

  const orderExtensionService = req.scope.resolve(ORDER_EXTENSION_MODULE) as any;

  // Update fulfillment status
  const extension = await orderExtensionService.updateFulfillmentStatus({
    order_id: id,
    fulfillment_status: body.fulfillment_status,
    courier: body.courier,
    tracking_number: body.tracking_number,
    estimated_delivery: body.estimated_delivery ? new Date(body.estimated_delivery) : undefined,
  });

  res.json({
    success: true,
    order_id: id,
    fulfillment_status: extension.fulfillment_status,
    courier: extension.courier,
    tracking_number: extension.tracking_number,
    shipped_at: extension.shipped_at,
    delivered_at: extension.delivered_at,
    estimated_delivery: extension.estimated_delivery,
  });
});
