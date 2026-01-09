/**
 * Category Validation Schemas
 *
 * Zod schemas for category validation and type inference
 */

import { z } from "zod"

/**
 * Category status enum
 */
export const CategoryStatusSchema = z.enum(["active", "non_active"])
export type CategoryStatus = z.infer<typeof CategoryStatusSchema>

/**
 * Base category schema (without parent for list response)
 */
export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(), // This is the "slug" in the UI
  description: z.string().optional().nullable(),
  is_active: z.boolean().optional().default(true),
  is_internal: z.boolean().optional().default(false),
  rank: z.number().optional().default(0),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  deleted_at: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
})

export type Category = z.infer<typeof CategorySchema>

/**
 * Category with parent relationship
 */
export const CategoryWithParentSchema = CategorySchema.extend({
  parent_category: CategorySchema.nullable().optional(),
  category_children: z.array(CategorySchema).optional(),
})

export type CategoryWithParent = z.infer<typeof CategoryWithParentSchema>

/**
 * Category list response from Medusa API
 */
export const CategoryListResponseSchema = z.object({
  product_categories: z.array(CategoryWithParentSchema),
  count: z.number(),
  limit: z.number(),
  offset: z.number(),
})

export type CategoryListResponse = z.infer<typeof CategoryListResponseSchema>

/**
 * Category statistics
 */
export const CategoryStatsSchema = z.object({
  total_categories: z.number(),
  active_categories: z.number(),
  non_active_categories: z.number(),
})

export type CategoryStats = z.infer<typeof CategoryStatsSchema>

/**
 * Category filter options
 */
export const CategoryFilterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["all", "active", "non_active"]).optional(),
  parent_id: z.string().optional(),
  sort_by: z.enum([
    "newest",
    "oldest",
    "name_asc",
    "name_desc",
    "handle_asc",
    "handle_desc",
    "parent_asc",
    "parent_desc",
    "status_asc",
    "status_desc",
  ]).optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
})

export type CategoryFilter = z.infer<typeof CategoryFilterSchema>

/**
 * Create category input
 */
export const CreateCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  handle: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  is_active: z.boolean().optional().default(true),
  is_internal: z.boolean().optional().default(false),
  parent_category_id: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>

/**
 * Update category input
 */
export const UpdateCategorySchema = CreateCategorySchema.partial()

export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>
