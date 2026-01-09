import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * Low Stock Alert Data structure
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
 * Job to check inventory levels against min_stock_alert thresholds
 *
 * This job runs periodically to:
 * 1. Fetch all product variants with min_stock_alert set in metadata
 * 2. Compare current inventory levels against thresholds
 * 3. Store low-stock alerts for the admin dashboard
 *
 * Alerts are stored in-memory (could be extended to Redis/DB if needed)
 * and retrieved via the /admin/low-stock-alerts endpoint
 *
 * Schedule: Every hour at minute 0
 */
export default async function checkLowStock(
  container: MedusaContainer
): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as any
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const productModule = container.resolve(Modules.PRODUCT)

  logger.info("[LOW-STOCK] Starting low stock check job")
  const startTime = Date.now()

  const lowStockAlerts: LowStockAlert[] = []

  try {
    // Step 1: Fetch all products with variants
    logger.info("[LOW-STOCK] Fetching products with variants...")

    const products = await productModule.listProducts(
      { status: "published" },
      {
        relations: ["variants"],
        select: ["id", "title", "thumbnail", "metadata"],
      }
    )

    logger.info(`[LOW-STOCK] Found ${products.length} published products`)

    // Collect all variant IDs for inventory lookup
    const variantMap = new Map<string, { product: any; variant: any }>()

    for (const product of products) {
      if (!product.variants || product.variants.length === 0) continue

      for (const variant of product.variants) {
        variantMap.set(variant.id, { product, variant })
      }
    }

    const variantIds = Array.from(variantMap.keys())
    logger.info(`[LOW-STOCK] Checking ${variantIds.length} variants for stock levels`)

    if (variantIds.length === 0) {
      logger.info("[LOW-STOCK] No variants to check")
      return
    }

    // Step 2: Get inventory item links for all variants
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

    // Step 3: Get inventory levels
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

    // Step 4: Check each variant against min_stock_alert threshold
    let alertsGenerated = 0
    const checkedAt = new Date().toISOString()

    for (const [variantId, { product, variant }] of variantMap) {
      // Get min_stock_alert from variant metadata or product metadata (for single-variant)
      const variantMetadata = variant.metadata as Record<string, unknown> | undefined
      const productMetadata = product.metadata as Record<string, unknown> | undefined

      // Priority: variant metadata > product metadata
      let minStockAlert = 0

      if (variantMetadata?.min_stock_alert) {
        minStockAlert = Number(variantMetadata.min_stock_alert) || 0
      } else if (productMetadata?.minimumStockAlert) {
        // For single-variant products, check product-level setting
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
        alertsGenerated++

        logger.warn(
          `[LOW-STOCK] ALERT: ${product.title} - ${variant.title || "Default"} ` +
          `(Stock: ${currentStock}/${minStockAlert})`
        )
      }
    }

    // Step 5: Store alerts in a global variable (for now)
    // In production, this should be stored in Redis or a database table
    ;(global as any).__lowStockAlerts = lowStockAlerts
    ;(global as any).__lowStockLastChecked = checkedAt

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    logger.info(
      `[LOW-STOCK] Completed in ${duration}s. ` +
      `Checked: ${variantMap.size} variants, Alerts: ${alertsGenerated}`
    )
  } catch (error) {
    logger.error("[LOW-STOCK] Job failed:", error)
    throw error
  }
}

/**
 * Job configuration
 * Runs every hour at minute 0
 */
export const config = {
  name: "check-low-stock",
  schedule: "0 * * * *", // Cron: At minute 0 of every hour
}
