import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * Diagnostic script to check min_stock_alert settings and current inventory levels
 *
 * Usage: pnpm medusa exec ./src/scripts/check-stock-alerts.ts
 */
export default async function checkStockAlerts({ container }: ExecArgs): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const productModule = container.resolve(Modules.PRODUCT)

  logger.info("=".repeat(60))
  logger.info("STOCK ALERT DIAGNOSTIC REPORT")
  logger.info("=".repeat(60))

  try {
    // Fetch all published products with variants
    const products = await productModule.listProducts(
      { status: "published" },
      {
        relations: ["variants"],
        select: ["id", "title", "thumbnail", "metadata"],
      }
    )

    logger.info(`\nFound ${products.length} published products\n`)

    // Collect all variant IDs for inventory lookup
    const variantMap = new Map<string, { product: any; variant: any }>()
    let variantsWithThreshold = 0

    for (const product of products) {
      if (!product.variants || product.variants.length === 0) continue

      for (const variant of product.variants) {
        variantMap.set(variant.id, { product, variant })

        // Check for min_stock_alert
        const variantMetadata = variant.metadata as Record<string, unknown> | undefined
        const productMetadata = product.metadata as Record<string, unknown> | undefined

        let minStockAlert = 0
        if (variantMetadata?.min_stock_alert) {
          minStockAlert = Number(variantMetadata.min_stock_alert) || 0
        } else if (productMetadata?.minimumStockAlert) {
          minStockAlert = Number(productMetadata.minimumStockAlert) || 0
        }

        if (minStockAlert > 0) {
          variantsWithThreshold++
          logger.info(`[HAS THRESHOLD] ${product.title} - ${variant.title || "Default"}`)
          logger.info(`  Variant ID: ${variant.id}`)
          logger.info(`  Min Stock Alert: ${minStockAlert}`)
          logger.info(`  Variant Metadata: ${JSON.stringify(variantMetadata || {})}`)
          logger.info(`  Product Metadata (minimumStockAlert): ${productMetadata?.minimumStockAlert || "not set"}`)
          logger.info("")
        }
      }
    }

    const variantIds = Array.from(variantMap.keys())
    logger.info(`\nTotal variants: ${variantIds.length}`)
    logger.info(`Variants with min_stock_alert > 0: ${variantsWithThreshold}`)

    if (variantsWithThreshold === 0) {
      logger.warn("\n⚠️  NO VARIANTS HAVE min_stock_alert SET!")
      logger.warn("To test the alert system:")
      logger.warn("1. Go to Admin > Products > Edit a product")
      logger.warn("2. Set 'Min Stock Alert' field on a variant (e.g., 10)")
      logger.warn("3. Make sure the current inventory is at or below that threshold")
      logger.warn("4. Refresh the notifications page")
      return
    }

    // Get inventory levels for variants with thresholds
    logger.info("\n" + "-".repeat(60))
    logger.info("CHECKING INVENTORY LEVELS FOR VARIANTS WITH THRESHOLDS")
    logger.info("-".repeat(60) + "\n")

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

    const variantToInventoryItem = new Map<string, string>()
    for (const link of inventoryLinks) {
      variantToInventoryItem.set(link.variant_id, link.inventory_item_id)
    }

    const inventoryMap = new Map<string, number>()

    if (inventoryItemIds.length > 0) {
      const { data: inventoryLevels } = await query.graph({
        entity: "inventory_level",
        fields: ["inventory_item_id", "stocked_quantity", "reserved_quantity"],
        filters: {
          inventory_item_id: inventoryItemIds,
        },
      })

      const inventoryItemToQty = new Map<string, number>()
      for (const level of inventoryLevels) {
        const stocked = Number(level.stocked_quantity) || 0
        const reserved = Number(level.reserved_quantity) || 0
        const available = stocked - reserved
        const existing = inventoryItemToQty.get(level.inventory_item_id) || 0
        inventoryItemToQty.set(level.inventory_item_id, existing + available)
      }

      for (const [variantId, inventoryItemId] of variantToInventoryItem) {
        const qty = inventoryItemToQty.get(inventoryItemId) || 0
        inventoryMap.set(variantId, qty)
      }
    }

    // Check each variant with threshold
    let alertsTriggered = 0

    for (const [variantId, { product, variant }] of variantMap) {
      const variantMetadata = variant.metadata as Record<string, unknown> | undefined
      const productMetadata = product.metadata as Record<string, unknown> | undefined

      let minStockAlert = 0
      if (variantMetadata?.min_stock_alert) {
        minStockAlert = Number(variantMetadata.min_stock_alert) || 0
      } else if (productMetadata?.minimumStockAlert) {
        minStockAlert = Number(productMetadata.minimumStockAlert) || 0
      }

      if (minStockAlert <= 0) continue

      const currentStock = inventoryMap.get(variantId) || 0
      const wouldTriggerAlert = currentStock <= minStockAlert

      logger.info(`${product.title} - ${variant.title || "Default"}`)
      logger.info(`  Current Stock: ${currentStock}`)
      logger.info(`  Min Stock Alert: ${minStockAlert}`)
      logger.info(`  Would Trigger Alert: ${wouldTriggerAlert ? "YES ✓" : "NO (stock is above threshold)"}`)
      logger.info("")

      if (wouldTriggerAlert) {
        alertsTriggered++
      }
    }

    logger.info("=".repeat(60))
    logger.info(`SUMMARY: ${alertsTriggered} alerts would be triggered`)
    logger.info("=".repeat(60))

    if (alertsTriggered === 0 && variantsWithThreshold > 0) {
      logger.info("\nNo alerts because all products with thresholds have sufficient stock.")
      logger.info("To test: reduce inventory below the min_stock_alert threshold.")
    }

  } catch (error) {
    logger.error(`Diagnostic failed: ${error}`)
    throw error
  }
}
