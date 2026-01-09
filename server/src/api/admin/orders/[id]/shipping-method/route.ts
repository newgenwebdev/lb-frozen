import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules, MedusaError } from "@medusajs/framework/utils";
import { withAdminAuth } from "../../../../../utils/admin-auth";

type EasyParcelShippingInfo = {
  service_id: string;
  service_name: string;
  courier_id: string;
  courier_name: string;
  courier_logo: string;
  price: number;
  price_display: string;
  pickup_date: string;
  delivery_eta: string;
  has_cod: boolean;
  has_insurance: boolean;
};

type UpdateShippingMethodBody = {
  easyparcel_shipping: EasyParcelShippingInfo;
};

/**
 * POST /admin/orders/:id/shipping-method
 * Update order metadata with selected shipping method (for free shipping orders)
 */
export const POST = withAdminAuth(async (req: MedusaRequest, res: MedusaResponse) => {
  const orderModule = req.scope.resolve(Modules.ORDER);
  const logger = req.scope.resolve("logger") as any;

  const { id } = req.params;
  const body = req.body as UpdateShippingMethodBody;

  if (!body.easyparcel_shipping) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "easyparcel_shipping is required"
    );
  }

  // Get existing order
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

  // Update order metadata with the selected shipping method
  const existingMetadata = (order.metadata || {}) as Record<string, unknown>;
  const updatedMetadata = {
    ...existingMetadata,
    easyparcel_shipping: body.easyparcel_shipping,
    // Clear the pending flags since shipping has been selected
    shipping_pending_admin_selection: false,
    free_shipping_no_method_selected: false,
  };

  // Update the order metadata
  await orderModule.updateOrders([
    {
      id: order.id,
      metadata: updatedMetadata,
    },
  ]);

  logger.info(
    `[ADMIN] Updated shipping method for order ${order.id}: ${body.easyparcel_shipping.courier_name} - ${body.easyparcel_shipping.service_name}`
  );

  res.json({
    success: true,
    message: "Shipping method updated successfully",
    order_id: order.id,
    shipping_method: body.easyparcel_shipping,
  });
});
