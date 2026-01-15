/**
 * Product Data Mapper
 *
 * Transforms Medusa API responses to Admin UI data structures
 */

import type { MedusaProduct, AdminProduct } from "../types/product"

/**
 * Format price from cents to Malaysian Ringgit string
 * @param amountInCents - Price in cents (e.g., 6415)
 * @returns Formatted price string (e.g., "RM64.15")
 */
export function formatPrice(amountInCents: number): string {
  const amountInDollars = amountInCents / 100
  return `RM${amountInDollars.toFixed(2)}`
}

/**
 * Extract base price from product variants
 * Handles two API response formats:
 * 1. Custom products API: variant.price (number) and product.lowest_price (number)
 * 2. Standard Medusa API: variant.prices[] (array of price objects)
 * @param product - Medusa product
 * @returns Price in cents, or 0 if no price found
 */
function extractPrice(product: MedusaProduct): number {
  // First, check for lowest_price at product level (custom products API)
  const productWithLowestPrice = product as MedusaProduct & { lowest_price?: number }
  if (typeof productWithLowestPrice.lowest_price === 'number' && productWithLowestPrice.lowest_price > 0) {
    return productWithLowestPrice.lowest_price
  }

  const firstVariant = product.variants?.[0]
  if (!firstVariant) {
    return 0
  }

  // Check for direct price field on variant (custom products API format)
  const variantWithPrice = firstVariant as typeof firstVariant & { price?: number }
  if (typeof variantWithPrice.price === 'number' && variantWithPrice.price > 0) {
    return variantWithPrice.price
  }

  // Check for prices array (standard Medusa API format)
  const prices = firstVariant.prices
  if (!prices || prices.length === 0) {
    return 0
  }

  // Find base price (no min_quantity or min_quantity <= 1)
  const basePrice = prices.find(
    (p) => !p.min_quantity || p.min_quantity <= 1
  )

  if (basePrice) {
    return basePrice.amount
  }

  // Fallback to first price if no base price found
  return prices[0]?.amount ?? 0
}

/**
 * Extract stock level from product variants
 * Uses inventory map if provided (for Medusa 2.x where inventory is separate)
 * Returns available stock (stocked - reserved) from inventory module
 * @param product - Medusa product
 * @param inventoryMap - Optional map of SKU -> available quantity from inventory module
 * @returns Available stock quantity, or 0 if not available
 */
function extractStock(product: MedusaProduct, inventoryMap?: Map<string, number>): number {
  // If inventory map is provided, sum up available quantities for all variants
  if (inventoryMap && product.variants?.length) {
    let totalStock = 0
    let foundInventoryData = false
    for (const variant of product.variants) {
      const sku = variant.sku
      if (sku && inventoryMap.has(sku)) {
        foundInventoryData = true
        totalStock += inventoryMap.get(sku) || 0
      }
    }
    // If we found inventory data in the map, return it (even if 0)
    // This is important because 0 available stock is valid (all reserved)
    if (foundInventoryData) {
      return totalStock
    }
  }

  // Fallback: Get first variant's inventory quantity (may be 0 in Medusa 2.x)
  const firstVariant = product.variants?.[0]
  return firstVariant?.inventory_quantity ?? 0
}

/**
 * Extract category name from product categories
 * @param product - Medusa product
 * @returns Category name, or "Uncategorized" if none
 */
function extractCategory(product: MedusaProduct): string {
  const firstCategory = product.categories?.[0]

  return firstCategory?.name ?? "Uncategorized"
}

/**
 * Map Medusa product status to active boolean
 * @param status - Medusa product status
 * @returns true if published, false otherwise
 */
function mapStatus(status: string): boolean {
  return status === "published"
}

/**
 * Get product image URL
 * @param product - Medusa product
 * @returns Image URL, or placeholder if none
 */
function extractImage(product: MedusaProduct): string {
  // Use thumbnail if available, otherwise first image, otherwise placeholder
  if (product.thumbnail) {
    return product.thumbnail
  }

  if (product.images && product.images.length > 0) {
    return product.images[0].url
  }

  // Return placeholder image URL or empty string
  return "/placeholder-product.png"
}

/**
 * Transform Medusa product to Admin UI product
 * @param product - Medusa product from API
 * @param inventoryMap - Optional map of SKU -> quantity from inventory module
 * @param salesMap - Optional map of product_id -> quantity_sold from analytics
 * @returns AdminProduct for UI display
 */
export function mapMedusaProductToAdmin(
  product: MedusaProduct,
  inventoryMap?: Map<string, number>,
  salesMap?: Map<string, number>
): AdminProduct {
  const priceInCents = extractPrice(product)
  const stock = extractStock(product, inventoryMap)
  const sold = salesMap?.get(product.id) ?? 0

  return {
    id: product.id,
    name: product.title,
    image: extractImage(product),
    price: formatPrice(priceInCents),
    sold: sold,
    stock: stock,
    total: stock > 0 ? stock : 1000, // Placeholder - no "total capacity" in Medusa
    category: extractCategory(product),
    active: mapStatus(product.status),
  }
}

/**
 * Transform array of Medusa products to Admin UI products
 * @param products - Array of Medusa products
 * @param inventoryMap - Optional map of SKU -> quantity from inventory module
 * @param salesMap - Optional map of product_id -> quantity_sold from analytics
 * @returns Array of AdminProducts
 */
export function mapMedusaProductsToAdmin(
  products: MedusaProduct[],
  inventoryMap?: Map<string, number>,
  salesMap?: Map<string, number>
): AdminProduct[] {
  return products.map((product) => mapMedusaProductToAdmin(product, inventoryMap, salesMap))
}
