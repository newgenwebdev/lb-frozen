import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { ProductListQuerySchema } from "../schemas"
import { REVIEW_MODULE } from "../../../../modules/review"

/**
 * GET /store/products/featured
 * Returns featured products (metadata.featured = true)
 * Falls back to newest products if no featured products are flagged
 *
 * Query params:
 * - limit: number of products to return (default: 4, max: 20)
 * - region_id: region ID for pricing calculation
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  // Validate query params
  const queryResult = ProductListQuerySchema.safeParse(req.query)
  if (!queryResult.success) {
    res.status(400).json({
      message: "Invalid query parameters",
      errors: queryResult.error.issues,
    })
    return
  }

  const { limit, region_id } = queryResult.data

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const productModule = req.scope.resolve(Modules.PRODUCT)
  const regionModule = req.scope.resolve(Modules.REGION)
  const pricingModule = req.scope.resolve(Modules.PRICING)

  // Get all published products
  const allProducts = await productModule.listProducts(
    { status: "published" },
    {
      relations: ["variants", "images", "categories", "options"],
      take: 100,
      order: { created_at: "DESC" }, // Newest first for fallback
    }
  )

  // First, get products with featured flag
  const featuredProducts = allProducts.filter((product: any) => {
    return product.metadata?.featured === true
  })

  let productsToReturn: any[] = []
  let source: "flagged" | "newest" | "mixed" = "flagged"

  if (featuredProducts.length >= limit) {
    // Enough featured products
    productsToReturn = featuredProducts.slice(0, limit)
    source = "flagged"
  } else if (featuredProducts.length > 0) {
    // Some featured, fill rest with newest (excluding already featured)
    const featuredIds = new Set(featuredProducts.map((p) => p.id))
    const newestProducts = allProducts
      .filter((p: any) => !featuredIds.has(p.id))
      .slice(0, limit - featuredProducts.length)

    productsToReturn = [...featuredProducts, ...newestProducts]
    source = "mixed"
  } else {
    // No featured products, use newest
    productsToReturn = allProducts.slice(0, limit)
    source = "newest"
  }

  // If no products at all, return empty
  if (productsToReturn.length === 0) {
    res.json({
      products: [],
      count: 0,
      source: "none",
    })
    return
  }

  // Get region for pricing
  let resolvedRegionId = region_id
  if (!resolvedRegionId) {
    const regions = await regionModule.listRegions({}, { take: 1 })
    resolvedRegionId = regions[0]?.id
  }

  // Get variant IDs for pricing calculation
  const variantIds = productsToReturn.flatMap((product: any) =>
    product.variants?.map((v: any) => v.id) || []
  )

  // Get prices for variants - use direct price lookup
  const priceMap = new Map<string, Array<{ amount: number; currency_code: string }>>()

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
      const priceSetIds = variantPriceSets.map((vps: any) => vps.price_set_id).filter(Boolean)

      if (priceSetIds.length > 0) {
        const prices = await pricingModule.listPrices(
          { price_set_id: priceSetIds },
          { select: ["amount", "currency_code", "price_set_id"] }
        )

        // Create map of price_set_id to prices
        const priceSetToPrices = new Map<string, Array<{ amount: number; currency_code: string }>>()
        for (const price of prices) {
          const existing = priceSetToPrices.get(price.price_set_id) || []
          existing.push({ amount: Number(price.amount), currency_code: price.currency_code })
          priceSetToPrices.set(price.price_set_id, existing)
        }

        // Map variant_id to prices
        for (const vps of variantPriceSets) {
          const prices = priceSetToPrices.get(vps.price_set_id) || []
          if (prices.length > 0) {
            priceMap.set(vps.variant_id, prices)
          }
        }
      }
    } catch {
      // Pricing lookup failed, continue without prices
    }
  }

  // Get review stats for all products
  let productReviewStats: Record<string, { average_rating: number; total_reviews: number }> = {}
  try {
    const reviewModule = req.scope.resolve(REVIEW_MODULE) as any
    const productIds = productsToReturn.map((p: any) => p.id)
    const allReviews = await reviewModule.listReviews({ product_id: productIds })
    
    for (const product of productsToReturn) {
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

  // Get sold count for all products from order items
  let productSoldCounts: Record<string, number> = {}
  try {
    const orderModule = req.scope.resolve(Modules.ORDER) as any
    
    for (const product of productsToReturn) {
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

  // Format response with calculated prices
  const formattedProducts = productsToReturn.map((product: any) => ({
    id: product.id,
    title: product.title,
    handle: product.handle,
    description: product.description,
    thumbnail: product.thumbnail,
    images: product.images?.map((img: any) => ({
      id: img.id,
      url: img.url,
    })),
    variants: product.variants?.map((variant: any) => ({
      id: variant.id,
      title: variant.title,
      sku: variant.sku,
      prices: priceMap.get(variant.id) || [],
      options: variant.options,
    })),
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
  }))

  res.json({
    products: formattedProducts,
    count: formattedProducts.length,
    source, // "flagged" | "mixed" | "newest"
  })
}
