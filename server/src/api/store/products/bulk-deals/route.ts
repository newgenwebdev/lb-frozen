import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { ProductListQuerySchema } from "../schemas"
import { REVIEW_MODULE } from "../../../../modules/review"

/**
 * GET /store/products/bulk-deals
 * Returns products that have bulk/wholesale pricing tiers (min_quantity > 1)
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

  const { limit } = queryResult.data

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const productModule = req.scope.resolve(Modules.PRODUCT)
  const pricingModule = req.scope.resolve(Modules.PRICING)

  // Get all published products with variants
  const allProducts = await productModule.listProducts(
    { status: "published" },
    {
      relations: ["variants", "images", "categories", "options"],
      take: 100,
    }
  )

  // Get variant IDs
  const allVariantIds = allProducts.flatMap((product: any) =>
    product.variants?.map((v: any) => v.id) || []
  )

  if (allVariantIds.length === 0) {
    res.json({
      products: [],
      count: 0,
    })
    return
  }

  // Get variant price sets via link
  let variantPriceSets: any[] = []
  try {
    const result = await query.graph({
      entity: "product_variant_price_set",
      fields: ["variant_id", "price_set_id"],
      filters: {
        variant_id: allVariantIds,
      },
    })
    variantPriceSets = result.data || []
  } catch {
    res.json({
      products: [],
      count: 0,
    })
    return
  }

  // Get all prices including min_quantity
  const priceSetIds = variantPriceSets.map((vps: any) => vps.price_set_id).filter(Boolean)

  if (priceSetIds.length === 0) {
    res.json({
      products: [],
      count: 0,
    })
    return
  }

  const allPrices = await pricingModule.listPrices(
    { price_set_id: priceSetIds },
    { select: ["amount", "currency_code", "price_set_id", "min_quantity", "max_quantity"] }
  )

  // Create map: price_set_id -> prices array (with min_quantity)
  const priceSetToPrices = new Map<string, Array<{
    amount: number
    currency_code: string
    min_quantity: number | null
    max_quantity: number | null
  }>>()

  for (const price of allPrices) {
    const existing = priceSetToPrices.get(price.price_set_id) || []
    existing.push({
      amount: Number(price.amount),
      currency_code: price.currency_code,
      min_quantity: price.min_quantity != null ? Number(price.min_quantity) : null,
      max_quantity: price.max_quantity != null ? Number(price.max_quantity) : null,
    })
    priceSetToPrices.set(price.price_set_id, existing)
  }

  // Create map: variant_id -> prices array
  const variantPriceMap = new Map<string, Array<{
    amount: number
    currency_code: string
    min_quantity: number | null
    max_quantity: number | null
  }>>()

  for (const vps of variantPriceSets) {
    const prices = priceSetToPrices.get(vps.price_set_id) || []
    if (prices.length > 0) {
      variantPriceMap.set(vps.variant_id, prices)
    }
  }

  // Find variants that have bulk pricing (min_quantity > 1)
  const variantsWithBulkPricing = new Set<string>()
  for (const [variantId, prices] of variantPriceMap.entries()) {
    const hasBulkTier = prices.some((p) => p.min_quantity && p.min_quantity > 1)
    if (hasBulkTier) {
      variantsWithBulkPricing.add(variantId)
    }
  }

  // Filter products that have at least one variant with bulk pricing
  const productsWithBulkPricing = allProducts.filter((product: any) => {
    return product.variants?.some((v: any) => variantsWithBulkPricing.has(v.id))
  })

  // Limit the results
  const productsToReturn = productsWithBulkPricing.slice(0, limit)

  if (productsToReturn.length === 0) {
    res.json({
      products: [],
      count: 0,
    })
    return
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

  // Format response with prices including min_quantity for bulk tiers
  const formattedProducts = productsToReturn.map((product: any) => {
    // Filter to only include variants that have bulk pricing
    const variantsWithPricing = product.variants?.filter((v: any) =>
      variantsWithBulkPricing.has(v.id)
    ) || []

    return {
      id: product.id,
      title: product.title,
      handle: product.handle,
      description: product.description,
      thumbnail: product.thumbnail,
      images: product.images?.map((img: any) => ({
        id: img.id,
        url: img.url,
      })),
      variants: variantsWithPricing.map((variant: any) => {
        const prices = variantPriceMap.get(variant.id) || []

        // Separate base price and bulk tiers
        const basePrice = prices.find((p) => !p.min_quantity || p.min_quantity <= 1)
        const bulkTiers = prices
          .filter((p) => p.min_quantity && p.min_quantity > 1)
          .sort((a, b) => (a.min_quantity || 0) - (b.min_quantity || 0))

        return {
          id: variant.id,
          title: variant.title,
          sku: variant.sku,
          prices: prices, // All prices including base and tiers
          base_price: basePrice ? {
            amount: basePrice.amount,
            currency_code: basePrice.currency_code,
          } : null,
          bulk_tiers: bulkTiers.map((tier) => ({
            min_quantity: tier.min_quantity,
            max_quantity: tier.max_quantity,
            amount: tier.amount,
            currency_code: tier.currency_code,
            savings_percent: basePrice
              ? Math.round((1 - tier.amount / basePrice.amount) * 100)
              : 0,
          })),
          options: variant.options,
        }
      }),
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
    count: formattedProducts.length,
    total_with_bulk_pricing: productsWithBulkPricing.length,
  })
}
