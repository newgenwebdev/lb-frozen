import { z } from "zod";

// Status type definitions
// Note: Medusa 2.x uses "captured" instead of "paid" for successful payments
// "authorized" means payment is pending capture
export const PaymentStatusSchema = z.enum(["awaiting", "paid", "captured", "authorized", "refunded", "partially_refunded"]);
export const FulfillmentStatusSchema = z.enum(["unfulfilled", "processing", "shipped", "delivered", "cancelled"]);

export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
export type FulfillmentStatus = z.infer<typeof FulfillmentStatusSchema>;

// Order Item Schema
export const OrderItemSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  variant_id: z.string(),
  product_name: z.string(),
  variant_title: z.string().nullable(),
  thumbnail: z.string().nullable(),
  quantity: z.number(),
  unit_price: z.number(),
  effective_price: z.number().optional(), // Price after PWP discount
  total: z.number(),
  sku: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(), // Item metadata (PWP info)
});

export type OrderItem = z.infer<typeof OrderItemSchema>;

// Shipping Address Schema
export const ShippingAddressSchema = z.object({
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  address_1: z.string().nullable(),
  address_2: z.string().nullable(),
  city: z.string().nullable(),
  province: z.string().nullable(),
  postal_code: z.string().nullable(),
  country_code: z.string().nullable(),
  phone: z.string().nullable(),
});

export type ShippingAddress = z.infer<typeof ShippingAddressSchema>;

// Order Schema
export const OrderSchema = z.object({
  id: z.string(),
  display_id: z.number(),
  customer_id: z.string(),
  customer_name: z.string(),
  customer_email: z.string(),
  customer_phone: z.string().nullable(),
  // Status from Medusa 2.x: pending, completed, draft, archived, canceled, requires_action
  // Server maps "canceled" to "cancelled" for frontend consistency
  // Also include legacy statuses for backwards compatibility
  status: z.enum(["pending", "processing", "completed", "cancelled", "refunded", "draft", "archived", "requires_action"]),
  // New separate statuses
  payment_status: PaymentStatusSchema,
  fulfillment_status: FulfillmentStatusSchema,
  // Payment info
  payment_method: z.string().nullable(),
  paid_at: z.union([z.string(), z.date()]).nullable().optional(),
  // Shipping info
  shipping_method: z.string().nullable(),
  shipping_channel: z.string().nullable(),
  courier: z.string().nullable().optional(),
  tracking_number: z.string().nullable(),
  shipped_at: z.union([z.string(), z.date()]).nullable().optional(),
  delivered_at: z.union([z.string(), z.date()]).nullable().optional(),
  estimated_delivery: z.union([z.string(), z.date()]).nullable().optional(),
  // Shipping address (recipient info - may differ from customer account)
  shipping_address: ShippingAddressSchema.nullable().optional(),
  // Totals
  subtotal: z.number(),
  shipping_total: z.number(),
  tax_total: z.number(),
  discount_total: z.number(),
  coupon_code: z.string().nullable().optional(),
  total: z.number(),
  currency: z.string(),
  // Items
  items_count: z.number(),
  items: z.array(OrderItemSchema).optional(),
  // Metadata
  metadata: z.record(z.string(), z.unknown()).nullable().optional(), // Order metadata (points, coupons, etc.)
  has_rating: z.boolean().optional(),
  created_at: z.union([z.string(), z.date()]),
  updated_at: z.union([z.string(), z.date()]),
});

export type Order = z.infer<typeof OrderSchema>;

// Order Stats Schema (updated with new metrics)
export const OrderStatsSchema = z.object({
  // Primary stats (new)
  total_orders: z.number(),
  total_revenue: z.number(),
  awaiting_payment: z.number().optional(),
  ready_to_ship: z.number().optional(),
  in_transit: z.number().optional(),
  completed: z.number().optional(),
  // Legacy stats (backwards compatibility)
  paid_orders: z.number(),
  unpaid_orders: z.number(),
  pending_orders: z.number(),
  refunded_orders: z.number(),
  currency: z.string(),
  paid_percentage: z.number(),
});

export type OrderStats = z.infer<typeof OrderStatsSchema>;

// Order List Response Schema
export const OrderListResponseSchema = z.object({
  orders: z.array(OrderSchema),
  count: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export type OrderListResponse = z.infer<typeof OrderListResponseSchema>;

// Order Filter Schema (updated with fulfillment_status)
export const OrderFilterSchema = z.object({
  status: z.enum(["all", "pending", "processing", "completed", "cancelled", "refunded", "draft", "archived", "requires_action"]).optional(),
  payment_status: z.enum(["all", "awaiting", "paid", "captured", "refunded", "partially_refunded"]).optional(),
  fulfillment_status: z.enum(["all", "unfulfilled", "processing", "shipped", "delivered", "cancelled"]).optional(),
  date_range: z.enum(["all", "today", "yesterday", "this_week", "last_week", "this_month", "last_month"]).optional(),
  search: z.string().optional(),
  sort_by: z.enum(["newest", "oldest", "highest", "lowest"]).optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});

export type OrderFilter = z.infer<typeof OrderFilterSchema>;

// Status update request types
export type UpdatePaymentStatusRequest = {
  payment_status: PaymentStatus;
  payment_method?: string;
};

export type UpdateFulfillmentStatusRequest = {
  fulfillment_status: FulfillmentStatus;
  courier?: string;
  tracking_number?: string;
  estimated_delivery?: string;
};

export type ShipOrderRequest = {
  courier: string;
  tracking_number: string;
  estimated_delivery?: string;
};

export type BulkShipRequest = {
  order_ids: string[];
  courier: string;
  pickup_date: string;
  pickup_time: string;
};
