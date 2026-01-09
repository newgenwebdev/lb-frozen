import { z } from "zod"
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// Return item schema
const ReturnItemSchema = z.object({
  item_id: z.string().min(1).describe("Order line item ID"),
  variant_id: z.string().min(1).describe("Product variant ID"),
  product_name: z.string().min(1).describe("Product name"),
  quantity: z.number().int().positive().describe("Quantity to return"),
  unit_price: z.number().min(0).describe("Unit price of the item"),
})

/**
 * Schema for creating a return request
 * POST /admin/return-requests
 */
export const CreateReturnSchema = z.object({
  order_id: z
    .string()
    .min(1)
    .describe("Order ID to create return for"),
  return_type: z
    .enum(["refund", "replacement"])
    .default("refund")
    .describe("Type of return - refund or replacement"),
  reason: z
    .enum(["defective", "wrong_item", "not_as_described", "changed_mind", "other"])
    .describe("Reason for return"),
  reason_details: z
    .string()
    .max(1000)
    .optional()
    .describe("Additional details about the return reason"),
  items: z
    .array(ReturnItemSchema)
    .min(1)
    .describe("Items to return"),
  refund_amount: z
    .number()
    .min(0)
    .default(0)
    .describe("Refund amount for items"),
  shipping_refund: z
    .number()
    .min(0)
    .optional()
    .describe("Refund amount for shipping"),
  admin_notes: z
    .string()
    .max(1000)
    .optional()
    .describe("Internal admin notes"),
}).openapi('CreateReturnRequest', {
  example: {
    order_id: 'order_01HQZJQY9X1K2P3M4N5B6C7D8E',
    return_type: 'refund',
    reason: 'defective',
    reason_details: 'Product arrived damaged',
    items: [{
      item_id: 'item_01HQZJQY9X1K2P3M4N5B6C7D8E',
      variant_id: 'variant_01HQZJQY9X1K2P3M4N5B6C7D8E',
      product_name: 'Example Product',
      quantity: 1,
      unit_price: 2999
    }],
    refund_amount: 2999,
    shipping_refund: 0
  }
})

/**
 * Schema for approving a return
 * POST /admin/return-requests/:id/approve
 */
export const ApproveReturnSchema = z.object({
  admin_notes: z
    .string()
    .max(1000)
    .optional()
    .describe("Admin notes for the approval"),
}).openapi('ApproveReturnRequest', {
  example: {
    admin_notes: 'Approved - customer provided photos of damage'
  }
})

/**
 * Schema for rejecting a return
 * POST /admin/return-requests/:id/reject
 */
export const RejectReturnSchema = z.object({
  reason: z
    .string()
    .min(1)
    .max(1000)
    .describe("Reason for rejecting the return"),
}).openapi('RejectReturnRequest', {
  example: {
    reason: 'Product shows signs of misuse beyond normal wear'
  }
})

/**
 * Schema for marking return as in-transit
 * POST /admin/return-requests/:id/in-transit
 */
export const InTransitSchema = z.object({
  courier: z
    .string()
    .min(1)
    .max(100)
    .describe("Courier/shipping company name"),
  tracking_number: z
    .string()
    .min(1)
    .max(100)
    .describe("Tracking number for the return shipment"),
}).openapi('InTransitRequest', {
  example: {
    courier: 'J&T Express',
    tracking_number: 'JT1234567890'
  }
})

/**
 * Schema for completing a return
 * POST /admin/return-requests/:id/complete
 */
export const CompleteReturnSchema = z.object({
  admin_notes: z
    .string()
    .max(1000)
    .optional()
    .describe("Admin notes for completion"),
}).openapi('CompleteReturnRequest', {
  example: {
    admin_notes: 'Item received and inspected, refund processed'
  }
})

/**
 * Schema for processing refund
 * POST /admin/return-requests/:id/refund
 */
export const ProcessRefundSchema = z.object({
  refund_amount: z
    .number()
    .positive()
    .optional()
    .describe("Override refund amount (uses return total if not specified)"),
}).openapi('ProcessRefundRequest', {
  example: {
    refund_amount: 2999
  }
})

// Infer TypeScript types from schemas
export type CreateReturnRequest = z.infer<typeof CreateReturnSchema>
export type ApproveReturnRequest = z.infer<typeof ApproveReturnSchema>
export type RejectReturnRequest = z.infer<typeof RejectReturnSchema>
export type InTransitRequest = z.infer<typeof InTransitSchema>
export type CompleteReturnRequest = z.infer<typeof CompleteReturnSchema>
export type ProcessRefundRequest = z.infer<typeof ProcessRefundSchema>
