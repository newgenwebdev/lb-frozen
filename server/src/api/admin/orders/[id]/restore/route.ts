import type { MedusaResponse } from "@medusajs/framework/http";
import { Modules, MedusaError } from "@medusajs/framework/utils";
import { withAdminAuth } from "../../../../../utils/admin-auth";
import { formatOrderResponse } from "../../../../../utils/format-order";

/**
 * POST /admin/orders/:id/restore
 * Restore a canceled order by updating its status back to "pending"
 */
export const POST = withAdminAuth(async (req, res) => {
  const orderModule = req.scope.resolve(Modules.ORDER);
  const customerModule = req.scope.resolve(Modules.CUSTOMER);

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

  // Check if order is canceled and can be restored
  if (order.status !== "canceled") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Only canceled orders can be restored"
    );
  }

  // Restore the order by updating its status back to pending
  const updatedOrders = await orderModule.updateOrders([
    {
      id: order.id,
      status: "pending",
    },
  ]);

  const updatedOrder = updatedOrders[0];

  // Get customer info
  let customer = null;
  if (updatedOrder.customer_id) {
    const customers = await customerModule.listCustomers({
      id: [updatedOrder.customer_id],
    });
    customer = customers[0] || null;
  }

  const formattedOrder = formatOrderResponse({
    order: { ...updatedOrder, items: order.items },
    customer,
    overrides: {
      status: "pending",
      payment_status: "awaiting",
      fulfillment_status: "unfulfilled",
    },
  });

  res.json({
    order: formattedOrder,
  });
});
