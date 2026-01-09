import { z } from "zod";

// Return status type definitions
export const ReturnStatusSchema = z.enum([
  "requested",
  "approved",
  "rejected",
  "in_transit",
  "received",
  "inspecting",
  "completed",
  "cancelled",
]);

export const ReturnTypeSchema = z.enum(["refund", "replacement"]);

export const ReturnReasonSchema = z.enum([
  "defective",
  "wrong_item",
  "not_as_described",
  "changed_mind",
  "other",
]);

export const RefundStatusSchema = z.enum(["pending", "processing", "completed", "failed"]);

export type ReturnStatus = z.infer<typeof ReturnStatusSchema>;
export type ReturnType = z.infer<typeof ReturnTypeSchema>;
export type ReturnReason = z.infer<typeof ReturnReasonSchema>;
export type RefundStatus = z.infer<typeof RefundStatusSchema>;

// Return Item Schema
export const ReturnItemSchema = z.object({
  item_id: z.string(),
  variant_id: z.string(),
  product_name: z.string(),
  quantity: z.number(),
  unit_price: z.number(),
  thumbnail: z.string().nullable().optional(),
});

export type ReturnItem = z.infer<typeof ReturnItemSchema>;

// Return Schema
export const ReturnSchema = z.object({
  id: z.string(),
  order_id: z.string(),
  customer_id: z.string(),
  status: ReturnStatusSchema,
  return_type: ReturnTypeSchema,
  reason: ReturnReasonSchema,
  reason_details: z.string().nullable(),
  items: z.array(ReturnItemSchema),
  refund_amount: z.number(),
  shipping_refund: z.number(),
  total_refund: z.number(),
  // Original order discount info
  original_order_total: z.number().optional(),
  coupon_code: z.string().nullable().optional(),
  coupon_discount: z.number().optional(),
  points_redeemed: z.number().optional(),
  points_discount: z.number().optional(),
  pwp_discount: z.number().optional(),
  return_tracking_number: z.string().nullable(),
  return_courier: z.string().nullable(),
  requested_at: z.union([z.string(), z.date()]),
  approved_at: z.union([z.string(), z.date()]).nullable(),
  rejected_at: z.union([z.string(), z.date()]).nullable(),
  received_at: z.union([z.string(), z.date()]).nullable(),
  completed_at: z.union([z.string(), z.date()]).nullable(),
  admin_notes: z.string().nullable(),
  rejection_reason: z.string().nullable(),
  refund_status: RefundStatusSchema.nullable(),
  stripe_refund_id: z.string().nullable(),
  refunded_at: z.union([z.string(), z.date()]).nullable(),
  // Replacement order info
  replacement_order_id: z.string().nullable().optional(),
  replacement_created_at: z.union([z.string(), z.date()]).nullable().optional(),
  replacement_order: z.object({
    id: z.string(),
    display_id: z.number(),
    status: z.string(),
    created_at: z.union([z.string(), z.date()]),
  }).nullable().optional(),
  created_at: z.union([z.string(), z.date()]),
  updated_at: z.union([z.string(), z.date()]),
  // Joined data
  order_display_id: z.number().optional(),
  customer_name: z.string().optional(),
  customer_email: z.string().optional(),
});

export type Return = z.infer<typeof ReturnSchema>;

// Return Stats Schema
export const ReturnStatsSchema = z.object({
  total_returns: z.number(),
  pending_returns: z.number(),
  in_progress: z.number(),
  completed: z.number(),
  total_refunded: z.number(),
  currency: z.string().optional(),
});

export type ReturnStats = z.infer<typeof ReturnStatsSchema>;

// Return List Response Schema
export const ReturnListResponseSchema = z.object({
  returns: z.array(ReturnSchema),
  count: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export type ReturnListResponse = z.infer<typeof ReturnListResponseSchema>;

// Return Filter Schema
export const ReturnFilterSchema = z.object({
  status: z.enum([
    "all",
    "requested",
    "approved",
    "rejected",
    "in_transit",
    "received",
    "inspecting",
    "completed",
    "cancelled",
  ]).optional(),
  return_type: z.enum(["all", "refund", "replacement"]).optional(),
  date_range: z.enum([
    "all",
    "today",
    "yesterday",
    "this_week",
    "last_week",
    "this_month",
    "last_month",
  ]).optional(),
  search: z.string().optional(),
  order_id: z.string().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});

export type ReturnFilter = z.infer<typeof ReturnFilterSchema>;

// Create Return Request
export const CreateReturnRequestSchema = z.object({
  order_id: z.string(),
  return_type: ReturnTypeSchema,
  reason: ReturnReasonSchema,
  reason_details: z.string().optional(),
  items: z.array(z.object({
    item_id: z.string(),
    variant_id: z.string(),
    product_name: z.string(),
    quantity: z.number().min(1),
    unit_price: z.number(),
    thumbnail: z.string().nullable().optional(),
  })),
  refund_amount: z.number().min(0),
  shipping_refund: z.number().min(0).optional(),
  admin_notes: z.string().optional(),
});

export type CreateReturnRequest = z.infer<typeof CreateReturnRequestSchema>;

// Approve Return Request
export type ApproveReturnRequest = {
  admin_notes?: string;
};

// Reject Return Request
export type RejectReturnRequest = {
  rejection_reason: string;
};

// Mark In Transit Request
export type MarkInTransitRequest = {
  courier: string;
  tracking_number: string;
};

// Complete Return Request
export type CompleteReturnRequest = {
  admin_notes?: string;
};

// Discount Info Schema for Can Return Response
export const DiscountInfoSchema = z.object({
  original_order_total: z.number(),
  coupon_code: z.string().nullable(),
  coupon_discount: z.number(),
  points_redeemed: z.number(),
  points_discount: z.number(),
  pwp_discount: z.number(),
  total_discounts: z.number(),
  actual_paid_for_items: z.number(),
});

export type DiscountInfo = z.infer<typeof DiscountInfoSchema>;

// Can Return Response
export const CanReturnResponseSchema = z.object({
  can_return: z.boolean(),
  reason: z.string().optional(),
  order_id: z.string(),
  days_remaining: z.number().optional(),
  delivered_at: z.union([z.string(), z.date()]).optional(),
  returnable_items: z.array(z.object({
    item_id: z.string(),
    variant_id: z.string(),
    product_name: z.string(),
    original_quantity: z.number(),
    returned_quantity: z.number(),
    returnable_quantity: z.number(),
    unit_price: z.number(),
    refund_per_unit: z.number().optional(),
    refund_total: z.number().optional(), // Exact total for all returnable units (no rounding error)
    refund_remainder: z.number().optional(), // Cents lost due to per-unit rounding
    thumbnail: z.string().nullable().optional(),
  })).optional(),
  discount_info: DiscountInfoSchema.optional(),
});

export type CanReturnResponse = z.infer<typeof CanReturnResponseSchema>;

// Return reason labels for display
export const returnReasonLabels: Record<ReturnReason, string> = {
  defective: "Defective/Damaged",
  wrong_item: "Wrong Item Received",
  not_as_described: "Not As Described",
  changed_mind: "Changed Mind",
  other: "Other",
};

// Return status labels for display
export const returnStatusLabels: Record<ReturnStatus, string> = {
  requested: "Requested",
  approved: "Approved",
  rejected: "Rejected",
  in_transit: "In Transit",
  received: "Received",
  inspecting: "Inspecting",
  completed: "Completed",
  cancelled: "Cancelled",
};

// Return type labels for display
export const returnTypeLabels: Record<ReturnType, string> = {
  refund: "Refund",
  replacement: "Replacement",
};
