import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

/**
 * Diagnose Inventory Script
 *
 * This script diagnoses why inventory is not being reduced when orders are placed.
 * It checks:
 * 1. Product variant's manage_inventory setting
 * 2. Inventory item existence and linkage
 * 3. Inventory levels and reservations
 *
 * Usage: pnpm medusa exec ./src/scripts/diagnose-inventory.ts
 */
export default async function diagnoseInventory({ container }: ExecArgs): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const inventoryModule = container.resolve(Modules.INVENTORY)

  // Target product to diagnose
  const targetProductId = "prod_01KC713GMWW0VSC8P5KZM2VP22"

  logger.info("=".repeat(60))
  logger.info("INVENTORY DIAGNOSIS REPORT")
  logger.info("=".repeat(60))

  try {
    // Step 1: Get the product with variants
    logger.info("\n📦 STEP 1: Fetching product and variants...")
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "title", "variants.*"],
      filters: { id: targetProductId },
    })

    if (products.length === 0) {
      logger.error(`Product ${targetProductId} not found!`)
      return
    }

    const product = products[0]
    logger.info(`Product: ${product.title} (${product.id})`)
    logger.info(`Variants count: ${product.variants?.length || 0}`)

    if (!product.variants || product.variants.length === 0) {
      logger.error("No variants found for this product!")
      return
    }

    for (const variant of product.variants) {
      logger.info("\n" + "-".repeat(50))
      logger.info(`🏷️  VARIANT: ${variant.title || variant.id}`)
      logger.info(`   ID: ${variant.id}`)
      logger.info(`   SKU: ${variant.sku || "(no SKU)"}`)
      logger.info(`   manage_inventory: ${variant.manage_inventory}`)
      logger.info(`   allow_backorder: ${variant.allow_backorder}`)

      // Step 2: Check inventory item linkage
      logger.info("\n📋 STEP 2: Checking inventory item linkage...")

      try {
        const { data: links } = await query.graph({
          entity: "product_variant_inventory_item",
          fields: ["inventory_item_id", "variant_id", "required_quantity"],
          filters: { variant_id: variant.id },
        })

        if (links.length === 0) {
          logger.warn(`   ⚠️  NO LINK FOUND - Variant is NOT linked to any inventory item!`)
          logger.warn(`   This is likely the root cause of inventory not reducing.`)
        } else {
          logger.info(`   ✅ Found ${links.length} link(s):`)
          for (const link of links) {
            logger.info(`      - Inventory Item: ${link.inventory_item_id}`)
            logger.info(`        Required Quantity: ${link.required_quantity}`)
          }
        }
      } catch (linkError) {
        logger.warn(`   Could not query links: ${linkError}`)
      }

      // Step 3: Find inventory item by SKU
      logger.info("\n📦 STEP 3: Looking for inventory item by SKU...")
      const sku = variant.sku || variant.id

      const inventoryItems = await inventoryModule.listInventoryItems({ sku })

      if (inventoryItems.length === 0) {
        logger.warn(`   ⚠️  No inventory item found with SKU: ${sku}`)
      } else {
        const invItem = inventoryItems[0]
        logger.info(`   ✅ Found inventory item: ${invItem.id}`)
        logger.info(`      SKU: ${invItem.sku}`)
        logger.info(`      Title: ${invItem.title}`)

        // Step 4: Check inventory levels
        logger.info("\n📊 STEP 4: Checking inventory levels...")
        const levels = await inventoryModule.listInventoryLevels({
          inventory_item_id: invItem.id,
        })

        if (levels.length === 0) {
          logger.warn(`   ⚠️  No inventory levels found!`)
        } else {
          logger.info(`   Found ${levels.length} inventory level(s):`)
          for (const level of levels) {
            logger.info(`      Location: ${level.location_id}`)
            logger.info(`      Stocked: ${level.stocked_quantity}`)
            logger.info(`      Reserved: ${level.reserved_quantity}`)
            logger.info(`      Available: ${level.stocked_quantity - level.reserved_quantity}`)
          }
        }

        // Step 5: Check reservations
        logger.info("\n🔒 STEP 5: Checking reservations...")
        try {
          const reservations = await inventoryModule.listReservationItems({
            inventory_item_id: invItem.id,
          })

          if (reservations.length === 0) {
            logger.info(`   No active reservations found.`)
          } else {
            logger.info(`   Found ${reservations.length} reservation(s):`)
            for (const res of reservations) {
              logger.info(`      - ID: ${res.id}`)
              logger.info(`        Quantity: ${res.quantity}`)
              logger.info(`        Line Item: ${res.line_item_id}`)
            }
          }
        } catch (resError) {
          logger.info(`   Could not query reservations: ${resError}`)
        }
      }
    }

    // Step 6: Check recent orders
    logger.info("\n" + "=".repeat(60))
    logger.info("📝 STEP 6: Checking recent orders for this product...")

    try {
      const { data: orderItems } = await query.graph({
        entity: "order_line_item",
        fields: ["id", "title", "quantity", "variant_id", "order_id", "created_at"],
        filters: {
          variant_id: product.variants.map((v: { id: string }) => v.id),
        },
      })

      if (orderItems.length === 0) {
        logger.info("   No order items found for this product's variants.")
      } else {
        logger.info(`   Found ${orderItems.length} order item(s):`)
        for (const item of orderItems.slice(0, 5)) {
          logger.info(`   - Order: ${item.order_id}, Qty: ${item.quantity}, Created: ${item.created_at}`)
        }
      }
    } catch (orderError) {
      logger.info(`   Could not query orders: ${orderError}`)
    }

    logger.info("\n" + "=".repeat(60))
    logger.info("DIAGNOSIS COMPLETE")
    logger.info("=".repeat(60))

  } catch (error) {
    logger.error("Diagnosis failed:", error)
    throw error
  }
}
