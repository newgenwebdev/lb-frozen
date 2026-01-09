/**
 * Brand API Functions
 *
 * API layer for brand operations using custom brand module
 */

import { api } from "./client"
import type {
  Brand,
  BrandListResponse,
  BrandFilter,
  BrandStats,
  CreateBrandInput,
  UpdateBrandInput,
} from "../validators/brand"

/**
 * Fetch all brands with filtering and pagination
 * @param filters - Optional filter parameters
 * @returns List of brands
 */
export async function getBrands(
  filters?: BrandFilter
): Promise<BrandListResponse> {
  const queryParams = new URLSearchParams()

  // Pagination
  queryParams.append("limit", String(filters?.limit ?? 100))
  queryParams.append("offset", String(filters?.offset ?? 0))

  // Search by name
  if (filters?.search) {
    queryParams.append("search", filters.search)
  }

  // Filter by is_active
  if (filters?.is_active !== undefined) {
    queryParams.append("is_active", String(filters.is_active))
  }

  // Sort order
  if (filters?.sort_by) {
    queryParams.append("sort_by", filters.sort_by)
  }

  const response = await api.get<BrandListResponse>(
    `/admin/brands?${queryParams.toString()}`
  )

  let brands = response.data.brands

  // Apply client-side status filter if needed
  if (filters?.status && filters.status !== "all") {
    const isActive = filters.status === "active"
    brands = brands.filter((brand) => (brand.is_active ?? true) === isActive)
  }

  // Client-side sorting for status (API may not support)
  if (filters?.sort_by) {
    if (filters.sort_by === "status_asc" || filters.sort_by === "status_desc") {
      const direction = filters.sort_by === "status_asc" ? 1 : -1
      brands = [...brands].sort((a, b) => {
        const aStatus = a.is_active !== false ? 1 : 0
        const bStatus = b.is_active !== false ? 1 : 0
        return (aStatus - bStatus) * direction
      })
    }
  }

  return {
    ...response.data,
    brands,
    count: brands.length,
  }
}

/**
 * Fetch brand statistics
 * @returns Brand statistics (total, active, non-active counts)
 */
export async function getBrandStats(): Promise<BrandStats> {
  // Fetch all brands to calculate stats
  const response = await api.get<BrandListResponse>(
    `/admin/brands?limit=1000&offset=0`
  )

  const brands = response.data.brands
  const total = brands.length
  const active = brands.filter((brand) => brand.is_active !== false).length
  const nonActive = total - active

  return {
    total_brands: total,
    active_brands: active,
    non_active_brands: nonActive,
  }
}

/**
 * Fetch single brand by ID
 * @param id - Brand ID
 * @returns Brand
 */
export async function getBrand(id: string): Promise<Brand> {
  const response = await api.get<{ brand: Brand }>(`/admin/brands/${id}`)

  return response.data.brand
}

/**
 * Create a new brand
 * @param data - Brand data
 * @returns Created brand
 */
export async function createBrand(data: CreateBrandInput): Promise<Brand> {
  const response = await api.post<{ brand: Brand }>("/admin/brands", data)

  return response.data.brand
}

/**
 * Update an existing brand
 * @param id - Brand ID
 * @param data - Updated brand data
 * @returns Updated brand
 */
export async function updateBrand(
  id: string,
  data: UpdateBrandInput
): Promise<Brand> {
  const response = await api.put<{ brand: Brand }>(`/admin/brands/${id}`, data)

  return response.data.brand
}

/**
 * Delete a brand
 * @param id - Brand ID
 */
export async function deleteBrand(id: string): Promise<void> {
  await api.delete(`/admin/brands/${id}`)
}
