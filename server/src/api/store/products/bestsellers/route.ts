import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { ProductListQuerySchema } from "../schemas"
import { REVIEW_MODULE } from "../../../../modules/review"

/**
 * GET /store/products/bestsellers
 * Returns top-selling products calculated from actual order data (last 30 days)
 * Falls back to products with metadata.bestseller = true if no orders exist
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
  const orderModule = req.scope.resolve(Modules.ORDER)
  const regionModule = req.scope.resolve(Modules.REGION)
  const pricingModule = req.scope.resolve(Modules.PRICING)

  // Calculate date range for last 30 days
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)

  // Query orders from last 30 days
  let orders: any[] = []
  try {
    orders = await orderModule.listOrders(
      {
        created_at: {
          $gte: thirtyDaysAgo.toISOString(),
          $lt: now.toISOString(),
        } as any,
      },
      { relations: ["items"] }
    )
  } catch {
    // If order query fails, continue with fallback
  }

  // Aggregate sales by product_id (not variant_id, so we group variants together)
  const productSales = new Map<string, number>()

  for (const order of orders) {
    if (order.items) {
      for (const item of order.items) {
        if (!item.product_id) continue

        const quantity = Number(item.quantity) || 0
        const currentTotal = productSales.get(item.product_id) || 0
        productSales.set(item.product_id, currentTotal + quantity)
      }
    }
  }

  // Sort products by quantity sold
  const sortedProductIds = Array.from(productSales.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([productId]) => productId)

  let bestsellerProducts: any[] = []

  // If we have order data, fetch those products
  if (sortedProductIds.length > 0) {
    bestsellerProducts = await productModule.listProducts(
      {
        id: sortedProductIds,
        status: "published",
      },
      {
        relations: ["variants", "images", "categories", "options"],
      }
    )

    // Sort by the order of sortedProductIds (most sold first)
    bestsellerProducts.sort((a, b) => {
      return sortedProductIds.indexOf(a.id) - sortedProductIds.indexOf(b.id)
    })
  }

  // Fallback: If no order data or not enough products, use metadata.bestseller flag
  if (bestsellerProducts.length < limit) {
    const allProducts = await productModule.listProducts(
      { status: "published" },
      {
        relations: ["variants", "images", "categories", "options"],
        take: 100,
      }
    )

    // Get products with bestseller flag that aren't already in the list
    const existingIds = new Set(bestsellerProducts.map((p) => p.id))
    const flaggedBestsellers = allProducts.filter(
      (p: any) => p.metadata?.bestseller === true && !existingIds.has(p.id)
    )

    // Add flagged bestsellers until we reach the limit
    const needed = limit - bestsellerProducts.length
    bestsellerProducts = [...bestsellerProducts, ...flaggedBestsellers.slice(0, needed)]

    // If still not enough, add any published products
    if (bestsellerProducts.length < limit) {
      const stillNeeded = limit - bestsellerProducts.length
      const existingIdsUpdated = new Set(bestsellerProducts.map((p) => p.id))
      const remainingProducts = allProducts.filter(
        (p: any) => !existingIdsUpdated.has(p.id)
      )
      bestsellerProducts = [...bestsellerProducts, ...remainingProducts.slice(0, stillNeeded)]
    }
  }

  // If no products at all, return empty
  if (bestsellerProducts.length === 0) {
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
  const variantIds = bestsellerProducts.flatMap((product: any) =>
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

  // Determine the source of bestsellers
  const source = sortedProductIds.length >= limit
    ? "calculated"
    : sortedProductIds.length > 0
      ? "mixed"
      : "fallback"

  // Get review stats for all products
  let productReviewStats: Record<string, { average_rating: number; total_reviews: number }> = {}
  try {
    const reviewModule = req.scope.resolve(REVIEW_MODULE) as any
    const productIds = bestsellerProducts.map((p: any) => p.id)
    const allReviews = await reviewModule.listReviews({ product_id: productIds })
    
    for (const product of bestsellerProducts) {
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

  // Format response with calculated prices
  const formattedProducts = bestsellerProducts.map((product: any) => ({
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
    // Include sales data if available
    sold_count: productSales.get(product.id) || 0,
  }))

  res.json({
    products: formattedProducts,
    count: formattedProducts.length,
    source, // "calculated" | "mixed" | "fallback"
    period_days: 30,
  })
}
