import { z } from "zod"
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

/**
 * Schema for bulk shipping orders
 * POST /admin/orders/bulk-ship
 */
export const BulkShipSchema = z.object({
  order_ids: z
    .array(z.string().min(1))
    .min(1)
    .describe("Array of order IDs to ship"),
  courier: z
    .string()
    .min(1)
    .max(100)
    .describe("Courier/shipping company name"),
  pickup_address: z
    .string()
    .max(500)
    .optional()
    .describe("Pickup address for courier"),
  pickup_date: z
    .string()
    .optional()
    .describe("Scheduled pickup date (ISO format)"),
  pickup_time: z
    .string()
    .optional()
    .describe("Scheduled pickup time"),
}).openapi('BulkShipRequest', {
  example: {
    order_ids: ['order_01ABC', 'order_02DEF', 'order_03GHI'],
    courier: 'J&T Express',
    pickup_address: '123 Warehouse Street, Kuala Lumpur',
    pickup_date: '2024-01-15',
    pickup_time: '10:00'
  }
})

/**
 * Schema for bulk delivering orders
 * POST /admin/orders/bulk-deliver
 */
export const BulkDeliverSchema = z.object({
  order_ids: z
    .array(z.string().min(1))
    .min(1)
    .describe("Array of order IDs to mark as delivered"),
}).openapi('BulkDeliverRequest', {
  example: {
    order_ids: ['order_01ABC', 'order_02DEF', 'order_03GHI']
  }
})

/**
 * Schema for canceling an order
 * POST /admin/orders/:id/cancel
 */
export const CancelOrderSchema = z.object({
  reason: z
    .string()
    .max(500)
    .optional()
    .describe("Reason for cancellation"),
}).openapi('CancelOrderRequest', {
  example: {
    reason: 'Customer requested cancellation'
  }
})

/**
 * Schema for shipping a single order
 * POST /admin/orders/:id/ship
 */
export const ShipOrderSchema = z.object({
  courier: z
    .string()
    .min(1)
    .max(100)
    .describe("Courier/shipping company name"),
  tracking_number: z
    .string()
    .min(1)
    .max(100)
    .describe("Tracking number for the shipment"),
}).openapi('ShipOrderRequest', {
  example: {
    courier: 'J&T Express',
    tracking_number: 'JT1234567890'
  }
})

/**
 * Schema for updating payment status
 * POST /admin/orders/:id/payment
 */
export const UpdatePaymentSchema = z.object({
  payment_status: z
    .enum(["awaiting", "paid", "refunded", "partially_refunded"])
    .describe("New payment status"),
  payment_method: z
    .string()
    .max(100)
    .optional()
    .describe("Payment method used"),
}).openapi('UpdatePaymentRequest', {
  example: {
    payment_status: 'paid',
    payment_method: 'bank_transfer'
  }
})

// Infer TypeScript types from schemas
export type BulkShipRequest = z.infer<typeof BulkShipSchema>
export type BulkDeliverRequest = z.infer<typeof BulkDeliverSchema>
export type CancelOrderRequest = z.infer<typeof CancelOrderSchema>
export type ShipOrderRequest = z.infer<typeof ShipOrderSchema>
export type UpdatePaymentRequest = z.infer<typeof UpdatePaymentSchema>
