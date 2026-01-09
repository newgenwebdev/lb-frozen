import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { PROMO_MODULE } from "../../../../../modules/promo"
import type PromoModuleService from "../../../../../modules/promo/services/promo"
import {
  validateCart,
  calculateCartValueExcludingPWP,
  getApplicableBulkTier,
  getBasePrice,
  type CartItem,
  type ValidationIssue,
} from "../../../../../utils/cart-validation"

interface FixAction {
  item_id: string
  action: "removed" | "price_reverted" | "discount_removed"
  old_price?: number
  new_price?: number
  message: string
}

/**
 * GET /store/cart/:id/validate
 * Validate cart items for pricing eligibility (bulk pricing and PWP)
 *
 * Query params:
 * - auto_fix: "true" to automatically fix invalid items (remove PWP items, revert bulk prices)
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  const { id: cart_id } = req.params
  const autoFix = req.query.auto_fix === "true"
  const logger = req.scope.resolve("logger")

  if (!cart_id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Cart ID is required")
  }

  try {
    const cartModuleService = req.scope.resolve(Modules.CART)
    const productModuleService = req.scope.resolve(Modules.PRODUCT)
    const pricingModule = req.scope.resolve(Modules.PRICING)
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const promoService = req.scope.resolve<PromoModuleService>(PROMO_MODULE)

    // Get cart with items and adjustments
    const cart = await cartModuleService.retrieveCart(cart_id, {
      relations: ["items", "items.adjustments"],
    })

    if (!cart) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Cart with id ${cart_id} not found`)
    }

    const items = (cart.items || []) as CartItem[]
    const issues: ValidationIssue[] = []
    const fixActions: FixAction[] = []

    // Calculate cart value excluding PWP items
    const cartValueExcludingPWP = calculateCartValueExcludingPWP(items)

    // ========================================
    // 1. Validate PWP Items
    // ========================================
    for (const item of items) {
      if (!item.metadata?.is_pwp_item) continue

      const pwpRuleId = item.metadata.pwp_rule_id
      if (!pwpRuleId) continue

      let isEligible = true
      let issueMessage = ""

      try {
        // Get the PWP rule to check current requirements
        const rule = await promoService.retrievePWPRule(pwpRuleId)

        if (!rule || rule.status !== "active") {
          isEligible = false
          issueMessage = `PWP offer "${item.metadata.pwp_rule_name}" is no longer active`
        } else if (rule.trigger_type === "cart_value") {
          const minCartValue = rule.trigger_cart_value || 0

          if (cartValueExcludingPWP < minCartValue) {
            isEligible = false
            issueMessage = `Cart value ($${(cartValueExcludingPWP / 100).toFixed(2)}) is below the minimum ($${(minCartValue / 100).toFixed(2)}) required for "${rule.name}" offer`

            issues.push({
              item_id: item.id,
              variant_id: item.variant_id,
              issue_type: "pwp_ineligible",
              message: issueMessage,
              current_value: cartValueExcludingPWP,
              required_value: minCartValue,
              recommended_action: "remove_item",
            })
          }
        } else if (rule.trigger_type === "product") {
          // Check if trigger product is still in cart
          const triggerProductId = rule.trigger_product_id
          let triggerFound = false

          for (const cartItem of items) {
            if (cartItem.metadata?.is_pwp_item) continue
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
            isEligible = false
            issueMessage = `Trigger product for "${rule.name}" offer is no longer in cart`

            issues.push({
              item_id: item.id,
              variant_id: item.variant_id,
              issue_type: "trigger_product_removed",
              message: issueMessage,
              recommended_action: "remove_item",
            })
          }
        }
      } catch (err) {
        // Rule not found - mark as ineligible
        isEligible = false
        issueMessage = `PWP offer "${item.metadata.pwp_rule_name}" could not be verified`

        issues.push({
          item_id: item.id,
          variant_id: item.variant_id,
          issue_type: "pwp_ineligible",
          message: issueMessage,
          recommended_action: "remove_item",
        })
      }

      // Auto-fix: Remove ineligible PWP item
      if (!isEligible && autoFix) {
        await cartModuleService.deleteLineItems([item.id])
        fixActions.push({
          item_id: item.id,
          action: "removed",
          message: `Removed PWP item: ${issueMessage}`,
        })
        logger.info(`Auto-removed ineligible PWP item ${item.id} from cart ${cart_id}`)
      }
    }

    // ========================================
    // 2. Validate Bulk Priced Items
    // ========================================
    for (const item of items) {
      if (!item.metadata?.is_bulk_price) continue
      if (item.metadata?.is_pwp_item) continue // Skip PWP items

      const minQuantity = item.metadata.bulk_min_quantity || 1
      const currentQty = item.quantity || 0

      if (currentQty < minQuantity) {
        const issueMessage = `Quantity (${currentQty}) is below the minimum (${minQuantity}) required for bulk pricing`

        issues.push({
          item_id: item.id,
          variant_id: item.variant_id,
          issue_type: "bulk_quantity_below_minimum",
          message: issueMessage,
          current_value: currentQty,
          required_value: minQuantity,
          recommended_action: "revert_to_regular_price",
        })

        // Auto-fix: Revert to regular price or applicable tier
        if (autoFix && item.variant_id) {
          const originalPrice = item.metadata.original_unit_price
          let newPrice = originalPrice

          // Try to find applicable bulk tier for current quantity
          try {
            const { data: variantPriceSets } = await query.graph({
              entity: "product_variant_price_set",
              fields: ["variant_id", "price_set_id"],
              filters: { variant_id: item.variant_id },
            })

            if (variantPriceSets.length > 0 && variantPriceSets[0].price_set_id) {
              const prices = await pricingModule.listPrices(
                { price_set_id: [variantPriceSets[0].price_set_id] },
                { select: ["amount", "currency_code", "min_quantity", "max_quantity"] }
              )

              const currencyCode = cart.currency_code || "sgd"

              // Check if there's a lower bulk tier that applies
              const applicableTier = getApplicableBulkTier(
                currentQty,
                prices as any,
                currencyCode
              )

              if (applicableTier) {
                // Use lower tier price
                newPrice = applicableTier.amount

                await cartModuleService.updateLineItems([
                  {
                    id: item.id,
                    unit_price: newPrice,
                    metadata: {
                      ...item.metadata,
                      bulk_min_quantity: applicableTier.min_quantity,
                      bulk_tier_price: newPrice,
                    },
                  },
                ])

                fixActions.push({
                  item_id: item.id,
                  action: "price_reverted",
                  old_price: item.unit_price,
                  new_price: newPrice,
                  message: `Adjusted to applicable bulk tier (min qty: ${applicableTier.min_quantity})`,
                })
              } else {
                // Revert to base price
                const basePrice = getBasePrice(prices as any, currencyCode)
                if (basePrice !== null) {
                  newPrice = basePrice

                  await cartModuleService.updateLineItems([
                    {
                      id: item.id,
                      unit_price: newPrice,
                      metadata: {
                        ...item.metadata,
                        is_bulk_price: false,
                        bulk_min_quantity: undefined,
                        bulk_tier_price: undefined,
                      },
                    },
                  ])

                  fixActions.push({
                    item_id: item.id,
                    action: "price_reverted",
                    old_price: item.unit_price,
                    new_price: newPrice,
                    message: `Reverted to regular price (quantity below bulk threshold)`,
                  })
                }
              }

              logger.info(`Auto-adjusted bulk pricing for item ${item.id} in cart ${cart_id}`)
            }
          } catch (err) {
            logger.warn(`Failed to adjust bulk pricing for item ${item.id}: ${err}`)
          }
        }
      } else {
        // Check if item should be upgraded to a higher bulk tier
        if (autoFix && item.variant_id) {
          try {
            const { data: variantPriceSets } = await query.graph({
              entity: "product_variant_price_set",
              fields: ["variant_id", "price_set_id"],
              filters: { variant_id: item.variant_id },
            })

            if (variantPriceSets.length > 0 && variantPriceSets[0].price_set_id) {
              const prices = await pricingModule.listPrices(
                { price_set_id: [variantPriceSets[0].price_set_id] },
                { select: ["amount", "currency_code", "min_quantity", "max_quantity"] }
              )

              const currencyCode = cart.currency_code || "sgd"
              const applicableTier = getApplicableBulkTier(currentQty, prices as any, currencyCode)

              if (applicableTier && applicableTier.amount !== item.unit_price) {
                // Upgrade to better tier
                await cartModuleService.updateLineItems([
                  {
                    id: item.id,
                    unit_price: applicableTier.amount,
                    metadata: {
                      ...item.metadata,
                      bulk_min_quantity: applicableTier.min_quantity,
                      bulk_tier_price: applicableTier.amount,
                    },
                  },
                ])

                fixActions.push({
                  item_id: item.id,
                  action: "price_reverted",
                  old_price: item.unit_price,
                  new_price: applicableTier.amount,
                  message: `Upgraded to better bulk tier (min qty: ${applicableTier.min_quantity})`,
                })
              }
            }
          } catch (err) {
            // Ignore upgrade errors
          }
        }
      }
    }

    // Get updated cart if fixes were applied
    let updatedCart = cart
    if (autoFix && fixActions.length > 0) {
      updatedCart = await cartModuleService.retrieveCart(cart_id, {
        relations: ["items", "items.adjustments"],
      })
    }

    // Recalculate cart value after fixes
    const finalCartValue = calculateCartValueExcludingPWP(
      (updatedCart.items || []) as CartItem[]
    )

    res.json({
      is_valid: issues.length === 0 || (autoFix && fixActions.length > 0),
      issues: autoFix ? [] : issues,
      fixes_applied: fixActions,
      cart_value_excluding_pwp: finalCartValue,
      cart: autoFix ? updatedCart : undefined,
    })
  } catch (error) {
    logger.error(`Cart validation failed: ${error.message}`)

    if (error instanceof MedusaError) {
      throw error
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Cart validation failed: ${error.message}`
    )
  }
}
