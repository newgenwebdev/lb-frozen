import { z } from "zod"

/**
 * Query parameters for product listing endpoints
 */
export const ProductListQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 4))
    .pipe(z.number().min(1).max(20))
    .describe("Number of products to return (default: 4, max: 20)"),
  region_id: z
    .string()
    .optional()
    .describe("Region ID for pricing"),
})

export type ProductListQuery = z.infer<typeof ProductListQuerySchema>

/**
 * Product response schema for documentation
 */
export const ProductResponseSchema = z.object({
  products: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      handle: z.string(),
      description: z.string().nullable(),
      thumbnail: z.string().nullable(),
      images: z.array(
        z.object({
          id: z.string(),
          url: z.string(),
        })
      ).optional(),
      variants: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          sku: z.string().nullable(),
          calculated_price: z.object({
            calculated_amount: z.number(),
            currency_code: z.string(),
          }).optional(),
        })
      ).optional(),
      categories: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          handle: z.string(),
        })
      ).optional(),
      metadata: z.record(z.string(), z.unknown()).nullable(),
      status: z.string(),
      created_at: z.string(),
      updated_at: z.string(),
    })
  ),
  count: z.number(),
})

export type ProductResponse = z.infer<typeof ProductResponseSchema>
