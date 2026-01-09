import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { PROMO_MODULE } from "../../../../../modules/promo"
import { MEMBERSHIP_MODULE } from "../../../../../modules/membership"
import { TIER_CONFIG_MODULE } from "../../../../../modules/tier-config"
import { getVerifiedCustomerId } from "../../../../../utils/store-auth"
import {
  calculateCartValueExcludingPWP,
  getApplicableBulkTier,
  getBasePrice,
  type CartItem,
} from "../../../../../utils/cart-validation"

/**
 * POST /store/carts/:id/sync-prices
 *
 * Synchronizes cart prices with current pricing rules.
 * Call this before checkout or when frontend detects price mismatch.
 *
 * This endpoint:
 * 1. Updates bulk prices based on current quantities
 * 2. Removes ineligible PWP items
 * 3. Returns the corrected cart
 *
 * Frontend should call this:
 * - Before proceeding to checkout
 * - When user clicks "Refresh prices"
 * - After a long idle period
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  const { id: cart_id } = req.params
  const logger = req.scope.resolve("logger")

  if (!cart_id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Cart ID is required")
  }

  try {
    const cartModuleService = req.scope.resolve(Modules.CART)
    const productModuleService = req.scope.resolve(Modules.PRODUCT)
    const pricingModule = req.scope.resolve(Modules.PRICING)
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const promoService = req.scope.resolve(PROMO_MODULE) as any

    // Get cart
    const cart = await cartModuleService.retrieveCart(cart_id, {
      relations: ["items", "items.adjustments"],
    })

    if (!cart) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Cart with id ${cart_id} not found`)
    }

    const items = cart.items as CartItem[]
    const currencyCode = cart.currency_code || "sgd"

    const itemsToRemove: string[] = []
    const itemsToUpdate: Array<{ id: string; unit_price: number; metadata: any }> = []
    const changes: Array<{ item_id: string; type: string; message: string }> = []

    // Calculate cart value excluding PWP
    const cartValueExcludingPWP = calculateCartValueExcludingPWP(items)

    // ========================================
    // 1. Validate PWP Items
    // ========================================
    for (const item of items) {
      if (!item.metadata?.is_pwp_item) continue

      const pwpRuleId = item.metadata.pwp_rule_id as string
      if (!pwpRuleId) continue

      let shouldRemove = false
      let reason = ""

      try {
        const rule = await promoService.retrievePWPRule(pwpRuleId)

        if (!rule || rule.status !== "active") {
          shouldRemove = true
          reason = "PWP offer is no longer active"
        } else {
          const now = new Date()
          if (rule.starts_at && new Date(rule.starts_at) > now) {
            shouldRemove = true
            reason = "PWP offer has not started yet"
          } else if (rule.ends_at && new Date(rule.ends_at) < now) {
            shouldRemove = true
            reason = "PWP offer has expired"
          } else if (rule.trigger_type === "cart_value") {
            const minCartValue = rule.trigger_cart_value || 0
            if (cartValueExcludingPWP < minCartValue) {
              shouldRemove = true
              reason = `Cart value ($${(cartValueExcludingPWP / 100).toFixed(2)}) is below minimum ($${(minCartValue / 100).toFixed(2)})`
            }
          } else if (rule.trigger_type === "product") {
            let triggerFound = false
            for (const cartItem of items) {
              if (cartItem.metadata?.is_pwp_item) continue
              if (!cartItem.variant_id) continue

              try {
                const variant = await productModuleService.retrieveProductVariant(cartItem.variant_id, {
                  select: ["product_id"],
                })
                if (variant?.product_id === rule.trigger_product_id) {
                  triggerFound = true
                  break
                }
              } catch {
                // Continue
              }
            }
            if (!triggerFound) {
              shouldRemove = true
              reason = "Required product is no longer in cart"
            }
          }
        }
      } catch {
        shouldRemove = true
        reason = "Could not verify PWP offer"
      }

      if (shouldRemove) {
        itemsToRemove.push(item.id)
        changes.push({
          item_id: item.id,
          type: "pwp_removed",
          message: reason,
        })
      }
    }

    // ========================================
    // 2. Sync Bulk Pricing & Variant Discounts
    // ========================================
    for (const item of items) {
      if (item.metadata?.is_pwp_item) continue
      if (itemsToRemove.includes(item.id)) continue
      if (!item.variant_id) continue

      const currentQty = Number(item.quantity) || 0
      const currentPrice = Number(item.unit_price)

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

        const applicableTier = getApplicableBulkTier(currentQty, prices as any, currencyCode)
        const basePrice = getBasePrice(prices as any, currencyCode)

        let correctPrice: number
        let isBulkPrice = false
        let bulkMinQty: number | undefined
        let isVariantDiscount = false
        let variantDiscountAmount = 0
        let variantDiscountType: string | undefined

        if (applicableTier) {
          // Wholesale tier takes priority over variant discount
          correctPrice = applicableTier.amount
          isBulkPrice = true
          bulkMinQty = applicableTier.min_quantity
        } else if (basePrice !== null) {
          correctPrice = basePrice

          // No bulk tier applies - check for variant metadata discount
          const variant = await productModuleService.retrieveProductVariant(item.variant_id, {
            select: ["id", "metadata"],
          })
          const variantMetadata = (variant as any)?.metadata || {}
          const discountValue = Number(variantMetadata.discount) || 0
          const discountType = variantMetadata.discount_type as string | undefined

          if (discountValue > 0 && discountType) {
            let discountedPrice: number

            if (discountType === "percentage") {
              // Percentage discount (e.g., 15 means 15% off)
              const discountPercent = Math.min(discountValue, 100) // Cap at 100%
              discountedPrice = Math.round(basePrice * (1 - discountPercent / 100))
            } else {
              // Fixed discount (value is in cents)
              discountedPrice = Math.max(0, basePrice - discountValue)
            }

            if (discountedPrice < basePrice) {
              correctPrice = discountedPrice
              isVariantDiscount = true
              variantDiscountAmount = basePrice - discountedPrice
              variantDiscountType = discountType
            }
          }
        } else {
          continue // No price info, skip
        }

        // Check if price changed OR if metadata flags need to be updated
        // This ensures items added before discount features get their metadata updated
        const currentIsBulk = Boolean(item.metadata?.is_bulk_price)
        const currentIsVariantDiscount = Boolean(item.metadata?.is_variant_discount)
        const needsMetadataUpdate = (isBulkPrice !== currentIsBulk) || (isVariantDiscount !== currentIsVariantDiscount)
        const needsPriceUpdate = correctPrice !== currentPrice

        if (needsPriceUpdate || needsMetadataUpdate) {
          const newMetadata: Record<string, unknown> = {
            ...item.metadata,
            original_unit_price: basePrice,
          }

          // Clear old pricing flags and set new ones
          delete newMetadata.is_bulk_price
          delete newMetadata.bulk_min_quantity
          delete newMetadata.bulk_tier_price
          delete newMetadata.is_variant_discount
          delete newMetadata.variant_discount_amount
          delete newMetadata.variant_discount_type

          if (isBulkPrice) {
            newMetadata.is_bulk_price = true
            newMetadata.bulk_min_quantity = bulkMinQty
            newMetadata.bulk_tier_price = correctPrice
          } else if (isVariantDiscount) {
            newMetadata.is_variant_discount = true
            newMetadata.variant_discount_amount = variantDiscountAmount
            newMetadata.variant_discount_type = variantDiscountType
          }

          itemsToUpdate.push({
            id: item.id,
            unit_price: correctPrice,
            metadata: newMetadata,
          })

          if (needsPriceUpdate) {
            const priceChange = correctPrice - currentPrice
            const changeType = priceChange < 0 ? "price_decreased" : "price_increased"
            let message: string

            if (isBulkPrice) {
              message = `Bulk price applied (min qty: ${bulkMinQty}): $${(currentPrice / 100).toFixed(2)} → $${(correctPrice / 100).toFixed(2)}`
            } else if (isVariantDiscount) {
              message = `Variant discount applied: $${(currentPrice / 100).toFixed(2)} → $${(correctPrice / 100).toFixed(2)}`
            } else {
              message = `Price updated: $${(currentPrice / 100).toFixed(2)} → $${(correctPrice / 100).toFixed(2)}`
            }

            changes.push({
              item_id: item.id,
              type: changeType,
              message,
            })
          } else if (needsMetadataUpdate) {
            // Price is same but metadata changed (e.g., discount flag added)
            changes.push({
              item_id: item.id,
              type: "metadata_updated",
              message: isVariantDiscount ? "Variant discount metadata applied" : isBulkPrice ? "Bulk price metadata applied" : "Metadata updated",
            })
          }
        }
      } catch (err) {
        logger.warn(`[SYNC-PRICES] Failed to check pricing for item ${item.id}: ${err}`)
      }
    }

    // ========================================
    // 3. Apply Changes
    // ========================================
    if (itemsToRemove.length > 0) {
      await cartModuleService.deleteLineItems(itemsToRemove)
    }
    if (itemsToUpdate.length > 0) {
      await cartModuleService.updateLineItems(itemsToUpdate)
    }

    // Get updated cart
    let updatedCart = await cartModuleService.retrieveCart(cart_id, {
      relations: ["items", "items.adjustments"],
    })

    // ========================================
    // 4. Calculate Tier Discount (for authenticated members)
    // ========================================
    let tierDiscountAmount = 0
    let tierDiscountPercentage = 0
    let tierSlug: string | null = null
    let tierName: string | null = null

    const customerId = getVerifiedCustomerId(req)

    if (customerId && cart.customer_id === customerId) {
      try {
        const membershipService = req.scope.resolve(MEMBERSHIP_MODULE) as any
        const tierConfigService = req.scope.resolve(TIER_CONFIG_MODULE) as any

        // Get membership with tier info
        const membershipData = await membershipService.getMembershipWithActivity(customerId)

        if (membershipData?.membership?.status === "active" && membershipData.membership.tier_slug) {
          const tier = await tierConfigService.getTierBySlug(membershipData.membership.tier_slug)

          if (tier && tier.discount_percentage > 0) {
            tierDiscountPercentage = tier.discount_percentage
            tierSlug = tier.slug
            tierName = tier.name

            // Calculate NET subtotal for tier discount calculation
            // PWP items have discounted prices, so we need to subtract pwp_discount_amount
            const currentSubtotal = (updatedCart.items || []).reduce((sum, item) => {
              const lineTotal = Number(item.unit_price) * Number(item.quantity)
              // Subtract PWP discount to get net price
              if (item.metadata?.is_pwp_item && item.metadata?.pwp_discount_amount) {
                const pwpDiscount = Number(item.metadata.pwp_discount_amount) * Number(item.quantity)
                return sum + (lineTotal - pwpDiscount)
              }
              return sum + lineTotal
            }, 0)

            // Calculate tier discount on NET subtotal
            tierDiscountAmount = Math.round(currentSubtotal * tierDiscountPercentage / 100)

            logger.info(
              `[SYNC-PRICES] Tier discount applied: ${tierDiscountPercentage}% = ${tierDiscountAmount} cents for tier ${tierSlug}`
            )
          }
        }
      } catch (err) {
        logger.warn(`[SYNC-PRICES] Failed to calculate tier discount: ${err}`)
      }
    }

    // Store tier discount in cart metadata (or clear if no longer applicable)
    const existingTierDiscount = updatedCart.metadata?.tier_discount_amount
    if (tierDiscountAmount > 0 || existingTierDiscount) {
      await cartModuleService.updateCarts(cart_id, {
        metadata: {
          ...updatedCart.metadata,
          tier_discount_percentage: tierDiscountPercentage || null,
          tier_discount_amount: tierDiscountAmount || null,
          tier_slug: tierSlug,
          tier_name: tierName,
        },
      })

      // Refresh cart to get updated metadata
      updatedCart = await cartModuleService.retrieveCart(cart_id, {
        relations: ["items", "items.adjustments"],
      })
    }

    // Calculate totals
    const updatedItems = updatedCart.items || []
    const subtotal = updatedItems.reduce((sum, item) => {
      return sum + Number(item.unit_price) * Number(item.quantity)
    }, 0)

    const pwpDiscount = updatedItems.reduce((sum, item) => {
      if (item.metadata?.is_pwp_item && item.metadata?.pwp_discount_amount) {
        return sum + Number(item.metadata.pwp_discount_amount) * (Number(item.quantity) || 1)
      }
      return sum
    }, 0)

    // Variant discount is already reflected in unit_price, so we track it for display purposes
    const variantDiscount = updatedItems.reduce((sum, item) => {
      if (item.metadata?.is_variant_discount && item.metadata?.variant_discount_amount) {
        return sum + Number(item.metadata.variant_discount_amount) * (Number(item.quantity) || 1)
      }
      return sum
    }, 0)

    const adjustmentDiscount = updatedItems.reduce((sum, item) => {
      return sum + ((item as any).adjustments || []).reduce(
        (adjSum: number, adj: any) => adjSum + (Number(adj.amount) || 0),
        0
      )
    }, 0)

    const pointsDiscount = Number(updatedCart.metadata?.points_discount_amount) || 0
    // Note: variantDiscount is already in unit_price, so don't subtract again
    // Tier discount was calculated above and stored in cart metadata
    const totalDiscount = pwpDiscount + adjustmentDiscount + pointsDiscount + tierDiscountAmount
    const total = Math.max(0, subtotal - totalDiscount)

    logger.info(
      `[SYNC-PRICES] Cart ${cart_id} synced: ${itemsToRemove.length} removed, ${itemsToUpdate.length} updated`
    )

    res.json({
      success: true,
      cart: updatedCart,
      changes,
      totals: {
        subtotal,
        pwp_discount: pwpDiscount,
        variant_discount: variantDiscount, // For display - already in unit_price
        adjustment_discount: adjustmentDiscount,
        points_discount: pointsDiscount,
        tier_discount: tierDiscountAmount,
        total_discount: totalDiscount,
        total,
      },
      tier_info: tierSlug ? {
        slug: tierSlug,
        name: tierName,
        discount_percentage: tierDiscountPercentage,
        discount_amount: tierDiscountAmount,
      } : null,
      summary: {
        items_removed: itemsToRemove.length,
        items_updated: itemsToUpdate.length,
        has_changes: changes.length > 0,
      },
    })
  } catch (error) {
    logger.error(`[SYNC-PRICES] Failed: ${error}`)

    if (error instanceof MedusaError) {
      throw error
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Failed to sync prices: ${error}`
    )
  }
}
