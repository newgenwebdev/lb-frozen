import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * GET /store/products/:id/with-inventory
 * Returns a single product with inventory quantities for each variant
 * 
 * Query params:
 * - region_id: region ID for pricing calculation (optional)
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const { id } = req.params
  const region_id = req.query.region_id as string | undefined

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const productModule = req.scope.resolve(Modules.PRODUCT)
  const regionModule = req.scope.resolve(Modules.REGION)
  const pricingModule = req.scope.resolve(Modules.PRICING)
  const inventoryModule = req.scope.resolve(Modules.INVENTORY)

  // Fetch the product with relations
  let product: any
  try {
    product = await productModule.retrieveProduct(id, {
      relations: ["variants", "images", "categories", "options", "options.values"],
    })
  } catch (error) {
    res.status(404).json({
      message: "Product not found",
      error: error instanceof Error ? error.message : "Unknown error",
    })
    return
  }

  if (!product || product.status !== "published") {
    res.status(404).json({
      message: "Product not found or not published",
    })
    return
  }

  // Get variant IDs
  const variantIds = product.variants?.map((v: any) => v.id) || []

  // ========================================
  // 1. Get inventory quantities
  // ========================================
  const inventoryMap: Record<string, number> = {}

  if (variantIds.length > 0) {
    try {
      // Get inventory items linked to variants
      const { data: variantInventoryLinks } = await query.graph({
        entity: "product_variant_inventory_item",
        fields: ["variant_id", "inventory_item_id"],
        filters: { variant_id: variantIds },
      })

      if (variantInventoryLinks.length > 0) {
        const inventoryItemIds = variantInventoryLinks
          .map((link: any) => link.inventory_item_id)
          .filter(Boolean)

        // Get inventory levels for these items
        const inventoryLevels = await inventoryModule.listInventoryLevels(
          { inventory_item_id: inventoryItemIds },
          { select: ["inventory_item_id", "stocked_quantity", "reserved_quantity"] }
        )

        // Build a map of inventory_item_id -> available quantity
        const inventoryItemAvailable: Record<string, number> = {}
        for (const level of inventoryLevels) {
          const available = (Number(level.stocked_quantity) || 0) - (Number(level.reserved_quantity) || 0)
          // Sum up quantities across all locations for each inventory item
          inventoryItemAvailable[level.inventory_item_id] =
            (inventoryItemAvailable[level.inventory_item_id] || 0) + Math.max(0, available)
        }

        // Map back to variant_id
        for (const link of variantInventoryLinks) {
          if (link.inventory_item_id && inventoryItemAvailable[link.inventory_item_id] !== undefined) {
            inventoryMap[link.variant_id] = inventoryItemAvailable[link.inventory_item_id]
          }
        }
      }
    } catch (err) {
      console.warn(`[PRODUCT-WITH-INVENTORY] Failed to fetch inventory: ${err}`)
    }
  }

  // ========================================
  // 2. Get prices for variants
  // ========================================
  const priceMap = new Map<string, Array<{ amount: number; currency_code: string }>>()

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

  // ========================================
  // 3. Format response
  // ========================================
  const formattedProduct = {
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
    variants: product.variants?.map((variant: any) => ({
      id: variant.id,
      title: variant.title,
      sku: variant.sku,
      barcode: variant.barcode,
      prices: priceMap.get(variant.id) || [],
      options: variant.options,
      inventory_quantity: inventoryMap[variant.id] ?? 0,
      manage_inventory: variant.manage_inventory ?? true,
      allow_backorder: variant.allow_backorder ?? false,
      metadata: variant.metadata,
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
  }

  res.json({
    product: formattedProduct,
  })
}
