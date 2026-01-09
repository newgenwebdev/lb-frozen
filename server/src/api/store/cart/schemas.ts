import { z } from "zod"
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

/**
 * Schema for applying points as discount to cart
 * POST /store/cart/:id/apply-points
 */
export const ApplyPointsSchema = z.object({
  points_to_redeem: z
    .number()
    .positive()
    .describe("Number of points to redeem and apply as discount to the cart"),
}).openapi('ApplyPointsRequest', {
  example: {
    points_to_redeem: 250
  }
})

/**
 * Schema for adding a line item to cart
 * POST /store/cart/:id/line-items
 */
export const AddLineItemSchema = z.object({
  variant_id: z
    .string()
    .min(1)
    .describe("The ID of the product variant to add"),
  quantity: z
    .number()
    .int()
    .positive()
    .describe("The quantity to add (minimum 1)"),
  metadata: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Optional metadata to attach to the line item"),
}).openapi('AddLineItemRequest', {
  example: {
    variant_id: "variant_01ABC",
    quantity: 5,
  }
})

/**
 * Schema for updating a line item quantity
 * PATCH /store/cart/:id/line-items/:line_id
 */
export const UpdateLineItemSchema = z.object({
  quantity: z
    .number()
    .int()
    .nonnegative()
    .describe("The new quantity (0 to remove the item)"),
  metadata: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Optional metadata to merge with existing metadata"),
}).openapi('UpdateLineItemRequest', {
  example: {
    quantity: 3,
  }
})

// Infer TypeScript types from schemas
export type ApplyPointsRequest = z.infer<typeof ApplyPointsSchema>
export type AddLineItemRequest = z.infer<typeof AddLineItemSchema>
export type UpdateLineItemRequest = z.infer<typeof UpdateLineItemSchema>
