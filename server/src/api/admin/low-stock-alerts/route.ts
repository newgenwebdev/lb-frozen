import type { MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { withAdminAuth } from "../../../utils/admin-auth"

/**
 * Low Stock Alert Response structure
 */
interface LowStockAlert {
  variant_id: string
  variant_title: string
  variant_sku: string | null
  product_id: string
  product_title: string
  product_thumbnail: string | null
  min_stock_alert: number
  current_stock: number
  stock_deficit: number
  checked_at: string
}

/**
 * GET /admin/low-stock-alerts
 *
 * Returns list of products/variants with stock at or below their min_stock_alert threshold.
 * This endpoint either returns cached results from the scheduled job,
 * or performs a real-time check if no cached data is available.
 *
 * Query params:
 * - force_refresh: "true" to bypass cache and check in real-time
 */
export const GET = withAdminAuth(async (req, res) => {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER) as any
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const productModule = req.scope.resolve(Modules.PRODUCT)

  const forceRefresh = req.query.force_refresh === "true"

  // Check for cached alerts from the scheduled job
  const cachedAlerts = (global as any).__lowStockAlerts as LowStockAlert[] | undefined
  const lastChecked = (global as any).__lowStockLastChecked as string | undefined

  // If we have cached data and don't need to force refresh, return it
  if (cachedAlerts && lastChecked && !forceRefresh) {
    res.json({
      alerts: cachedAlerts,
      count: cachedAlerts.length,
      last_checked: lastChecked,
      source: "cache",
    })
    return
  }

  // Otherwise, perform real-time check
  logger.info("[LOW-STOCK-API] Performing real-time stock check")

  try {
    const lowStockAlerts: LowStockAlert[] = []
    const checkedAt = new Date().toISOString()

    // Fetch all published products with variants
    const products = await productModule.listProducts(
      { status: "published" },
      {
        relations: ["variants"],
        select: ["id", "title", "thumbnail", "metadata"],
      }
    )

    // Collect all variant IDs for inventory lookup
    const variantMap = new Map<string, { product: any; variant: any }>()

    for (const product of products) {
      if (!product.variants || product.variants.length === 0) continue

      for (const variant of product.variants) {
        variantMap.set(variant.id, { product, variant })
      }
    }

    const variantIds = Array.from(variantMap.keys())

    if (variantIds.length === 0) {
      res.json({
        alerts: [],
        count: 0,
        last_checked: checkedAt,
        source: "realtime",
      })
      return
    }

    // Get inventory item links for all variants
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

    // Create map of variant_id to inventory_item_id
    const variantToInventoryItem = new Map<string, string>()
    for (const link of inventoryLinks) {
      variantToInventoryItem.set(link.variant_id, link.inventory_item_id)
    }

    // Get inventory levels
    const inventoryMap = new Map<string, number>()

    if (inventoryItemIds.length > 0) {
      const { data: inventoryLevels } = await query.graph({
        entity: "inventory_level",
        fields: ["inventory_item_id", "stocked_quantity", "reserved_quantity"],
        filters: {
          inventory_item_id: inventoryItemIds,
        },
      })

      // Sum up available quantity per inventory item
      const inventoryItemToQty = new Map<string, number>()
      for (const level of inventoryLevels) {
        const stocked = Number(level.stocked_quantity) || 0
        const reserved = Number(level.reserved_quantity) || 0
        const available = stocked - reserved
        const existing = inventoryItemToQty.get(level.inventory_item_id) || 0
        inventoryItemToQty.set(level.inventory_item_id, existing + available)
      }

      // Map variant_id to inventory quantity
      for (const [variantId, inventoryItemId] of variantToInventoryItem) {
        const qty = inventoryItemToQty.get(inventoryItemId) || 0
        inventoryMap.set(variantId, qty)
      }
    }

    // Check each variant against min_stock_alert threshold
    for (const [variantId, { product, variant }] of variantMap) {
      // Get min_stock_alert from variant metadata or product metadata
      const variantMetadata = variant.metadata as Record<string, unknown> | undefined
      const productMetadata = product.metadata as Record<string, unknown> | undefined

      let minStockAlert = 0

      if (variantMetadata?.min_stock_alert) {
        minStockAlert = Number(variantMetadata.min_stock_alert) || 0
      } else if (productMetadata?.minimumStockAlert) {
        minStockAlert = Number(productMetadata.minimumStockAlert) || 0
      }

      // Skip if no threshold is set
      if (minStockAlert <= 0) continue

      const currentStock = inventoryMap.get(variantId) || 0

      // Check if stock is at or below threshold
      if (currentStock <= minStockAlert) {
        lowStockAlerts.push({
          variant_id: variantId,
          variant_title: variant.title || "Default",
          variant_sku: variant.sku || null,
          product_id: product.id,
          product_title: product.title,
          product_thumbnail: product.thumbnail || null,
          min_stock_alert: minStockAlert,
          current_stock: currentStock,
          stock_deficit: minStockAlert - currentStock,
          checked_at: checkedAt,
        })
      }
    }

    // Sort by stock deficit (most critical first)
    lowStockAlerts.sort((a, b) => b.stock_deficit - a.stock_deficit)

    // Update cache
    ;(global as any).__lowStockAlerts = lowStockAlerts
    ;(global as any).__lowStockLastChecked = checkedAt

    res.json({
      alerts: lowStockAlerts,
      count: lowStockAlerts.length,
      last_checked: checkedAt,
      source: "realtime",
    })
  } catch (error) {
    logger.error(`[LOW-STOCK-API] Error checking low stock: ${error}`)
    res.status(500).json({
      message: "Failed to check low stock levels",
      error: String(error),
    })
  }
})
