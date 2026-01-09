import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { PROMO_MODULE } from "../../../../modules/promo"
import type PromoModuleService from "../../../../modules/promo/services/promo"
import type { CheckPWPRequest } from "../schemas"

/**
 * Helper function to get inventory levels for variants
 * Returns a map of variant_id -> available quantity
 */
async function getVariantInventoryMap(
  query: any,
  variantIds: string[]
): Promise<Map<string, number>> {
  const inventoryMap = new Map<string, number>()

  if (variantIds.length === 0) {
    return inventoryMap
  }

  try {
    // Get inventory item links for variants
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

    if (inventoryItemIds.length === 0) {
      return inventoryMap
    }

    // Get inventory levels
    const { data: inventoryLevels } = await query.graph({
      entity: "inventory_level",
      fields: ["inventory_item_id", "stocked_quantity", "reserved_quantity"],
      filters: {
        inventory_item_id: inventoryItemIds,
      },
    })

    // Create map of inventory_item_id to available quantity
    const inventoryItemToQty = new Map<string, number>()
    for (const level of inventoryLevels) {
      const stocked = Number(level.stocked_quantity) || 0
      const reserved = Number(level.reserved_quantity) || 0
      const available = stocked - reserved
      const existing = inventoryItemToQty.get(level.inventory_item_id) || 0
      inventoryItemToQty.set(level.inventory_item_id, existing + available)
    }

    // Map variant_id to inventory quantity
    for (const link of inventoryLinks) {
      const qty = inventoryItemToQty.get(link.inventory_item_id) || 0
      const existing = inventoryMap.get(link.variant_id) || 0
      inventoryMap.set(link.variant_id, existing + qty)
    }
  } catch {
    // Inventory lookup failed, return empty map
  }

  return inventoryMap
}

/**
 * POST /store/pwp/check
 * Check which PWP offers are eligible for a cart
 * Returns list of available PWP offers based on cart contents and value
 */
export const POST = async (
  req: MedusaRequest<CheckPWPRequest>,
  res: MedusaResponse
): Promise<void> => {
  const body = req.validatedBody || req.body
  const { cart_id } = body
  const logger = req.scope.resolve("logger")

  if (!cart_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Missing required field: cart_id is required"
    )
  }

  try {
    const cartModuleService = req.scope.resolve(Modules.CART)
    const productModuleService = req.scope.resolve(Modules.PRODUCT)
    const pricingModule = req.scope.resolve(Modules.PRICING)
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const promoService = req.scope.resolve<PromoModuleService>(PROMO_MODULE)

    // Get cart with items
    const cart = await cartModuleService.retrieveCart(cart_id, {
      relations: ["items"],
    })

    if (!cart) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Cart with id ${cart_id} not found`
      )
    }

    // Calculate cart value (sum of all item totals, excluding PWP items)
    // PWP items should not count toward threshold eligibility
    const cartValue = (cart.items || []).reduce((sum, item) => {
      // Skip PWP items - they shouldn't count toward threshold
      if (item.metadata?.is_pwp_item) return sum
      const unitPrice = Number(item.unit_price) || 0
      const qty = Number(item.quantity) || 0
      return sum + (unitPrice * qty)
    }, 0)

    // Get product IDs in cart
    const cartProductIds = new Set<string>()
    for (const item of cart.items || []) {
      if (item.variant_id) {
        try {
          const variant = await productModuleService.retrieveProductVariant(item.variant_id, {
            select: ["product_id"],
          })
          if (variant?.product_id) {
            cartProductIds.add(variant.product_id)
          }
        } catch {
          // Variant might not exist, skip
        }
      }
    }

    // Get all active PWP rules
    const now = new Date()
    const allRules = await promoService.listPWPRules(
      { status: "active" },
      {}
    )

    // Filter eligible rules
    const eligibleOffers: Array<{
      rule_id: string
      name: string
      description: string
      trigger_type: string
      trigger_cart_value: number | null
      trigger_product_id: string | null
      trigger_met: boolean
      reward_product_id: string | null
      reward_product: {
        id: string
        title: string
        thumbnail: string | null
        variants: Array<{
          id: string
          title: string
          sku: string | null
          prices: Array<{
            amount: number
            currency_code: string
          }>
          inventory_quantity: number
        }>
      } | null
      reward_type: string
      reward_value: number
      original_price: number | null
      discounted_price: number | null
      already_applied: boolean
      is_out_of_stock: boolean
      total_inventory: number
    }> = []

    // Check if cart already has PWP items applied
    const appliedPWPRuleIds = new Set<string>()
    for (const item of cart.items || []) {
      if (item.metadata?.is_pwp_item && item.metadata?.pwp_rule_id) {
        appliedPWPRuleIds.add(item.metadata.pwp_rule_id as string)
      }
    }

    for (const rule of allRules) {
      // Check date validity
      if (rule.starts_at && new Date(rule.starts_at) > now) continue
      if (rule.ends_at && new Date(rule.ends_at) < now) continue

      // Check usage limit
      if (rule.usage_limit && rule.redemption_count >= rule.usage_limit) continue

      // Check trigger condition
      let triggerMet = false
      if (rule.trigger_type === "cart_value") {
        triggerMet = rule.trigger_cart_value ? cartValue >= rule.trigger_cart_value : false
      } else if (rule.trigger_type === "product") {
        triggerMet = rule.trigger_product_id ? cartProductIds.has(rule.trigger_product_id) : false
      }

      // Get reward product info if available
      let rewardProduct = null
      let originalPrice: number | null = null
      let discountedPrice: number | null = null
      let isOutOfStock = false
      let totalInventory = 0

      if (rule.reward_product_id) {
        try {
          const product = await productModuleService.retrieveProduct(rule.reward_product_id, {
            relations: ["variants"],
          })

          if (product) {
            // Get variant IDs for price and inventory lookup
            const variantIds = (product.variants || []).map((v: any) => v.id)

            // Fetch prices via price set link (Medusa v2 pattern)
            const priceMap = new Map<string, Array<{ amount: number; currency_code: string }>>()

            // Fetch inventory levels for all variants
            const inventoryMap = await getVariantInventoryMap(query, variantIds)

            // Calculate total inventory across all variants
            for (const variantId of variantIds) {
              totalInventory += inventoryMap.get(variantId) || 0
            }

            // Product is out of stock if no variant has available inventory
            isOutOfStock = totalInventory <= 0

            if (variantIds.length > 0) {
              try {
                // Get variant price sets via link
                const { data: variantPriceSets } = await query.graph({
                  entity: "product_variant_price_set",
                  fields: ["variant_id", "price_set_id"],
                  filters: {
                    variant_id: variantIds,
                  },
                })

                // Get prices for all price sets
                const priceSetIds = variantPriceSets.map((vps: any) => vps.price_set_id).filter(Boolean)

                if (priceSetIds.length > 0) {
                  const prices = await pricingModule.listPrices(
                    { price_set_id: priceSetIds },
                    { select: ["amount", "currency_code", "price_set_id"] }
                  )

                  // Create map of price_set_id to prices
                  const priceSetToPrices = new Map<string, Array<{ amount: number; currency_code: string }>>()
                  for (const price of prices) {
                    const existing = priceSetToPrices.get(price.price_set_id) || []
                    existing.push({ amount: Number(price.amount), currency_code: price.currency_code })
                    priceSetToPrices.set(price.price_set_id, existing)
                  }

                  // Map variant_id to prices
                  for (const vps of variantPriceSets) {
                    if (vps.price_set_id && priceSetToPrices.has(vps.price_set_id)) {
                      priceMap.set(vps.variant_id, priceSetToPrices.get(vps.price_set_id)!)
                    }
                  }
                }
              } catch (priceErr) {
                logger.warn(`Failed to fetch prices for variants: ${priceErr}`)
              }
            }

            // Get first variant price as original price
            const firstVariant = product.variants?.[0] as any
            const variantPrices = priceMap.get(firstVariant?.id) || []
            const price = variantPrices.find(
              (p: any) => p.currency_code === (cart.currency_code || "sgd")
            ) || variantPrices[0]

            if (price) {
              originalPrice = price.amount
              // Calculate discounted price
              if (rule.reward_type === "percentage") {
                discountedPrice = Math.round(originalPrice * (1 - rule.reward_value / 100))
              } else {
                discountedPrice = Math.max(0, originalPrice - rule.reward_value)
              }
            }

            rewardProduct = {
              id: product.id,
              title: product.title,
              thumbnail: product.thumbnail,
              variants: (product.variants || []).map((v: any) => ({
                id: v.id,
                title: v.title || "",
                sku: v.sku,
                prices: priceMap.get(v.id) || [],
                inventory_quantity: inventoryMap.get(v.id) || 0,
              })),
            }
          }
        } catch (err) {
          logger.warn(`Failed to retrieve reward product ${rule.reward_product_id}: ${err}`)
        }
      }

      eligibleOffers.push({
        rule_id: rule.id,
        name: rule.name,
        description: rule.rule_description,
        trigger_type: rule.trigger_type,
        trigger_cart_value: rule.trigger_cart_value || null,
        trigger_product_id: rule.trigger_product_id || null,
        trigger_met: triggerMet,
        reward_product_id: rule.reward_product_id,
        reward_product: rewardProduct,
        reward_type: rule.reward_type,
        reward_value: rule.reward_value,
        original_price: originalPrice,
        discounted_price: discountedPrice,
        already_applied: appliedPWPRuleIds.has(rule.id),
        is_out_of_stock: isOutOfStock,
        total_inventory: totalInventory,
      })
    }

    // Sort: eligible first, then by discount value
    eligibleOffers.sort((a, b) => {
      if (a.trigger_met && !b.trigger_met) return -1
      if (!a.trigger_met && b.trigger_met) return 1
      return (b.original_price || 0) - (b.discounted_price || 0) - ((a.original_price || 0) - (a.discounted_price || 0))
    })

    res.json({
      success: true,
      cart_value: cartValue,
      currency_code: cart.currency_code || "sgd",
      eligible_offers: eligibleOffers.filter(o => o.trigger_met && !o.already_applied),
      all_offers: eligibleOffers,
    })
  } catch (error) {
    logger.error(`Failed to check PWP eligibility: ${error.message}`)

    if (error instanceof MedusaError) {
      throw error
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Failed to check PWP eligibility: ${error.message}`
    )
  }
}
