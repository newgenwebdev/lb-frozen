import { model } from "@medusajs/framework/utils"

/**
 * ReturnRequest Model
 * Tracks return requests and their lifecycle from request to completion
 * Supports both refund and replacement return types
 * Named "return_request" to avoid conflicts with Medusa's built-in Return module
 */
const Return = model.define("return_request", {
  id: model.id().primaryKey(),
  order_id: model.text(),          // Links to Medusa's order.id
  customer_id: model.text(),       // Links to customer

  // Return status lifecycle
  status: model.enum([
    "requested",     // Admin created return request
    "approved",      // Return approved, awaiting product
    "rejected",      // Return rejected
    "in_transit",    // Customer shipped product back
    "received",      // Warehouse received product
    "inspecting",    // Inspecting product condition
    "completed",     // Return completed (refund/replacement issued)
    "cancelled"      // Return cancelled
  ]).default("requested"),

  // Return type
  return_type: model.enum([
    "refund",        // Money back
    "replacement"    // Send new product
  ]).default("refund"),

  // Reason for return
  reason: model.enum([
    "defective",        // Product defective/damaged
    "wrong_item",       // Wrong item received
    "not_as_described", // Not as described
    "changed_mind",     // Customer changed mind
    "other"
  ]),
  reason_details: model.text().nullable(),

  // Items being returned (JSON array)
  // Format: [{item_id, variant_id, product_name, quantity, unit_price}]
  items: model.json(),

  // Financial information
  refund_amount: model.bigNumber().default(0),      // Product refund in cents
  shipping_refund: model.bigNumber().default(0),    // Shipping refund (if seller pays)
  total_refund: model.bigNumber().default(0),       // Total refund amount

  // Original order discount information (for display purposes)
  original_order_total: model.bigNumber().default(0),     // Original order gross total
  coupon_code: model.text().nullable(),                   // Applied coupon code
  coupon_discount: model.bigNumber().default(0),          // Coupon discount amount
  points_redeemed: model.bigNumber().default(0),          // Points redeemed
  points_discount: model.bigNumber().default(0),          // Points discount amount
  pwp_discount: model.bigNumber().default(0),             // PWP (Purchase with Purchase) discount

  // Return shipping info (customer → warehouse)
  return_tracking_number: model.text().nullable(),
  return_courier: model.text().nullable(),

  // Timestamps
  requested_at: model.dateTime(),
  approved_at: model.dateTime().nullable(),
  rejected_at: model.dateTime().nullable(),
  received_at: model.dateTime().nullable(),
  completed_at: model.dateTime().nullable(),

  // Admin notes
  admin_notes: model.text().nullable(),
  rejection_reason: model.text().nullable(),

  // Refund processing info
  refund_status: model.enum([
    "pending",       // Awaiting refund
    "processing",    // Processing with payment gateway
    "completed",     // Refund issued
    "failed"         // Refund failed
  ]).nullable(),
  stripe_refund_id: model.text().nullable(),
  refunded_at: model.dateTime().nullable(),

  // Replacement order info (for return_type: "replacement")
  replacement_order_id: model.text().nullable(),    // Links to new replacement order
  replacement_created_at: model.dateTime().nullable(),
})

export default Return
