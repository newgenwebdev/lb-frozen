/**
 * Product Categories API Functions
 *
 * API layer for product category operations using Medusa backend
 */

import { api } from "./client"
import type {
  MedusaProductCategory,
  MedusaProductCategoryListResponse,
} from "../types/product"
import type { CategoryFilter, CategoryStats } from "../validators/category"

/**
 * Fetch all product categories with filtering and pagination
 * @param filters - Optional filter parameters
 * @returns List of product categories
 */
export async function getCategories(
  filters?: CategoryFilter
): Promise<MedusaProductCategoryListResponse> {
  const queryParams = new URLSearchParams()

  // Pagination
  queryParams.append("limit", String(filters?.limit ?? 100))
  queryParams.append("offset", String(filters?.offset ?? 0))

  // Include parent and children relationships
  queryParams.append("fields", "+parent_category,+category_children")

  // Search by name
  if (filters?.search) {
    queryParams.append("q", filters.search)
  }

  // Filter by parent category
  if (filters?.parent_id) {
    queryParams.append("parent_category_id", filters.parent_id)
  }

  // Sort order
  if (filters?.sort_by) {
    let orderParam = ""
    switch (filters.sort_by) {
      case "newest":
        orderParam = "-created_at"
        break
      case "oldest":
        orderParam = "created_at"
        break
      case "name_asc":
        orderParam = "name"
        break
      case "name_desc":
        orderParam = "-name"
        break
      case "handle_asc":
        orderParam = "handle"
        break
      case "handle_desc":
        orderParam = "-handle"
        break
      // Note: parent and status sorting will be handled client-side
      // as Medusa API may not support these sort fields directly
    }
    if (orderParam) {
      queryParams.append("order", orderParam)
    }
  }

  const response = await api.get<MedusaProductCategoryListResponse>(
    `/admin/product-categories?${queryParams.toString()}`
  )

  // Apply client-side status filter if needed (Medusa may not support is_active filter)
  let categories = response.data.product_categories

  if (filters?.status && filters.status !== "all") {
    const isActive = filters.status === "active"
    categories = categories.filter((cat) => (cat.is_active ?? true) === isActive)
  }

  // Client-side sorting for parent and status (not supported by Medusa API)
  if (filters?.sort_by) {
    if (filters.sort_by === "parent_asc" || filters.sort_by === "parent_desc") {
      const direction = filters.sort_by === "parent_asc" ? 1 : -1
      categories = [...categories].sort((a, b) => {
        const aParent = a.parent_category?.name || ""
        const bParent = b.parent_category?.name || ""
        return aParent.localeCompare(bParent) * direction
      })
    } else if (filters.sort_by === "status_asc" || filters.sort_by === "status_desc") {
      const direction = filters.sort_by === "status_asc" ? 1 : -1
      categories = [...categories].sort((a, b) => {
        const aStatus = a.is_active !== false ? 1 : 0
        const bStatus = b.is_active !== false ? 1 : 0
        return (aStatus - bStatus) * direction
      })
    }
  }

  return {
    ...response.data,
    product_categories: categories,
    count: categories.length,
  }
}

/**
 * Fetch category statistics
 * @returns Category statistics (total, active, non-active counts)
 */
export async function getCategoryStats(): Promise<CategoryStats> {
  // Fetch all categories to calculate stats
  const response = await api.get<MedusaProductCategoryListResponse>(
    `/admin/product-categories?limit=1000&offset=0`
  )

  const categories = response.data.product_categories
  const total = categories.length
  const active = categories.filter((cat) => cat.is_active !== false).length
  const nonActive = total - active

  return {
    total_categories: total,
    active_categories: active,
    non_active_categories: nonActive,
  }
}

/**
 * Fetch single category by ID
 * @param id - Category ID
 * @returns Product category
 */
export async function getCategory(id: string): Promise<MedusaProductCategory> {
  const response = await api.get<{ product_category: MedusaProductCategory }>(
    `/admin/product-categories/${id}?fields=+parent_category,+category_children`
  )

  return response.data.product_category
}

/**
 * Create a new category
 * @param data - Category data
 * @returns Created category
 */
export async function createCategory(data: {
  name: string
  handle: string
  description?: string
  is_active?: boolean
  is_internal?: boolean
  parent_category_id?: string | null
  metadata?: Record<string, unknown>
}): Promise<MedusaProductCategory> {
  const response = await api.post<{ product_category: MedusaProductCategory }>(
    "/admin/product-categories",
    data
  )

  return response.data.product_category
}

/**
 * Update an existing category
 * @param id - Category ID
 * @param data - Updated category data
 * @returns Updated category
 */
export async function updateCategory(
  id: string,
  data: {
    name?: string
    handle?: string
    description?: string
    is_active?: boolean
    is_internal?: boolean
    parent_category_id?: string | null
    metadata?: Record<string, unknown>
  }
): Promise<MedusaProductCategory> {
  const response = await api.post<{ product_category: MedusaProductCategory }>(
    `/admin/product-categories/${id}`,
    data
  )

  return response.data.product_category
}

/**
 * Delete a category
 * @param id - Category ID
 */
export async function deleteCategory(id: string): Promise<void> {
  await api.delete(`/admin/product-categories/${id}`)
}
