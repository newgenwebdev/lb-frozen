import { model } from "@medusajs/framework/utils"

/**
 * Order Extension Model
 * Stores additional order status fields that aren't in the core Medusa Order model
 * - payment_status: tracks payment lifecycle separately
 * - fulfillment_status: tracks shipping/delivery lifecycle
 * - tracking info: courier, tracking number, shipping dates
 */
const OrderExtension = model.define("order_extension", {
  id: model.id().primaryKey(),
  order_id: model.text().unique(), // Links to Medusa's order.id

  // Separate status tracking
  payment_status: model.enum([
    "awaiting",     // Waiting for payment
    "paid",         // Payment received
    "refunded",     // Full refund issued
    "partially_refunded" // Partial refund issued
  ]).default("awaiting"),

  fulfillment_status: model.enum([
    "unfulfilled",        // Not yet processed
    "processing",         // Being prepared
    "shipped",            // Handed to courier
    "delivered",          // Received by customer
    "cancelled"           // Order cancelled
  ]).default("unfulfilled"),

  // Shipping/tracking information
  courier: model.text().nullable(),           // e.g., "jnt", "poslaju", "dhl"
  tracking_number: model.text().nullable(),
  shipped_at: model.dateTime().nullable(),
  delivered_at: model.dateTime().nullable(),
  estimated_delivery: model.dateTime().nullable(),

  // Payment information
  paid_at: model.dateTime().nullable(),
  payment_method: model.text().nullable(),    // e.g., "credit_card", "bank_transfer"
})

export default OrderExtension
