import { api } from "./client";
import {
  OrderSchema,
  OrderStatsSchema,
  OrderListResponseSchema,
  type Order,
  type OrderStats,
  type OrderListResponse,
  type OrderFilter,
  type PaymentStatus,
  type FulfillmentStatus,
  type ShipOrderRequest,
  type BulkShipRequest,
} from "@/lib/validators/order";

/**
 * Get order statistics for dashboard cards
 */
export async function getOrderStats(): Promise<OrderStats> {
  const res = await api.get("/admin/orders/stats");
  const parsed = OrderStatsSchema.safeParse(res.data);

  if (!parsed.success) {
    throw new Error("Invalid order stats response");
  }

  return parsed.data;
}

/**
 * Get paginated list of orders with filters
 */
export async function getOrders(filters?: OrderFilter): Promise<OrderListResponse> {
  const params = new URLSearchParams();

  if (filters?.status && filters.status !== "all") {
    params.append("status", filters.status);
  }

  if (filters?.payment_status && filters.payment_status !== "all") {
    params.append("payment_status", filters.payment_status);
  }

  if (filters?.fulfillment_status && filters.fulfillment_status !== "all") {
    params.append("fulfillment_status", filters.fulfillment_status);
  }

  if (filters?.date_range && filters.date_range !== "all") {
    params.append("date_range", filters.date_range);
  }

  if (filters?.search) {
    params.append("q", filters.search);
  }

  if (filters?.sort_by) {
    params.append("sort_by", filters.sort_by);
  }

  if (filters?.limit) {
    params.append("limit", filters.limit.toString());
  }

  if (filters?.offset) {
    params.append("offset", filters.offset.toString());
  }

  const res = await api.get(`/admin/custom-orders?${params.toString()}`);

  const parsed = OrderListResponseSchema.safeParse(res.data);

  if (!parsed.success) {
    console.error("Order validation failed:", parsed.error.format());
    throw new Error("Invalid orders list response");
  }

  return parsed.data;
}

/**
 * Get single order by ID
 */
export async function getOrderById(id: string): Promise<Order> {
  const res = await api.get(`/admin/orders/${id}`);
  const parsed = OrderSchema.safeParse(res.data.order);

  if (!parsed.success) {
    throw new Error(`Invalid order response: ${parsed.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
  }

  return parsed.data;
}

/**
 * Update order status (legacy)
 */
export async function updateOrderStatus(id: string, status: string): Promise<Order> {
  const res = await api.post(`/admin/orders/${id}/status`, { status });
  const parsed = OrderSchema.safeParse(res.data.order);

  if (!parsed.success) {
    throw new Error("Invalid order response");
  }

  return parsed.data;
}

/**
 * Update payment status
 */
export async function updatePaymentStatus(
  id: string,
  paymentStatus: PaymentStatus,
  paymentMethod?: string
): Promise<{ success: boolean; payment_status: PaymentStatus; paid_at: string | null }> {
  const res = await api.patch(`/admin/orders/${id}/payment-status`, {
    payment_status: paymentStatus,
    payment_method: paymentMethod,
  });

  return res.data;
}

/**
 * Update fulfillment status
 */
export async function updateFulfillmentStatus(
  id: string,
  fulfillmentStatus: FulfillmentStatus,
  options?: {
    courier?: string;
    tracking_number?: string;
    estimated_delivery?: string;
  }
): Promise<{
  success: boolean;
  fulfillment_status: FulfillmentStatus;
  courier: string | null;
  tracking_number: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
}> {
  const res = await api.patch(`/admin/orders/${id}/fulfillment-status`, {
    fulfillment_status: fulfillmentStatus,
    ...options,
  });

  return res.data;
}

/**
 * Mark order as shipped
 */
export async function shipOrder(
  id: string,
  data: ShipOrderRequest
): Promise<{
  success: boolean;
  fulfillment_status: FulfillmentStatus;
  courier: string;
  tracking_number: string;
  shipped_at: string;
  estimated_delivery: string | null;
}> {
  const res = await api.post(`/admin/orders/${id}/ship`, data);
  return res.data;
}

/**
 * Mark order as delivered
 */
export async function markAsDelivered(id: string): Promise<{
  success: boolean;
  fulfillment_status: FulfillmentStatus;
  delivered_at: string;
}> {
  const res = await api.patch(`/admin/orders/${id}/fulfillment-status`, {
    fulfillment_status: "delivered",
  });
  return res.data;
}

/**
 * Bulk ship multiple orders
 */
export async function bulkShipOrders(data: BulkShipRequest): Promise<{
  success: boolean;
  total: number;
  shipped: number;
  failed: number;
  results: Array<{
    order_id: string;
    success: boolean;
    tracking_number?: string;
    shipped_at?: string;
    error?: string;
  }>;
  pickup_info: {
    courier: string;
    pickup_address: string;
    pickup_date: string;
    pickup_time: string;
  };
}> {
  const res = await api.post("/admin/orders/bulk-ship", data);
  return res.data;
}

/**
 * Cancel order
 */
export async function cancelOrder(id: string): Promise<{
  order: Order;
  points?: {
    points_deducted: number;
    points_restored: number;
    new_balance: number;
  } | null;
}> {
  const res = await api.post(`/admin/orders/${id}/cancel`);
  const parsed = OrderSchema.safeParse(res.data.order);

  if (!parsed.success) {
    throw new Error("Invalid order response");
  }

  return {
    order: parsed.data,
    points: res.data.points || null,
  };
}

/**
 * Restore a canceled order
 */
export async function restoreOrder(id: string): Promise<Order> {
  const res = await api.post(`/admin/orders/${id}/restore`);
  const parsed = OrderSchema.safeParse(res.data.order);

  if (!parsed.success) {
    throw new Error("Invalid order response");
  }

  return parsed.data;
}

/**
 * Bulk mark multiple orders as delivered
 */
export async function bulkMarkAsDelivered(orderIds: string[]): Promise<{
  success: boolean;
  total: number;
  delivered: number;
  failed: number;
  results: Array<{
    order_id: string;
    success: boolean;
    delivered_at?: string;
    error?: string;
  }>;
}> {
  const res = await api.post("/admin/orders/bulk-deliver", {
    order_ids: orderIds,
  });
  return res.data;
}

/**
 * Update order shipping method (for free shipping orders)
 */
export type EasyParcelShippingInfo = {
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

export async function updateOrderShippingMethod(
  id: string,
  shippingInfo: EasyParcelShippingInfo
): Promise<{
  success: boolean;
  message: string;
  order_id: string;
  shipping_method: EasyParcelShippingInfo;
}> {
  const res = await api.post(`/admin/orders/${id}/shipping-method`, {
    easyparcel_shipping: shippingInfo,
  });
  return res.data;
}

/**
 * Export orders to CSV
 */
export async function exportOrdersCSV(filters?: OrderFilter): Promise<Blob> {
  const params = new URLSearchParams();

  if (filters?.status && filters.status !== "all") {
    params.append("status", filters.status);
  }

  if (filters?.payment_status && filters.payment_status !== "all") {
    params.append("payment_status", filters.payment_status);
  }

  if (filters?.fulfillment_status && filters.fulfillment_status !== "all") {
    params.append("fulfillment_status", filters.fulfillment_status);
  }

  if (filters?.search) {
    params.append("q", filters.search);
  }

  const res = await api.get(`/admin/orders/export?${params.toString()}`, {
    responseType: "blob",
  });

  return res.data;
}
