import type { MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { withAdminAuth } from "../../../utils/admin-auth"

/**
 * Sort option type for products
 */
type ProductSortOption =
  | "name-asc"
  | "name-desc"
  | "price-asc"
  | "price-desc"
  | "stock-asc"
  | "stock-desc"
  | "created-asc"
  | "created-desc"

/**
 * GET /admin/custom-products
 * Get paginated list of products with server-side sorting support
 *
 * Query params:
 * - limit: number of products per page (default: 10)
 * - offset: pagination offset (default: 0)
 * - q: search by product title
 * - status[]: filter by status ("published" | "draft")
 * - category_id[]: filter by category IDs
 * - sort_by: sorting option (name-asc, name-desc, price-asc, price-desc, stock-asc, stock-desc, created-asc, created-desc)
 */
export const GET = withAdminAuth(async (req, res) => {
  const productModule = req.scope.resolve(Modules.PRODUCT)
  const pricingModule = req.scope.resolve(Modules.PRICING)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Get query parameters
  const limit = parseInt(req.query.limit as string) || 10
  const offset = parseInt(req.query.offset as string) || 0
  const search = req.query.q as string | undefined
  const sortBy = (req.query.sort_by as ProductSortOption) || "name-asc"

  // Handle status filter (can be array or single value)
  let statusFilter: string[] | undefined
  if (req.query["status[]"]) {
    statusFilter = Array.isArray(req.query["status[]"])
      ? (req.query["status[]"] as string[])
      : [req.query["status[]"] as string]
  }

  // Handle category filter (can be array or single value)
  let categoryFilter: string[] | undefined
  if (req.query["category_id[]"]) {
    categoryFilter = Array.isArray(req.query["category_id[]"])
      ? (req.query["category_id[]"] as string[])
      : [req.query["category_id[]"] as string]
  }

  // Build filters for product query
  const filters: Record<string, unknown> = {}

  if (statusFilter && statusFilter.length > 0) {
    filters.status = statusFilter
  }

  if (categoryFilter && categoryFilter.length > 0) {
    filters.categories = { id: categoryFilter }
  }

  if (search) {
    filters.q = search
  }

  // Determine if we need post-query sorting (for price and stock)
  const needsClientSort = sortBy.startsWith("price-") || sortBy.startsWith("stock-")

  // Get base sort order for DB query
  let orderBy: Record<string, "ASC" | "DESC"> = {}
  if (!needsClientSort) {
    switch (sortBy) {
      case "name-asc":
        orderBy = { title: "ASC" }
        break
      case "name-desc":
        orderBy = { title: "DESC" }
        break
      case "created-asc":
        orderBy = { created_at: "ASC" }
        break
      case "created-desc":
        orderBy = { created_at: "DESC" }
        break
      default:
        orderBy = { title: "ASC" }
    }
  }

  // For price/stock sorting, we need to fetch all matching products first
  // then sort and paginate on the server
  const fetchLimit = needsClientSort ? undefined : limit
  const fetchOffset = needsClientSort ? undefined : offset

  // Query products with relationships
  const [products, totalCount] = await Promise.all([
    productModule.listProducts(filters, {
      relations: ["variants", "images", "categories"],
      take: fetchLimit,
      skip: fetchOffset,
      order: Object.keys(orderBy).length > 0 ? orderBy : undefined,
    }),
    productModule.listProducts(filters, {
      select: ["id"],
    }).then((products) => products.length),
  ])

  // Get all variant IDs for price lookup
  const variantIds = products.flatMap((product: any) =>
    product.variants?.map((v: any) => v.id) || []
  )

  // Fetch prices for all variants
  const priceMap = new Map<string, number>()

  if (variantIds.length > 0) {
    try {
      // Get variant price sets via link
      const { data: variantPriceSets } = await query.graph({
        entity: "product_variant_price_set",
        fields: ["variant_id", "price_set_id"],
        filters: {
          variant_id: variantIds,
        },
      })

      // Get prices for all price sets
      const priceSetIds = variantPriceSets
        .map((vps: any) => vps.price_set_id)
        .filter(Boolean)

      if (priceSetIds.length > 0) {
        const prices = await pricingModule.listPrices(
          { price_set_id: priceSetIds },
          { select: ["amount", "currency_code", "price_set_id"] }
        )

        // Create map of price_set_id to lowest price
        const priceSetToPrice = new Map<string, number>()
        for (const price of prices) {
          const amount = Number(price.amount) || 0
          const existing = priceSetToPrice.get(price.price_set_id)
          if (existing === undefined || amount < existing) {
            priceSetToPrice.set(price.price_set_id, amount)
          }
        }

        // Map variant_id to price
        for (const vps of variantPriceSets) {
          const price = priceSetToPrice.get(vps.price_set_id)
          if (price !== undefined) {
            priceMap.set(vps.variant_id, price)
          }
        }
      }
    } catch {
      // Pricing lookup failed, continue without prices
    }
  }

  // Fetch inventory levels for all variants
  const inventoryMap = new Map<string, number>()

  if (variantIds.length > 0) {
    try {
      // Get inventory item links
      const { data: inventoryLinks } = await query.graph({
        entity: "product_variant_inventory_item",
        fields: ["variant_id", "inventory_item_id"],
        filters: {
          variant_id: variantIds,
        },
      })

      const inventoryItemIds = inventoryLinks
        .map((link: any) => link.inventory_item_id)
        .filter(Boolean)

      if (inventoryItemIds.length > 0) {
        // Get inventory levels
        const { data: inventoryLevels } = await query.graph({
          entity: "inventory_level",
          fields: ["inventory_item_id", "stocked_quantity", "reserved_quantity"],
          filters: {
            inventory_item_id: inventoryItemIds,
          },
        })

        // Create map of inventory_item_id to available quantity
        const inventoryItemToQty = new Map<string, number>()
        for (const level of inventoryLevels) {
          const stocked = Number(level.stocked_quantity) || 0
          const reserved = Number(level.reserved_quantity) || 0
          const available = stocked - reserved
          const existing = inventoryItemToQty.get(level.inventory_item_id) || 0
          inventoryItemToQty.set(level.inventory_item_id, existing + available)
        }

        // Map variant_id to inventory quantity
        for (const link of inventoryLinks) {
          const qty = inventoryItemToQty.get(link.inventory_item_id) || 0
          const existing = inventoryMap.get(link.variant_id) || 0
          inventoryMap.set(link.variant_id, existing + qty)
        }
      }
    } catch {
      // Inventory lookup failed, continue without inventory
    }
  }

  // Helper to get product's lowest price (from first variant with price)
  const getProductPrice = (product: any): number => {
    for (const variant of product.variants || []) {
      const price = priceMap.get(variant.id)
      if (price !== undefined) {
        return price
      }
    }
    return 0
  }

  // Helper to get product's total stock
  const getProductStock = (product: any): number => {
    let total = 0
    for (const variant of product.variants || []) {
      total += inventoryMap.get(variant.id) || 0
    }
    return total
  }

  // Format products with enriched data
  let formattedProducts = products.map((product: any) => {
    const lowestPrice = getProductPrice(product)
    const totalStock = getProductStock(product)

    // Get first variant's price info for currency
    let currencyCode = "myr"
    const firstVariantId = product.variants?.[0]?.id

    return {
      id: product.id,
      title: product.title,
      handle: product.handle,
      description: product.description,
      subtitle: product.subtitle,
      thumbnail: product.thumbnail,
      status: product.status,
      images: product.images?.map((img: any) => ({
        id: img.id,
        url: img.url,
      })),
      variants: product.variants?.map((variant: any) => ({
        id: variant.id,
        title: variant.title,
        sku: variant.sku,
        price: priceMap.get(variant.id) || 0,
        inventory_quantity: inventoryMap.get(variant.id) || 0,
      })),
      categories: product.categories?.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        handle: cat.handle,
      })),
      // Computed fields for sorting
      lowest_price: lowestPrice,
      total_stock: totalStock,
      currency_code: currencyCode,
      metadata: product.metadata,
      created_at: product.created_at,
      updated_at: product.updated_at,
    }
  })

  // Apply client-side sorting for price and stock
  if (needsClientSort) {
    switch (sortBy) {
      case "price-asc":
        formattedProducts.sort((a, b) => a.lowest_price - b.lowest_price)
        break
      case "price-desc":
        formattedProducts.sort((a, b) => b.lowest_price - a.lowest_price)
        break
      case "stock-asc":
        formattedProducts.sort((a, b) => a.total_stock - b.total_stock)
        break
      case "stock-desc":
        formattedProducts.sort((a, b) => b.total_stock - a.total_stock)
        break
    }

    // Apply pagination after sorting
    formattedProducts = formattedProducts.slice(offset, offset + limit)
  }

  res.json({
    products: formattedProducts,
    count: totalCount,
    limit,
    offset,
  })
})
