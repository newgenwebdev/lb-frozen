import type { MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { ORDER_EXTENSION_MODULE } from "../../../../../modules/order-extension";
import { withAdminAuth } from "../../../../../utils/admin-auth";

type ShipOrderBody = {
  courier: string;
  tracking_number: string;
  estimated_delivery?: string; // ISO date string
};

/**
 * POST /admin/orders/:id/ship
 * Mark an order as shipped with tracking information
 */
export const POST = withAdminAuth(async (req, res) => {
  const { id } = req.params;
  const body = req.body as ShipOrderBody;

  // Validate required fields
  if (!body.courier) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Courier is required"
    );
  }

  if (!body.tracking_number) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Tracking number is required"
    );
  }

  const orderExtensionService = req.scope.resolve(ORDER_EXTENSION_MODULE) as any;

  // Mark as shipped
  const extension = await orderExtensionService.markAsShipped(id, {
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
    estimated_delivery: extension.estimated_delivery,
  });
});
