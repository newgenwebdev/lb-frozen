import type { MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { ORDER_EXTENSION_MODULE } from "../../../../modules/order-extension";
import { withAdminAuth } from "../../../../utils/admin-auth";

type BulkShipBody = {
  order_ids: string[];
  courier: string;
  pickup_address: string;
  pickup_date: string;
  pickup_time: string;
};

/**
 * POST /admin/orders/bulk-ship
 * Mark multiple orders as shipped (bulk shipping / mass arrange pickup)
 */
export const POST = withAdminAuth(async (req, res) => {
  const body = req.body as BulkShipBody;

  // Validate required fields
  if (!body.order_ids || !Array.isArray(body.order_ids) || body.order_ids.length === 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "order_ids is required and must be a non-empty array"
    );
  }

  if (!body.courier) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Courier is required"
    );
  }

  const orderExtensionService = req.scope.resolve(ORDER_EXTENSION_MODULE) as any;

  // Process each order
  const results = await Promise.all(
    body.order_ids.map(async (orderId) => {
      try {
        // Generate a tracking number (in production, this would come from the courier API)
        const trackingNumber = `${body.courier.toUpperCase()}-${Date.now()}-${orderId.slice(-6)}`;

        const extension = await orderExtensionService.markAsShipped(orderId, {
          courier: body.courier,
          tracking_number: trackingNumber,
        });

        return {
          order_id: orderId,
          success: true,
          tracking_number: extension.tracking_number,
          shipped_at: extension.shipped_at,
        };
      } catch (error: any) {
        const logger = req.scope.resolve("logger");
        logger.error(`[BULK-SHIP] Failed to ship order ${orderId}: ${error.message}`);
        return {
          order_id: orderId,
          success: false,
          error: "Failed to ship order",
        };
      }
    })
  );

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  res.json({
    success: failed.length === 0,
    total: body.order_ids.length,
    shipped: successful.length,
    failed: failed.length,
    results,
    pickup_info: {
      courier: body.courier,
      pickup_address: body.pickup_address,
      pickup_date: body.pickup_date,
      pickup_time: body.pickup_time,
    },
  });
});
