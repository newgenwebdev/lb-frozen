import type { MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { ORDER_EXTENSION_MODULE } from "../../../../modules/order-extension";
import { withAdminAuth } from "../../../../utils/admin-auth";

type BulkDeliverBody = {
  order_ids: string[];
};

/**
 * POST /admin/orders/bulk-deliver
 * Mark multiple shipped orders as delivered (bulk delivery confirmation)
 */
export const POST = withAdminAuth(async (req, res) => {
  const body = req.body as BulkDeliverBody;

  // Validate required fields
  if (!body.order_ids || !Array.isArray(body.order_ids) || body.order_ids.length === 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "order_ids is required and must be a non-empty array"
    );
  }

  const orderExtensionService = req.scope.resolve(ORDER_EXTENSION_MODULE) as any;

  // Process each order
  const results = await Promise.all(
    body.order_ids.map(async (orderId) => {
      try {
        const extension = await orderExtensionService.markAsDelivered(orderId);

        return {
          order_id: orderId,
          success: true,
          delivered_at: extension.delivered_at,
        };
      } catch (error: any) {
        const logger = req.scope.resolve("logger");
        logger.error(`[BULK-DELIVER] Failed to deliver order ${orderId}: ${error.message}`);
        return {
          order_id: orderId,
          success: false,
          error: "Failed to mark order as delivered",
        };
      }
    })
  );

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  res.json({
    success: failed.length === 0,
    total: body.order_ids.length,
    delivered: successful.length,
    failed: failed.length,
    results,
  });
});
