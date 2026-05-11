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
import { getCustomerPricingGroupId } from "../utils/store-auth"

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
    // 3. Apply Role Pricing + Metadata Discount
    // ========================================
    // Recompute unit_price for every regular line item based on:
    //   1. Customer's role (VIP/Supplier/Bulk via customer_group_id) — Medusa
    //      doesn't always re-resolve role pricing when a guest cart is later
    //      associated with a logged-in customer, so we always force it here.
    //   2. Variant/product metadata discount — a percentage of the DEFAULT
    //      price, applied as a flat amount across all roles. e.g. default
    //      RM 100 + 10% → RM 10 off → retail pays 90, VIP (base 90) pays 80,
    //      supplier (base 80) pays 70.
    //
    // Idempotent: `desired = rolePrice - discountAmount`, only updates when
    // it differs from current `item.unit_price`.

    const repriceCandidates = items.filter(
      (item) =>
        !item.metadata?.is_pwp_item &&
        !item.metadata?.is_bulk_price &&
        !itemsToRemove.includes(item.id) &&
        !itemsToUpdate.some((u) => u.id === item.id) &&
        Boolean(item.variant_id)
    )

    if (repriceCandidates.length > 0) {
      try {
        const variantIdsForReprice = repriceCandidates.map(
          (i) => i.variant_id as string
        )

        // Fetch variants (with product) to read discount metadata
        const variants = await productModuleService.listProductVariants(
          { id: variantIdsForReprice },
          { relations: ["product"], take: variantIdsForReprice.length }
        )

        const discountByVariant = new Map<string, number>()
        for (const v of variants as Array<any>) {
          const variantPct = Number(v.metadata?.discount || 0)
          const productPct = Number(v.product?.metadata?.discount || 0)
          const pct = variantPct || productPct
          if (pct > 0) discountByVariant.set(v.id, pct)
        }

        const { data: variantPriceSets } = await query.graph({
          entity: "product_variant_price_set",
          fields: ["variant_id", "price_set_id"],
          filters: { variant_id: variantIdsForReprice },
        })

        const variantToPriceSet = new Map<string, string>()
        for (const vps of variantPriceSets as Array<any>) {
          if (vps.variant_id && vps.price_set_id) {
            variantToPriceSet.set(vps.variant_id, vps.price_set_id)
          }
        }

        const priceSetIds = Array.from(new Set(variantToPriceSet.values()))
        if (priceSetIds.length > 0) {
          const customerGroupId = await getCustomerPricingGroupId(
            container,
            cart.customer_id
          )

          const calculated = await pricingModule.calculatePrices(
            { id: priceSetIds },
            {
              context: {
                currency_code: cart.currency_code || "myr",
                ...(customerGroupId
                  ? { customer_group_id: customerGroupId }
                  : {}),
              },
            }
          )

          const priceSetAmounts = new Map<
            string,
            { role: number; defaultAmt: number }
          >()
          for (const p of calculated as Array<any>) {
            if (p.calculated_amount == null) continue
            priceSetAmounts.set(p.id, {
              role: Number(p.calculated_amount),
              defaultAmt: Number(p.original_amount ?? p.calculated_amount),
            })
          }

          for (const item of repriceCandidates) {
            const psId = variantToPriceSet.get(item.variant_id as string)
            if (!psId) continue
            const amts = priceSetAmounts.get(psId)
            if (!amts) continue

            const discountPct =
              discountByVariant.get(item.variant_id as string) || 0
            const discountAmount =
              discountPct > 0
                ? Math.round((amts.defaultAmt * discountPct) / 100)
                : 0
            const desiredUnitPrice = Math.max(0, amts.role - discountAmount)

            if (item.unit_price === desiredUnitPrice) continue

            itemsToUpdate.push({
              id: item.id,
              unit_price: desiredUnitPrice,
              metadata: {
                ...item.metadata,
                applied_metadata_discount_percent: discountPct || undefined,
                applied_metadata_discount_amount:
                  discountAmount || undefined,
              },
            })
            logger.info(
              `[CART-UPDATED] Repricing item ${item.id}: ` +
                `${item.unit_price} -> ${desiredUnitPrice} ` +
                `(role: ${amts.role}, default: ${amts.defaultAmt}, ${discountPct}% off${customerGroupId ? `, group: ${customerGroupId}` : ", retail"})`
            )
          }
        }
      } catch (err) {
        logger.warn(
          `[CART-UPDATED] Failed to reprice line items: ${err}`
        )
      }
    }

    // ========================================
    // 4. Apply Changes
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
