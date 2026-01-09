import type { MedusaResponse } from "@medusajs/framework/http";
import { Modules, MedusaError } from "@medusajs/framework/utils";
import { RETURN_MODULE } from "../../../modules/return";
import { ORDER_EXTENSION_MODULE } from "../../../modules/order-extension";
import { withAdminAuth } from "../../../utils/admin-auth";
import { formatCustomerName } from "../../../utils/format-customer";

type ReturnItem = {
  item_id: string;
  variant_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
};

type CreateReturnBody = {
  order_id: string;
  return_type: "refund" | "replacement";
  reason: "defective" | "wrong_item" | "not_as_described" | "changed_mind" | "other";
  reason_details?: string;
  items: ReturnItem[];
  refund_amount: number;
  shipping_refund?: number;
  admin_notes?: string;
};

/**
 * GET /admin/returns
 * List all returns with filters
 */
export const GET = withAdminAuth(async (req, res) => {
  const returnService = req.scope.resolve(RETURN_MODULE) as any;
  const orderModule = req.scope.resolve(Modules.ORDER);
  const customerModule = req.scope.resolve(Modules.CUSTOMER);

  // Get query parameters
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = parseInt(req.query.offset as string) || 0;
  const status = req.query.status as string | undefined;
  const orderId = req.query.order_id as string | undefined;
  const search = req.query.q as string | undefined;
  const sortBy = (req.query.sort_by as string) || "newest";

  // Build filters
  const filters: Record<string, unknown> = {};
  if (status && status !== "all") {
    filters.status = status;
  }
  if (orderId) {
    filters.order_id = orderId;
  }

  // Determine sort order
  let orderBy: Record<string, "ASC" | "DESC"> = { requested_at: "DESC" };
  if (sortBy === "oldest") {
    orderBy = { requested_at: "ASC" };
  }

  // Query returns
  const [returns, totalCount] = await returnService.listAndCountReturns(
    filters,
    {
      take: limit,
      skip: offset,
      order: orderBy,
    }
  );

  // Get unique order and customer IDs
  const orderIds = Array.from(new Set(returns.map((r: any) => r.order_id))) as string[];
  const customerIds = Array.from(new Set(returns.map((r: any) => r.customer_id))) as string[];

  // Fetch orders and customers in parallel
  const [orders, customers] = await Promise.all([
    orderIds.length > 0 ? orderModule.listOrders({ id: orderIds }) : [],
    customerIds.length > 0 ? customerModule.listCustomers({ id: customerIds }) : [],
  ]);

  // Create maps for quick lookup
  const orderMap = new Map<string, any>(
    (orders as any[]).map((o: any) => [o.id, o] as [string, any])
  );
  const customerMap = new Map<string, any>(
    (customers as any[]).map((c: any) => [c.id, c] as [string, any])
  );

  // Format returns
  let formattedReturns = returns.map((returnRequest: any) => {
    const order = orderMap.get(returnRequest.order_id);
    const customer = customerMap.get(returnRequest.customer_id);

    return {
      id: returnRequest.id,
      order_id: returnRequest.order_id,
      order_display_id: order?.display_id || 0,
      customer_id: returnRequest.customer_id,
      customer_name: formatCustomerName(customer),
      customer_email: customer?.email || "",
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
      created_at: returnRequest.created_at,
      updated_at: returnRequest.updated_at,
    };
  });

  // Filter by search if provided
  if (search) {
    const searchLower = search.toLowerCase();
    formattedReturns = formattedReturns.filter(
      (returnRequest: any) =>
        returnRequest.customer_name.toLowerCase().includes(searchLower) ||
        returnRequest.customer_email.toLowerCase().includes(searchLower) ||
        String(returnRequest.order_display_id).includes(searchLower) ||
        returnRequest.id.toLowerCase().includes(searchLower)
    );
  }

  res.json({
    returns: formattedReturns,
    count: search ? formattedReturns.length : totalCount,
    limit,
    offset,
  });
});

/**
 * POST /admin/returns
 * Create a new return request
 */
export const POST = withAdminAuth(async (req, res) => {
  const returnService = req.scope.resolve(RETURN_MODULE) as any;
  const orderModule = req.scope.resolve(Modules.ORDER);
  const orderExtensionService = req.scope.resolve(ORDER_EXTENSION_MODULE) as any;

  const body = req.body as CreateReturnBody;

  // Validate required fields
  if (!body.order_id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Order ID is required");
  }
  if (!body.items || body.items.length === 0) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "At least one item is required");
  }
  if (!body.reason) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Reason is required");
  }

  // Get the order with items and adjustments
  const orders = await orderModule.listOrders(
    { id: body.order_id },
    { relations: ["items", "items.adjustments"] }
  );

  if (!orders || orders.length === 0) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order not found");
  }

  const order = orders[0] as any;

  // Check if order is delivered (only delivered orders can be returned)
  const extension = await orderExtensionService.getByOrderId(body.order_id);
  if (!extension || extension.fulfillment_status !== "delivered") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Only delivered orders can be returned"
    );
  }

  // Check 30-day return window
  const deliveredAt = extension.delivered_at;
  if (deliveredAt) {
    const daysSinceDelivery = Math.floor(
      (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceDelivery > 30) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Return window has expired (30 days)"
      );
    }
  }

  // Check if order already has a pending return
  const hasExisting = await returnService.hasExistingPendingReturn(body.order_id);
  if (hasExisting) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "This order already has a pending return request"
    );
  }

  // Calculate original order discount information
  const orderItems = order.items || [];

  // Calculate gross total (before discounts)
  const originalOrderTotal = orderItems.reduce((sum: number, item: any) => {
    return sum + (Number(item.unit_price) || 0) * (Number(item.quantity) || 0);
  }, 0);

  // Calculate PWP discount (item-level)
  const pwpDiscount = orderItems.reduce((sum: number, item: any) => {
    if (item.metadata?.is_pwp_item && item.metadata?.pwp_discount_amount) {
      return sum + Number(item.metadata.pwp_discount_amount) * (Number(item.quantity) || 1);
    }
    return sum;
  }, 0);

  // Calculate adjustment discount (from item.adjustments - coupons)
  const adjustmentDiscount = orderItems.reduce((sum: number, item: any) => {
    return sum + (item.adjustments || []).reduce(
      (adjSum: number, adj: any) => adjSum + (Number(adj.amount) || 0), 0
    );
  }, 0);

  // Get coupon and points info from order metadata
  const orderMetadata = order.metadata || {};
  const couponCode = orderMetadata.coupon_code || null;
  const couponDiscount = adjustmentDiscount > 0
    ? adjustmentDiscount
    : (Number(orderMetadata.applied_coupon_discount) || 0);
  const pointsRedeemed = Number(orderMetadata.points_to_redeem) || 0;
  const pointsDiscount = Number(orderMetadata.points_discount_amount) || 0;

  // Create return request with discount info
  const returnRequest = await returnService.createReturnRequest({
    order_id: body.order_id,
    customer_id: order.customer_id || "",
    return_type: body.return_type || "refund",
    reason: body.reason,
    reason_details: body.reason_details,
    items: body.items,
    refund_amount: body.refund_amount || 0,
    shipping_refund: body.shipping_refund || 0,
    admin_notes: body.admin_notes,
    // Original order discount info
    original_order_total: originalOrderTotal,
    coupon_code: couponCode,
    coupon_discount: couponDiscount,
    points_redeemed: pointsRedeemed,
    points_discount: pointsDiscount,
    pwp_discount: pwpDiscount,
  });

  res.status(201).json({
    return: returnRequest,
  });
});
