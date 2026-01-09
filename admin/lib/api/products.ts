/**
 * Product API Functions
 *
 * API layer for product operations using Medusa backend
 */

import { api } from "./client"
import type {
  MedusaProduct,
  MedusaProductListResponse,
  ProductListParams,
  MedusaProductStatus,
  MedusaProductOption,
} from "../types/product"

/**
 * Sales Channel type
 */
export type SalesChannel = {
  id: string
  name: string
  description: string | null
  is_disabled: boolean
  created_at: string
  updated_at: string
}

/**
 * Shipping Profile type
 */
export type ShippingProfile = {
  id: string
  name: string
  type: string
  created_at: string
  updated_at: string
}

/**
 * Fetch all shipping profiles
 * @returns List of shipping profiles
 */
export async function getShippingProfiles(): Promise<ShippingProfile[]> {
  const response = await api.get<{ shipping_profiles: ShippingProfile[] }>(
    "/admin/shipping-profiles"
  )
  return response.data.shipping_profiles
}

/**
 * Fetch the default shipping profile (first one, usually "Default Shipping Profile")
 * @returns Default shipping profile or null if none found
 */
export async function getDefaultShippingProfile(): Promise<ShippingProfile | null> {
  const profiles = await getShippingProfiles()
  // Return first profile (usually the default one)
  return profiles[0] || null
}

/**
 * Fix shipping profiles response type
 */
export type FixShippingProfilesResponse = {
  message: string
  shippingProfile?: {
    id: string
    name: string
  }
  updated: number
  skipped: number
  failed?: Array<{ id: string; title: string; error: string }>
  updatedProducts?: string[]
}

/**
 * Fix all products without shipping profiles by assigning them to the default profile
 * This is a one-time migration endpoint for checkout to work properly
 * @returns Results of the migration
 */
export async function fixProductShippingProfiles(): Promise<FixShippingProfilesResponse> {
  const response = await api.post<FixShippingProfilesResponse>(
    "/admin/products/fix-shipping-profiles"
  )
  return response.data
}

/**
 * Fetch all sales channels
 * @returns List of sales channels
 */
export async function getSalesChannels(): Promise<SalesChannel[]> {
  const response = await api.get<{ sales_channels: SalesChannel[] }>(
    "/admin/sales-channels"
  )
  return response.data.sales_channels
}

/**
 * Fetch the default sales channel (first active one)
 * @returns Default sales channel or null if none found
 */
export async function getDefaultSalesChannel(): Promise<SalesChannel | null> {
  const channels = await getSalesChannels()
  // Return first non-disabled channel, or first channel if all are disabled
  return channels.find(c => !c.is_disabled) || channels[0] || null
}

/**
 * Fetch product list with filters, search, pagination, and server-side sorting
 * Uses custom endpoint /admin/custom-products for full sorting support
 */
export async function getProducts(
  params: ProductListParams = {}
): Promise<MedusaProductListResponse> {
  const { q, limit = 10, offset = 0, status, category_id, sort_by } = params

  // Build query parameters
  const queryParams = new URLSearchParams()

  if (q) queryParams.append("q", q)
  queryParams.append("limit", limit.toString())
  queryParams.append("offset", offset.toString())

  if (status && status.length > 0) {
    status.forEach((s) => queryParams.append("status[]", s))
  }

  if (category_id && category_id.length > 0) {
    category_id.forEach((id) => queryParams.append("category_id[]", id))
  }

  if (sort_by) {
    queryParams.append("sort_by", sort_by)
  }

  const response = await api.get<MedusaProductListResponse>(
    `/admin/custom-products?${queryParams.toString()}`
  )

  return response.data
}

/**
 * Fetch single product by ID
 */
export async function getProduct(id: string): Promise<MedusaProduct> {
  // Include relationships using Medusa 2.x fields syntax
  const queryParams = new URLSearchParams()
  queryParams.append("fields", "*variants,*variants.prices,*categories,*images,*options")

  const response = await api.get<{ product: MedusaProduct }>(
    `/admin/products/${id}?${queryParams.toString()}`
  )

  return response.data.product
}

/**
 * Delete product by ID
 * Falls back to force-delete if product has reservations
 */
export async function deleteProduct(id: string): Promise<void> {
  try {
    await api.delete(`/admin/products/${id}`)
  } catch (error) {
    // Check if it's a reservation error (400 with "reservations" in message)
    const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || ""
    if (errorMessage.includes("reservations") || errorMessage.includes("inventory")) {
      // Try force delete which clears reservations first
      await api.delete(`/admin/products/${id}/force-delete`)
    } else {
      throw error
    }
  }
}

/**
 * Update product status (active/inactive)
 */
export async function updateProductStatus(
  id: string,
  status: MedusaProductStatus
): Promise<MedusaProduct> {
  const response = await api.post<{ product: MedusaProduct }>(
    `/admin/products/${id}`,
    { status }
  )

  return response.data.product
}

/**
 * Bulk delete products
 */
export async function bulkDeleteProducts(ids: string[]): Promise<void> {
  // Medusa doesn't support bulk delete natively, so we loop through
  await Promise.all(ids.map((id) => deleteProduct(id)))
}

/**
 * Create Product Request Types
 */
export type CreateProductVariantPrice = {
  currency_code: string
  amount: number
  min_quantity?: number
  max_quantity?: number
}

export type CreateProductVariant = {
  title: string
  sku?: string
  prices: CreateProductVariantPrice[]
  options?: Record<string, string>
  manage_inventory?: boolean
  allow_backorder?: boolean
  weight?: number
  length?: number
  height?: number
  width?: number
  hs_code?: string
  origin_country?: string
  material?: string
  metadata?: Record<string, unknown>
}

export type CreateProductOption = {
  title: string
  values: string[]
  metadata?: Record<string, unknown>
}

export type CreateProductRequest = {
  title: string
  subtitle?: string
  description?: string
  is_giftcard?: boolean
  discountable?: boolean
  images?: Array<{ url: string }>
  thumbnail?: string
  handle?: string
  status?: MedusaProductStatus
  type_id?: string
  collection_id?: string
  categories?: Array<{ id: string }>
  tags?: Array<{ id: string }>
  options: CreateProductOption[]
  variants?: CreateProductVariant[]
  sales_channels?: Array<{ id: string }>
  shipping_profile_id?: string
  weight?: number
  length?: number
  height?: number
  width?: number
  hs_code?: string
  mid_code?: string
  origin_country?: string
  material?: string
  metadata?: Record<string, unknown>
}

/**
 * Create a new product
 * @param data - Product creation data
 * @returns Created product
 */
export async function createProduct(
  data: CreateProductRequest
): Promise<MedusaProduct> {
  const response = await api.post<{ product: MedusaProduct }>(
    "/admin/products",
    data
  )

  return response.data.product
}

/**
 * Update Product Request Type
 */
export type UpdateProductRequest = Partial<Omit<CreateProductRequest, "options" | "variants">> & {
  options?: CreateProductOption[]
  variants?: Array<CreateProductVariant & { id?: string }>
}

/**
 * Update an existing product
 * @param id - Product ID
 * @param data - Product update data
 * @returns Updated product
 */
export async function updateProduct(
  id: string,
  data: UpdateProductRequest
): Promise<MedusaProduct> {
  const response = await api.post<{ product: MedusaProduct }>(
    `/admin/products/${id}`,
    data
  )

  return response.data.product
}

/**
 * Update product option metadata
 * Used for storing option images
 * @param productId - Product ID (not used in URL, but kept for context/logging)
 * @param optionId - Option ID
 * @param metadata - Metadata to store (e.g., { images: { "Red": "url", "Blue": "url" } })
 * @returns Updated option
 *
 * Note: Uses /admin/option-metadata/:optionId to avoid conflicting with
 * Medusa's built-in /admin/products/:productId/options/:optionId route
 */
export async function updateOptionMetadata(
  productId: string,
  optionId: string,
  metadata: Record<string, unknown>
): Promise<{ option: MedusaProductOption }> {
  const response = await api.post<{ option: MedusaProductOption }>(
    `/admin/option-metadata/${optionId}`,
    { metadata }
  )
  return response.data
}

/**
 * Duplicate a product
 * Fetches the product, copies its data, and creates a new product with "(Copy)" suffix
 * @param id - Product ID to duplicate
 * @returns The newly created duplicate product
 */
export async function duplicateProduct(id: string): Promise<MedusaProduct> {
  // Fetch the original product with all relationships
  const original = await getProduct(id)

  // Helper to convert value to number or undefined
  const toNumber = (value: unknown): number | undefined => {
    if (value === null || value === undefined || value === "") return undefined
    const num = typeof value === "number" ? value : Number(value)
    return isNaN(num) ? undefined : num
  }

  // Prepare duplicate data
  const duplicateData: CreateProductRequest = {
    title: `${original.title} (Copy)`,
    subtitle: original.subtitle || undefined,
    description: original.description || undefined,
    handle: original.handle ? `${original.handle}-copy-${Date.now()}` : undefined,
    status: "draft", // Always create as draft
    thumbnail: original.thumbnail || undefined,
    images: original.images?.map(img => ({ url: img.url })) || [],
    categories: original.categories?.map(cat => ({ id: cat.id })) || [],
    weight: toNumber(original.weight),
    length: toNumber(original.length),
    height: toNumber(original.height),
    width: toNumber(original.width),
    hs_code: original.hs_code || undefined,
    origin_country: original.origin_country || undefined,
    material: original.material || undefined,
    metadata: original.metadata || undefined,
    options: original.options?.map(opt => ({
      title: opt.title,
      values: opt.values?.map(v => v.value) || [],
    })) || [],
    variants: original.variants?.map(variant => ({
      title: variant.title,
      sku: variant.sku ? `${variant.sku}-copy-${Date.now()}` : undefined,
      prices: variant.prices?.map(p => ({
        currency_code: p.currency_code,
        amount: toNumber(p.amount) ?? 0,
      })) || [],
      options: variant.options?.reduce((acc, opt) => {
        acc[opt.option?.title || ""] = opt.value
        return acc
      }, {} as Record<string, string>) || {},
      manage_inventory: variant.manage_inventory,
      allow_backorder: variant.allow_backorder,
      weight: toNumber(variant.weight),
      metadata: variant.metadata || undefined,
    })) || [],
  }

  // Create the duplicate
  return createProduct(duplicateData)
}
