import { z } from "zod"

/**
 * Schema for creating a new brand
 */
export const CreateBrandSchema = z.object({
  name: z.string().min(1).max(255).describe("Brand name"),
  handle: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/, "Handle must be lowercase alphanumeric with hyphens")
    .describe("URL-friendly handle"),
  description: z.string().max(2000).optional().nullable().describe("Brand description"),
  logo_url: z.string().url().optional().nullable().describe("Brand logo URL"),
  is_active: z.boolean().optional().default(true).describe("Whether the brand is active"),
  rank: z.number().int().min(0).optional().default(0).describe("Display order rank"),
})

/**
 * Schema for updating a brand
 */
export const UpdateBrandSchema = z.object({
  name: z.string().min(1).max(255).optional().describe("Brand name"),
  handle: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/, "Handle must be lowercase alphanumeric with hyphens")
    .optional()
    .describe("URL-friendly handle"),
  description: z.string().max(2000).optional().nullable().describe("Brand description"),
  logo_url: z.string().url().optional().nullable().describe("Brand logo URL"),
  is_active: z.boolean().optional().describe("Whether the brand is active"),
  rank: z.number().int().min(0).optional().describe("Display order rank"),
})

/**
 * Response schema for a single brand
 */
export const BrandResponseSchema = z.object({
  brand: z.object({
    id: z.string(),
    name: z.string(),
    handle: z.string(),
    description: z.string().nullable(),
    logo_url: z.string().nullable(),
    is_active: z.boolean(),
    rank: z.number(),
    created_at: z.string(),
    updated_at: z.string(),
  }),
})

/**
 * Response schema for list of brands
 */
export const BrandsListResponseSchema = z.object({
  brands: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      handle: z.string(),
      description: z.string().nullable(),
      logo_url: z.string().nullable(),
      is_active: z.boolean(),
      rank: z.number(),
      created_at: z.string(),
      updated_at: z.string(),
    })
  ),
  count: z.number(),
  limit: z.number(),
  offset: z.number(),
})

// Export types
export type CreateBrandRequest = z.infer<typeof CreateBrandSchema>
export type UpdateBrandRequest = z.infer<typeof UpdateBrandSchema>
export type BrandResponse = z.infer<typeof BrandResponseSchema>
export type BrandsListResponse = z.infer<typeof BrandsListResponseSchema>
