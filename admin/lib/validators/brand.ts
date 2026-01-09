/**
 * Brand Validation Schemas
 *
 * Zod schemas for brand validation and type inference
 */

import { z } from "zod"

/**
 * Brand status enum
 */
export const BrandStatusSchema = z.enum(["active", "non_active"])
export type BrandStatus = z.infer<typeof BrandStatusSchema>

/**
 * Base brand schema
 */
export const BrandSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  description: z.string().optional().nullable(),
  logo_url: z.string().optional().nullable(),
  is_active: z.boolean().optional().default(true),
  rank: z.number().optional().default(0),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  deleted_at: z.string().nullable().optional(),
})

export type Brand = z.infer<typeof BrandSchema>

/**
 * Brand list response from API
 */
export const BrandListResponseSchema = z.object({
  brands: z.array(BrandSchema),
  count: z.number(),
  limit: z.number().optional(),
  offset: z.number().optional(),
})

export type BrandListResponse = z.infer<typeof BrandListResponseSchema>

/**
 * Brand statistics
 */
export const BrandStatsSchema = z.object({
  total_brands: z.number(),
  active_brands: z.number(),
  non_active_brands: z.number(),
})

export type BrandStats = z.infer<typeof BrandStatsSchema>

/**
 * Brand filter options
 */
export const BrandFilterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["all", "active", "non_active"]).optional(),
  is_active: z.boolean().optional(),
  sort_by: z.enum([
    "newest",
    "oldest",
    "name_asc",
    "name_desc",
    "handle_asc",
    "handle_desc",
    "rank_asc",
    "rank_desc",
    "status_asc",
    "status_desc",
  ]).optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
})

export type BrandFilter = z.infer<typeof BrandFilterSchema>

/**
 * Create brand input
 */
export const CreateBrandSchema = z.object({
  name: z.string().min(1, "Name is required"),
  handle: z.string().min(1, "Handle is required"),
  description: z.string().optional(),
  logo_url: z.string().optional(),
  is_active: z.boolean().optional().default(true),
  rank: z.number().optional().default(0),
})

export type CreateBrandInput = z.infer<typeof CreateBrandSchema>

/**
 * Update brand input
 */
export const UpdateBrandSchema = CreateBrandSchema.partial()

export type UpdateBrandInput = z.infer<typeof UpdateBrandSchema>

/**
 * Brand form schema (for React Hook Form)
 */
export const BrandFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  handle: z.string().min(1, "Handle is required"),
  description: z.string().optional(),
  logo_url: z.string().optional(),
  is_active: z.boolean().default(true),
  rank: z.coerce.number().optional().default(0),
})

export type BrandFormData = z.infer<typeof BrandFormSchema>
