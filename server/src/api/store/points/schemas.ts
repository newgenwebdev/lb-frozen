import { z } from "zod"
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

/**
 * Schema for calculating points redemption or earnings
 * POST /store/points/calculate
 */
export const CalculatePointsSchema = z.object({
  points_to_redeem: z
    .number()
    .positive()
    .optional()
    .describe("Number of points to redeem - calculates discount amount"),
  order_total: z
    .number()
    .positive()
    .optional()
    .describe("Order total in cents - calculates points that will be earned"),
}).openapi('CalculatePointsRequest', {
  example: {
    points_to_redeem: 500,
    order_total: 10000
  }
})

// Infer TypeScript types from schemas
export type CalculatePointsRequest = z.infer<typeof CalculatePointsSchema>
