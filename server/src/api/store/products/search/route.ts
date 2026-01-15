import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { z } from "zod"
import { REVIEW_MODULE } from "../../../../modules/review"

/**
 * Search Query Schema
 */
const SearchQuerySchema = z.object({
  q: z.string().optional(),
  category_id: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(12),
  offset: z.coerce.number().min(0).default(0),
  order: z.string().optional(),
  // Custom filters
  min_rating: z.coerce.number().min(1).max(5).optional(),
  delivery_speed: z.enum(["today", "tomorrow", "few_days", "anytime"]).optional(),
  flash_sale: z.coerce.boolean().optional(),
  trending: z.coerce.boolean().optional(),
  on_brand: z.coerce.boolean().optional(),
  region_id: z.string().optional(),
})

/**
 * GET /store/products/search
 * Advanced product search with filtering by rating, delivery speed, and tags
 * 
 * Query params:
 * - q: search query
 * - category_id: filter by category
 * - limit: max results (default 12)
 * - offset: pagination offset
 * - order: sort field (e.g., "created_at", "-created_at", "title", "-title")
 * - min_rating: minimum rating filter (1-5)
 * - delivery_speed: "today", "tomorrow", "few_days", "anytime"
 * - flash_sale: filter for flash sale products
 * - trending: filter for trending products
 * - on_brand: filter for on-brand/featured products
 * - region_id: region for pricing
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  // Validate query params
  const queryResult = SearchQuerySchema.safeParse(req.query)
  if (!queryResult.success) {
    res.status(400).json({
      message: "Invalid query parameters",
      errors: queryResult.error.issues,
    })
    return
  }

  const {
    q,
    category_id,
    limit,
    offset,
    order,
    min_rating,
    delivery_speed,
    flash_sale,
    trending,
    on_brand,
    region_id,
  } = queryResult.data

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const productModule = req.scope.resolve(Modules.PRODUCT)
  const regionModule = req.scope.resolve(Modules.REGION)
  const pricingModule = req.scope.resolve(Modules.PRICING)
  const inventoryModule = req.scope.resolve(Modules.INVENTORY)

  // Build product filters
  const productFilters: any = {
    status: "published",
  }

  if (category_id) {
    productFilters.categories = { id: category_id }
  }

  // Build order config
  let orderConfig: any = { created_at: "DESC" } // Default: newest first
  if (order) {
    const isDesc = order.startsWith("-")
    const field = isDesc ? order.slice(1) : order
    orderConfig = { [field]: isDesc ? "DESC" : "ASC" }
  }

  // Fetch products with search
  let products: any[] = []
  
  if (q) {
    // Use search if query provided
    products = await productModule.listProducts(
      productFilters,
      {
        relations: ["variants", "images", "categories", "options", "options.values"],
        take: 500, // Get more to filter later
        order: orderConfig,
      }
    )
    
    // Filter by search query (title, description, handle)
    const searchLower = q.toLowerCase()
    products = products.filter((p: any) => 
      p.title?.toLowerCase().includes(searchLower) ||
      p.description?.toLowerCase().includes(searchLower) ||
      p.handle?.toLowerCase().includes(searchLower)
    )
  } else {
    products = await productModule.listProducts(
      productFilters,
      {
        relations: ["variants", "images", "categories", "options", "options.values"],
        take: 500, // Get more to filter later
        order: orderConfig,
      }
    )
  }

  // Get all reviews for products to calculate real ratings
  let allProductRatings: Record<string, number> = {} // product_id -> average_rating
  try {
    const reviewModule = req.scope.resolve(REVIEW_MODULE) as any
    const allProductIds = products.map((p: any) => p.id)
    const allReviews = await reviewModule.listReviews({ product_id: allProductIds })
    
    for (const product of products) {
      const productReviews = allReviews.filter((r: any) => r.product_id === product.id)
      if (productReviews.length > 0) {
        const sum = productReviews.reduce((acc: number, r: any) => acc + r.rating, 0)
        allProductRatings[product.id] = sum / productReviews.length
      }
    }
  } catch (e) {
    console.warn("Could not fetch reviews for rating filter:", e)
  }

  // Apply filters
  if (min_rating !== undefined) {
    products = products.filter((p: any) => {
      const rating = allProductRatings[p.id] || 0
      // Exact match: round rating and compare
      const roundedRating = Math.round(rating)
      return roundedRating === min_rating
    })
  }

  if (delivery_speed) {
    products = products.filter((p: any) => {
      const shippingDays = p.metadata?.shipping_days || "3-7"
      const [minDays] = shippingDays.split("-").map(Number)
      
      switch (delivery_speed) {
        case "today":
          return minDays === 0
        case "tomorrow":
          return minDays <= 1
        case "few_days":
          return minDays <= 3
        case "anytime":
        default:
          return true
      }
    })
  }

  if (flash_sale) {
    products = products.filter((p: any) => p.metadata?.flash_sale === true)
  }

  if (trending) {
    products = products.filter((p: any) => p.metadata?.trending === true)
  }

  if (on_brand) {
    products = products.filter((p: any) => p.metadata?.on_brand === true || p.metadata?.featured === true)
  }

  // Get total count before pagination
  const totalCount = products.length

  // Apply pagination
  const paginatedProducts = products.slice(offset, offset + limit)

  // Get variant IDs for pricing and inventory
  const variantIds = paginatedProducts.flatMap((p: any) =>
    p.variants?.map((v: any) => v.id) || []
  )

  // Get region for pricing
  let resolvedRegionId = region_id
  if (!resolvedRegionId) {
    try {
      const regions = await regionModule.listRegions({}, { take: 1 })
      resolvedRegionId = regions[0]?.id
    } catch {
      // Continue without region
    }
  }

  // Get prices for variants
  const priceMap = new Map<string, Array<{ amount: number; currency_code: string }>>()

  if (variantIds.length > 0) {
    try {
      const { data: variantPriceSets } = await query.graph({
        entity: "product_variant_price_set",
        fields: ["variant_id", "price_set_id"],
        filters: { variant_id: variantIds },
      })

      const priceSetIds = variantPriceSets.map((vps: any) => vps.price_set_id).filter(Boolean)

      if (priceSetIds.length > 0) {
        const prices = await pricingModule.listPrices(
          { price_set_id: priceSetIds },
          { select: ["amount", "currency_code", "price_set_id"] }
        )

        const priceSetToPrices = new Map<string, Array<{ amount: number; currency_code: string }>>()
        for (const price of prices) {
          const existing = priceSetToPrices.get(price.price_set_id) || []
          existing.push({ amount: Number(price.amount), currency_code: price.currency_code })
          priceSetToPrices.set(price.price_set_id, existing)
        }

        for (const vps of variantPriceSets) {
          const pricesForVariant = priceSetToPrices.get(vps.price_set_id) || []
          if (pricesForVariant.length > 0) {
            priceMap.set(vps.variant_id, pricesForVariant)
          }
        }
      }
    } catch {
      // Pricing lookup failed, continue without prices
    }
  }

  // Get inventory quantities
  const inventoryMap: Record<string, number> = {}

  if (variantIds.length > 0) {
    try {
      const { data: variantInventoryLinks } = await query.graph({
        entity: "product_variant_inventory_item",
        fields: ["variant_id", "inventory_item_id"],
        filters: { variant_id: variantIds },
      })

      if (variantInventoryLinks.length > 0) {
        const inventoryItemIds = variantInventoryLinks
          .map((link: any) => link.inventory_item_id)
          .filter(Boolean)

        const inventoryLevels = await inventoryModule.listInventoryLevels(
          { inventory_item_id: inventoryItemIds },
          { select: ["inventory_item_id", "stocked_quantity", "reserved_quantity"] }
        )

        const inventoryItemAvailable: Record<string, number> = {}
        for (const level of inventoryLevels) {
          const available = (Number(level.stocked_quantity) || 0) - (Number(level.reserved_quantity) || 0)
          inventoryItemAvailable[level.inventory_item_id] =
            (inventoryItemAvailable[level.inventory_item_id] || 0) + Math.max(0, available)
        }

        for (const link of variantInventoryLinks) {
          if (link.inventory_item_id && inventoryItemAvailable[link.inventory_item_id] !== undefined) {
            inventoryMap[link.variant_id] = inventoryItemAvailable[link.inventory_item_id]
          }
        }
      }
    } catch {
      // Inventory lookup failed, continue without inventory
    }
  }

  // Calculate rating distribution from already-fetched ratings (allProductRatings)
  // Count exact matches per rating level (not cumulative)
  const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  for (const product of products) {
    const avgRating = allProductRatings[product.id]
    if (avgRating && avgRating > 0) {
      const roundedRating = Math.round(avgRating)
      if (roundedRating >= 1 && roundedRating <= 5) {
        ratingCounts[roundedRating as keyof typeof ratingCounts]++
      }
    }
  }

  // Get review stats for paginated products only (for display - need total_reviews too)
  let productReviewStats: Record<string, { average_rating: number; total_reviews: number }> = {}
  try {
    const reviewModule = req.scope.resolve(REVIEW_MODULE) as any
    const productIds = paginatedProducts.map((p: any) => p.id)
    
    // Get all reviews for these products
    const allReviews = await reviewModule.listReviews({ product_id: productIds })
    
    // Calculate stats per product
    for (const product of paginatedProducts) {
      const productReviews = allReviews.filter((r: any) => r.product_id === product.id)
      if (productReviews.length > 0) {
        const sum = productReviews.reduce((acc: number, r: any) => acc + r.rating, 0)
        productReviewStats[product.id] = {
          average_rating: parseFloat((sum / productReviews.length).toFixed(1)),
          total_reviews: productReviews.length,
        }
      }
    }
  } catch (e) {
    console.warn("Could not fetch review stats:", e)
  }

  // Get sold count for all paginated products from order items
  let productSoldCounts: Record<string, number> = {}
  try {
    const orderModule = req.scope.resolve(Modules.ORDER) as any
    
    for (const product of paginatedProducts) {
      const productVariantIds = product.variants?.map((v: any) => v.id) || []
      
      if (productVariantIds.length > 0) {
        const orderItems = await orderModule.listOrderLineItems(
          { variant_id: productVariantIds },
          { select: ["id", "quantity"] }
        )
        
        const soldCount = orderItems.reduce((total: number, item: any) => {
          return total + (item.quantity || 0)
        }, 0)
        
        productSoldCounts[product.id] = soldCount
      }
    }
  } catch (e) {
    console.warn("Could not fetch sold counts:", e)
  }

  // Format response
  const formattedProducts = paginatedProducts.map((product: any) => {
    // Format variants with calculated_price structure for frontend compatibility
    const formattedVariants = product.variants?.map((variant: any) => {
      const variantPrices = priceMap.get(variant.id) || []
      const primaryPrice = variantPrices[0] // Get first price
      
      // Build calculated_price structure that frontend expects
      let calculatedPrice: any = null
      if (primaryPrice) {
        const amount = primaryPrice.amount
        const currencyCode = primaryPrice.currency_code || 'myr'
        
        // Check if there's a discount in variant metadata
        const metadataDiscount = variant.metadata?.discount ? Number(variant.metadata.discount) : 0
        let originalAmount = amount
        
        if (metadataDiscount > 0) {
          // Calculate original price based on discount percentage
          originalAmount = Math.round(amount / (1 - metadataDiscount / 100))
        }
        
        calculatedPrice = {
          calculated_amount: amount,
          original_amount: originalAmount,
          currency_code: currencyCode,
        }
      }
      
      return {
        id: variant.id,
        title: variant.title,
        sku: variant.sku,
        barcode: variant.barcode,
        prices: variantPrices,
        calculated_price: calculatedPrice,
        options: variant.options,
        inventory_quantity: inventoryMap[variant.id] ?? 0,
        manage_inventory: variant.manage_inventory ?? true,
        allow_backorder: variant.allow_backorder ?? false,
        metadata: variant.metadata,
      }
    }) || []

    return {
      id: product.id,
      title: product.title,
      subtitle: product.subtitle,
      handle: product.handle,
      description: product.description,
      thumbnail: product.thumbnail,
      images: product.images?.map((img: any) => ({
        id: img.id,
        url: img.url,
      })),
      variants: formattedVariants,
      options: product.options?.map((opt: any) => ({
        id: opt.id,
        title: opt.title,
        values: opt.values?.map((v: any) => ({
          id: v.id,
          value: v.value,
        })),
      })),
      categories: product.categories?.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        handle: cat.handle,
      })),
      metadata: product.metadata,
      status: product.status,
      created_at: product.created_at,
      updated_at: product.updated_at,
      review_stats: productReviewStats[product.id] || null,
      sold_count: productSoldCounts[product.id] || 0,
    }
  })

  res.json({
    products: formattedProducts,
    count: totalCount,
    offset,
    limit,
    // Include rating distribution for filter UI
    rating_counts: {
      5: ratingCounts[5],
      4: ratingCounts[4],
      3: ratingCounts[3],
      2: ratingCounts[2],
      1: ratingCounts[1],
    },
  })
}
