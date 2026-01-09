import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

/**
 * Fix Inventory Links Script
 *
 * This script links inventory items to product variants for all existing products.
 * Without this link, Medusa's order workflow cannot reduce stock when orders are placed.
 *
 * The script:
 * 1. Fetches all products with their variants
 * 2. For each variant with manage_inventory=true, finds its inventory item by SKU
 * 3. Creates the link between variant and inventory item if it doesn't exist
 *
 * Usage: pnpm medusa exec ./src/scripts/fix-inventory-links.ts
 */
export default async function fixInventoryLinks({ container }: ExecArgs): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const inventoryModule = container.resolve(Modules.INVENTORY)

  logger.info("Starting inventory link fix...")

  try {
    // Step 1: Get all products with their variants
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "title", "variants.*"],
    })

    logger.info(`Found ${products.length} products to process`)

    let linkedCount = 0
    let skippedCount = 0
    let errorCount = 0

    for (const product of products) {
      if (!product.variants || product.variants.length === 0) {
        continue
      }

      for (const variant of product.variants) {
        // Skip variants that don't manage inventory
        if (!variant.manage_inventory) {
          skippedCount++
          continue
        }

        const sku = variant.sku || variant.id

        try {
          // Step 2: Find inventory item by SKU
          const inventoryItems = await inventoryModule.listInventoryItems({
            sku: sku,
          })

          if (inventoryItems.length === 0) {
            logger.warn(`No inventory item found for variant ${variant.id} (SKU: ${sku})`)
            skippedCount++
            continue
          }

          const inventoryItem = inventoryItems[0]

          // Step 3: Check if link already exists
          const { data: existingLinks } = await query.graph({
            entity: "product_variant_inventory_item",
            fields: ["inventory_item_id", "variant_id"],
            filters: {
              variant_id: variant.id,
            },
          })

          if (existingLinks.length > 0) {
            // Link already exists
            skippedCount++
            continue
          }

          // Step 4: Create the link
          await link.create({
            [Modules.PRODUCT]: {
              variant_id: variant.id,
            },
            [Modules.INVENTORY]: {
              inventory_item_id: inventoryItem.id,
            },
          })

          logger.info(`✅ Linked variant ${variant.id} (${variant.title || sku}) to inventory item ${inventoryItem.id}`)
          linkedCount++

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          logger.error(`Failed to link variant ${variant.id}: ${errorMessage}`)
          errorCount++
        }
      }
    }

    logger.info("\n========== SUMMARY ==========")
    logger.info(`✅ Successfully linked: ${linkedCount}`)
    logger.info(`⏭️  Skipped (already linked or no inventory): ${skippedCount}`)
    logger.info(`❌ Errors: ${errorCount}`)
    logger.info("==============================\n")

    if (linkedCount > 0) {
      logger.info("Inventory links have been created. Stock should now reduce when orders are placed.")
    }

  } catch (error) {
    logger.error("Failed to fix inventory links:", error)
    throw error
  }
}
