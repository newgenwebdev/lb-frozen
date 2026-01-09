import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

/**
 * DELETE /admin/products/:id/force-delete
 * Force delete a product by removing its inventory reservations first
 *
 * This endpoint is needed when a product has reservations (from carts/orders)
 * that prevent normal deletion.
 */
export const DELETE = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const { id: productId } = req.params
  const logger = req.scope.resolve("logger")

  try {
    const productModule = req.scope.resolve(Modules.PRODUCT)
    const inventoryModule = req.scope.resolve(Modules.INVENTORY)

    // Get product with variants
    const product = await productModule.retrieveProduct(productId, {
      relations: ["variants"],
    })

    if (!product) {
      res.status(404).json({ message: `Product ${productId} not found` })
      return
    }

    logger.info(`[FORCE-DELETE] Starting force delete for product: ${product.title} (${productId})`)

    // Get all variant IDs
    const variantIds = product.variants?.map(v => v.id) || []

    if (variantIds.length > 0) {
      // Find inventory items for these variants
      const inventoryItems = await inventoryModule.listInventoryItems({
        // sku is linked to variant, but we need to find by variant relationship
      })

      // Get all reservations
      const reservations = await inventoryModule.listReservationItems({})

      logger.info(`[FORCE-DELETE] Found ${reservations.length} total reservations in system`)

      // Find inventory item IDs for this product's variants
      // We need to check which inventory items belong to our variants
      const productInventoryItemIds: string[] = []

      for (const variant of product.variants || []) {
        // Find inventory items with matching SKU
        const variantInventoryItems = inventoryItems.filter(
          item => item.sku === variant.sku
        )
        productInventoryItemIds.push(...variantInventoryItems.map(i => i.id))
      }

      logger.info(`[FORCE-DELETE] Found ${productInventoryItemIds.length} inventory items for product variants`)

      // Filter reservations for this product's inventory items
      const productReservations = reservations.filter(
        r => productInventoryItemIds.includes(r.inventory_item_id)
      )

      logger.info(`[FORCE-DELETE] Found ${productReservations.length} reservations to delete`)

      // Delete each reservation
      for (const reservation of productReservations) {
        try {
          await inventoryModule.deleteReservationItems([reservation.id])
          logger.info(`[FORCE-DELETE] Deleted reservation: ${reservation.id}`)
        } catch (err) {
          logger.warn(`[FORCE-DELETE] Failed to delete reservation ${reservation.id}: ${err}`)
        }
      }
    }

    // Now delete the product
    await productModule.deleteProducts([productId])

    logger.info(`[FORCE-DELETE] Successfully deleted product: ${product.title} (${productId})`)

    res.json({
      success: true,
      message: `Product "${product.title}" and its reservations have been deleted`,
      deleted: {
        productId,
        productTitle: product.title,
      },
    })
  } catch (error) {
    logger.error(`[FORCE-DELETE] Failed to force delete product: ${error.message}`)

    res.status(500).json({
      success: false,
      message: `Failed to delete product: ${error.message}`,
    })
  }
}
