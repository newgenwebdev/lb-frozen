import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/framework/types"
import { PROMO_MODULE } from "../modules/promo"
import {
  calculateCartValueExcludingPWP,
  getApplicableBulkTier,
  getBasePrice,
  type CartItem,
} from "../utils/cart-validation"

interface CartUpdatedData {
  id: string
}

// Track carts that are currently being processed to prevent recursive validation
const processingCarts = new Set<string>()

/**
 * Cart Updated Subscriber
 *
 * Automatically validates and adjusts pricing when cart items are modified:
 * 1. PWP items: Removes if cart value drops below minimum or trigger product removed
 * 2. Bulk priced items: Adjusts price based on current quantity
 *
 * This prevents pricing exploits where users manipulate cart to keep discounts
 * they're no longer eligible for.
 *
 * NOTE: This subscriber uses an in-memory set to prevent recursive validation
 * when our own updates trigger additional cart.updated events.
 */
export default async function cartUpdatedHandler({
  event: { data },
  container,
}: SubscriberArgs<CartUpdatedData>): Promise<void> {
  const logger = container.resolve<Logger>("logger")
  const cartModuleService = container.resolve(Modules.CART)
  const productModuleService = container.resolve(Modules.PRODUCT)
  const pricingModule = container.resolve(Modules.PRICING)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const promoService = container.resolve(PROMO_MODULE) as any

  const cartId = data.id
  if (!cartId) return

  // Skip if this cart is already being processed (prevents recursive validation)
  if (processingCarts.has(cartId)) {
    logger.info(`[CART-UPDATED] Skipping cart ${cartId} - already being processed`)
    return
  }

  // Mark cart as being processed IMMEDIATELY to prevent race conditions
  processingCarts.add(cartId)

  // Add delay to allow primary cart update to complete and release lock
  // This helps avoid lock conflicts with concurrent cart updates from frontend
  // 500ms should be enough for most cart operations to complete
  await new Promise((resolve) => setTimeout(resolve, 500))

  logger.info(`[CART-UPDATED] Validating cart ${cartId}`)

  try {
    // Get cart with items and adjustments
    const cart = await cartModuleService.retrieveCart(cartId, {
      relations: ["items", "items.adjustments"],
    })

    if (!cart || !cart.items || cart.items.length === 0) {
      return
    }

    const items = cart.items as CartItem[]
    const itemsToRemove: string[] = []
    const itemsToUpdate: Array<{ id: string; unit_price: number; metadata: any }> = []

    // Calculate cart value excluding PWP items
    const cartValueExcludingPWP = calculateCartValueExcludingPWP(items)

    // ========================================
    // 1. Validate PWP Items
    // ========================================
    for (const item of items) {
      if (!item.metadata?.is_pwp_item) continue

      const pwpRuleId = item.metadata.pwp_rule_id
      if (!pwpRuleId) continue

      try {
        const rule = await promoService.retrievePWPRule(pwpRuleId)

        if (!rule || rule.status !== "active") {
          // Rule no longer active - remove item
          itemsToRemove.push(item.id)
          logger.info(`[CART-UPDATED] Marking PWP item ${item.id} for removal - rule inactive`)
          continue
        }

        // Check date validity
        const now = new Date()
        if (rule.starts_at && new Date(rule.starts_at) > now) {
          itemsToRemove.push(item.id)
          logger.info(`[CART-UPDATED] Marking PWP item ${item.id} for removal - rule not started`)
          continue
        }
        if (rule.ends_at && new Date(rule.ends_at) < now) {
          itemsToRemove.push(item.id)
          logger.info(`[CART-UPDATED] Marking PWP item ${item.id} for removal - rule expired`)
          continue
        }

        if (rule.trigger_type === "cart_value") {
          const minCartValue = rule.trigger_cart_value || 0

          if (cartValueExcludingPWP < minCartValue) {
            // Cart value below minimum - remove PWP item
            itemsToRemove.push(item.id)
            logger.info(
              `[CART-UPDATED] Marking PWP item ${item.id} for removal - ` +
              `cart value $${(cartValueExcludingPWP / 100).toFixed(2)} < min $${(minCartValue / 100).toFixed(2)}`
            )
          }
        } else if (rule.trigger_type === "product") {
          // Check if trigger product is still in cart
          const triggerProductId = rule.trigger_product_id
          let triggerFound = false

          for (const cartItem of items) {
            if (cartItem.metadata?.is_pwp_item) continue
            if (itemsToRemove.includes(cartItem.id)) continue
            if (!cartItem.variant_id) continue

            try {
              const variant = await productModuleService.retrieveProductVariant(cartItem.variant_id, {
                select: ["product_id"],
              })
              if (variant?.product_id === triggerProductId) {
                triggerFound = true
                break
              }
            } catch {
              // Continue checking
            }
          }

          if (!triggerFound) {
            itemsToRemove.push(item.id)
            logger.info(`[CART-UPDATED] Marking PWP item ${item.id} for removal - trigger product removed`)
          }
        }
      } catch (err) {
        // Rule fetch failed - remove to be safe
        itemsToRemove.push(item.id)
        logger.warn(`[CART-UPDATED] Marking PWP item ${item.id} for removal - rule fetch failed: ${err}`)
      }
    }

    // ========================================
    // 2. Validate & Adjust Bulk Priced Items
    // ========================================
    for (const item of items) {
      if (!item.metadata?.is_bulk_price) continue
      if (item.metadata?.is_pwp_item) continue
      if (itemsToRemove.includes(item.id)) continue
      if (!item.variant_id) continue

      const currentQty = item.quantity || 0
      const currentMinQty = item.metadata.bulk_min_quantity || 1

      // Fetch current price tiers
      try {
        const { data: variantPriceSets } = await query.graph({
          entity: "product_variant_price_set",
          fields: ["variant_id", "price_set_id"],
          filters: { variant_id: item.variant_id },
        })

        if (!variantPriceSets.length || !variantPriceSets[0].price_set_id) continue

        const prices = await pricingModule.listPrices(
          { price_set_id: [variantPriceSets[0].price_set_id] },
          { select: ["amount", "currency_code", "min_quantity", "max_quantity"] }
        )

        const currencyCode = cart.currency_code || "myr"
        const applicableTier = getApplicableBulkTier(currentQty, prices as any, currencyCode)
        const basePrice = getBasePrice(prices as any, currencyCode)

        if (applicableTier) {
          // Has applicable tier - check if price needs adjustment
          if (applicableTier.amount !== item.unit_price || applicableTier.min_quantity !== currentMinQty) {
            itemsToUpdate.push({
              id: item.id,
              unit_price: applicableTier.amount,
              metadata: {
                ...item.metadata,
                is_bulk_price: true,
                bulk_min_quantity: applicableTier.min_quantity,
                bulk_tier_price: applicableTier.amount,
              },
            })
            logger.info(
              `[CART-UPDATED] Adjusting bulk price for item ${item.id}: ` +
              `${item.unit_price} -> ${applicableTier.amount} (min qty: ${applicableTier.min_quantity})`
            )
          }
        } else if (basePrice !== null && item.metadata.is_bulk_price) {
          // No applicable tier - revert to base price
          itemsToUpdate.push({
            id: item.id,
            unit_price: basePrice,
            metadata: {
              ...item.metadata,
              is_bulk_price: false,
              bulk_min_quantity: undefined,
              bulk_tier_price: undefined,
            },
          })
          logger.info(
            `[CART-UPDATED] Reverting bulk price for item ${item.id}: ` +
            `${item.unit_price} -> ${basePrice} (qty below threshold)`
          )
        }
      } catch (err) {
        logger.warn(`[CART-UPDATED] Failed to validate bulk pricing for item ${item.id}: ${err}`)
      }
    }

    // ========================================
    // 3. Apply Changes
    // ========================================

    // Remove ineligible PWP items
    if (itemsToRemove.length > 0) {
      await cartModuleService.deleteLineItems(itemsToRemove)
      logger.info(`[CART-UPDATED] Removed ${itemsToRemove.length} ineligible items from cart ${cartId}`)
    }

    // Update bulk priced items
    if (itemsToUpdate.length > 0) {
      await cartModuleService.updateLineItems(itemsToUpdate)
      logger.info(`[CART-UPDATED] Updated ${itemsToUpdate.length} bulk priced items in cart ${cartId}`)
    }

    if (itemsToRemove.length > 0 || itemsToUpdate.length > 0) {
      logger.info(`[CART-UPDATED] Cart ${cartId} validation complete - ${itemsToRemove.length} removed, ${itemsToUpdate.length} updated`)
    }
  } catch (error) {
    logger.error(`[CART-UPDATED] Cart validation failed for ${cartId}: ${error}`)
    // Don't throw - cart update should still succeed even if validation fails
  } finally {
    // Always remove cart from processing set when done
    processingCarts.delete(cartId)
  }
}

export const config: SubscriberConfig = {
  event: [
    "cart.line_item_created",
    "cart.line_item_updated",
    "cart.line_item_deleted",
    "cart.updated",
  ],
}
