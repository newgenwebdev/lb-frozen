/**
 * Product Type Definitions
 *
 * Defines types for Medusa API responses and Admin UI data structures
 */

// Medusa API Response Types
export type MedusaProductStatus = "draft" | "published" | "proposed" | "rejected"

export type MedusaPrice = {
  id: string
  amount: number // Price in cents
  currency_code: string
  variant_id: string
  min_quantity?: number // For tiered pricing
  max_quantity?: number // For tiered pricing
}

// Medusa 2.x returns options as array of objects with option details
export type MedusaVariantOption = {
  id: string
  value: string
  option_id: string
  option?: {
    id: string
    title: string
    product_id: string
  }
  metadata?: Record<string, unknown>
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export type MedusaProductVariant = {
  id: string
  title: string
  sku: string | null
  prices: MedusaPrice[]
  inventory_quantity?: number
  manage_inventory: boolean
  allow_backorder: boolean
  // Medusa 2.x returns options as array of objects, not Record<string, string>
  options?: MedusaVariantOption[]
  weight?: number | string
  metadata?: Record<string, unknown>
}

export type MedusaProductCategory = {
  id: string
  name: string
  handle: string
  description?: string
  is_active?: boolean
  is_internal?: boolean
  rank?: number
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
  metadata?: Record<string, unknown> | null
  parent_category?: MedusaProductCategory | null
  category_children?: MedusaProductCategory[]
}

export type MedusaProductImage = {
  id: string
  url: string
}

export type MedusaProductOption = {
  id: string
  title: string
  product_id: string
  values?: Array<{ id: string; value: string; option_id: string }>
  metadata?: Record<string, unknown>
}

export type MedusaProduct = {
  id: string
  title: string
  subtitle?: string
  description?: string
  handle: string
  status: MedusaProductStatus
  thumbnail?: string
  images?: MedusaProductImage[]
  variants: MedusaProductVariant[]
  options?: MedusaProductOption[]
  categories?: MedusaProductCategory[]
  tags?: { id: string; value: string }[]
  type?: { id: string; value: string }
  collection?: { id: string; title: string }
  // Physical dimensions
  weight?: number | string
  length?: number | string
  height?: number | string
  width?: number | string
  // Customs/origin info
  hs_code?: string
  origin_country?: string
  material?: string
  mid_code?: string
  created_at: string
  updated_at: string
  deleted_at?: string | null
  metadata?: Record<string, unknown>
}

export type MedusaProductListResponse = {
  products: MedusaProduct[]
  count: number
  limit: number
  offset: number
}

// Admin UI Types (matches current product list page structure)
export type AdminProduct = {
  id: string // Product ID (or variant ID if needed)
  name: string // Product title
  image: string // Thumbnail URL
  price: string // Formatted price (e.g., "$64.15")
  sold: number // Units sold (placeholder for now)
  stock: number // Current stock level
  total: number // Total inventory capacity (placeholder)
  category: string // Category name
  active: boolean // Active/inactive status
}

// Sort options for products (server-side sorting)
export type ProductSortOption =
  | "name-asc"
  | "name-desc"
  | "price-asc"
  | "price-desc"
  | "stock-asc"
  | "stock-desc"
  | "created-asc"
  | "created-desc"

// Query Parameters for Product List API
export type ProductListParams = {
  q?: string // Search query
  limit?: number // Items per page
  offset?: number // Pagination offset
  status?: MedusaProductStatus[] // Filter by status
  category_id?: string[] // Filter by category IDs
  sort_by?: ProductSortOption // Sort option for server-side sorting
}

// Category List Response from Medusa API
export type MedusaProductCategoryListResponse = {
  product_categories: MedusaProductCategory[]
  count: number
  limit: number
  offset: number
}
