import type { MedusaResponse } from "@medusajs/framework/http";
import { Modules, MedusaError } from "@medusajs/framework/utils";
import { RETURN_MODULE } from "../../../../modules/return";
import { withAdminAuth } from "../../../../utils/admin-auth";
import { formatCustomerName } from "../../../../utils/format-customer";

/**
 * GET /admin/returns/:id
 * Get a single return by ID
 */
export const GET = withAdminAuth(async (req, res) => {
  const returnService = req.scope.resolve(RETURN_MODULE) as any;
  const orderModule = req.scope.resolve(Modules.ORDER);
  const customerModule = req.scope.resolve(Modules.CUSTOMER);

  const { id } = req.params;

  // Get the return
  const returnRequest = await returnService.getReturn(id);

  if (!returnRequest) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Return not found");
  }

  // Get order and customer details
  const [orders, customers] = await Promise.all([
    orderModule.listOrders({ id: returnRequest.order_id }),
    customerModule.listCustomers({ id: [returnRequest.customer_id] }),
  ]);

  const order = orders[0];
  const customer = customers[0];

  // Get replacement order details if exists
  let replacementOrder = null;
  if (returnRequest.replacement_order_id) {
    const replacementOrders = await orderModule.listOrders({
      id: returnRequest.replacement_order_id,
    });
    if (replacementOrders && replacementOrders.length > 0) {
      const ro = replacementOrders[0];
      replacementOrder = {
        id: ro.id,
        display_id: ro.display_id,
        status: ro.status,
        created_at: ro.created_at,
      };
    }
  }

  res.json({
    return: {
      id: returnRequest.id,
      order_id: returnRequest.order_id,
      order_display_id: order?.display_id || 0,
      customer_id: returnRequest.customer_id,
      customer_name: formatCustomerName(customer),
      customer_email: customer?.email || "",
      customer_phone: customer?.phone || null,
      status: returnRequest.status,
      return_type: returnRequest.return_type,
      reason: returnRequest.reason,
      reason_details: returnRequest.reason_details,
      items: returnRequest.items || [],
      refund_amount: Number(returnRequest.refund_amount) || 0,
      shipping_refund: Number(returnRequest.shipping_refund) || 0,
      total_refund: Number(returnRequest.total_refund) || 0,
      // Original order discount info
      original_order_total: Number(returnRequest.original_order_total) || 0,
      coupon_code: returnRequest.coupon_code,
      coupon_discount: Number(returnRequest.coupon_discount) || 0,
      points_redeemed: Number(returnRequest.points_redeemed) || 0,
      points_discount: Number(returnRequest.points_discount) || 0,
      pwp_discount: Number(returnRequest.pwp_discount) || 0,
      return_tracking_number: returnRequest.return_tracking_number,
      return_courier: returnRequest.return_courier,
      requested_at: returnRequest.requested_at,
      approved_at: returnRequest.approved_at,
      rejected_at: returnRequest.rejected_at,
      received_at: returnRequest.received_at,
      completed_at: returnRequest.completed_at,
      admin_notes: returnRequest.admin_notes,
      rejection_reason: returnRequest.rejection_reason,
      refund_status: returnRequest.refund_status,
      stripe_refund_id: returnRequest.stripe_refund_id,
      refunded_at: returnRequest.refunded_at,
      // Replacement order info
      replacement_order_id: returnRequest.replacement_order_id,
      replacement_created_at: returnRequest.replacement_created_at,
      replacement_order: replacementOrder,
      created_at: returnRequest.created_at,
      updated_at: returnRequest.updated_at,
    },
  });
});
