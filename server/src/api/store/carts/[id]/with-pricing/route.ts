import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { PROMO_MODULE } from "../../../../../modules/promo"

/**
 * GET /store/carts/:id/with-pricing
 *
 * Returns cart with all pricing information needed for frontend validation:
 * - Cart items with current prices
 * - Bulk pricing tiers for each variant
 * - Eligible PWP offers with requirements
 *
 * Frontend can use this data to:
 * - Show correct price based on quantity (no server call needed)
 * - Show/hide PWP offers based on cart value
 * - Validate before checkout
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  const { id: cart_id } = req.params
  const logger = req.scope.resolve("logger")

  if (!cart_id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Cart ID is required")
  }

  try {
    const cartModuleService = req.scope.resolve(Modules.CART)
    const pricingModule = req.scope.resolve(Modules.PRICING)
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const promoService = req.scope.resolve(PROMO_MODULE) as any

    // Get cart with items
    const cart = await cartModuleService.retrieveCart(cart_id, {
      relations: ["items", "items.adjustments"],
    })

    if (!cart) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Cart with id ${cart_id} not found`)
    }

    const items = cart.items || []
    const currencyCode = cart.currency_code || "myr"

    // ========================================
    // 1. Get bulk pricing tiers for all variants
    // ========================================
    const variantIds = items
      .filter((item) => item.variant_id && !item.metadata?.is_pwp_item)
      .map((item) => item.variant_id as string)

    const bulkPricingMap: Record<string, {
      base_price: number
      tiers: Array<{
        min_quantity: number
        max_quantity: number | null
        amount: number
        savings_percent: number
      }>
    }> = {}

    if (variantIds.length > 0) {
      try {
        // Get price sets for variants
        const { data: variantPriceSets } = await query.graph({
          entity: "product_variant_price_set",
          fields: ["variant_id", "price_set_id"],
          filters: { variant_id: variantIds },
        })

        const priceSetIds = variantPriceSets
          .map((vps: any) => vps.price_set_id)
          .filter(Boolean)

        if (priceSetIds.length > 0) {
          const allPrices = await pricingModule.listPrices(
            { price_set_id: priceSetIds },
            { select: ["amount", "currency_code", "price_set_id", "min_quantity", "max_quantity"] }
          )

          // Group prices by variant
          for (const vps of variantPriceSets) {
            const variantPrices = allPrices.filter(
              (p: any) =>
                p.price_set_id === vps.price_set_id &&
                p.currency_code.toLowerCase() === currencyCode.toLowerCase()
            )

            // Find base price (no min_quantity or min_quantity = 1)
            const basePrice = variantPrices.find(
              (p: any) => !p.min_quantity || p.min_quantity <= 1
            )

            // Find bulk tiers (min_quantity > 1)
            const bulkTiers = variantPrices
              .filter((p: any) => p.min_quantity && p.min_quantity > 1)
              .map((p: any) => ({
                min_quantity: Number(p.min_quantity),
                max_quantity: p.max_quantity ? Number(p.max_quantity) : null,
                amount: Number(p.amount),
                savings_percent: basePrice
                  ? Math.round((1 - Number(p.amount) / Number(basePrice.amount)) * 100)
                  : 0,
              }))
              .sort((a: any, b: any) => a.min_quantity - b.min_quantity)

            if (basePrice || bulkTiers.length > 0) {
              bulkPricingMap[vps.variant_id] = {
                base_price: basePrice ? Number(basePrice.amount) : bulkTiers[0]?.amount || 0,
                tiers: bulkTiers,
              }
            }
          }
        }
      } catch (err) {
        logger.warn(`[CART-WITH-PRICING] Failed to fetch bulk pricing: ${err}`)
      }
    }

    // ========================================
    // 2. Get eligible PWP offers
    // ========================================
    let pwpOffers: Array<{
      id: string
      name: string
      description: string | null
      trigger_type: string
      trigger_cart_value: number | null
      trigger_product_id: string | null
      reward_product_id: string
      reward_type: string
      reward_value: number
      is_eligible: boolean
      current_cart_value: number
      amount_needed: number | null
    }> = []

    try {
      // Calculate cart value excluding PWP items
      const cartValue = items.reduce((sum, item) => {
        if (item.metadata?.is_pwp_item) return sum
        const unitPrice = Number(item.unit_price) || 0
        const qty = Number(item.quantity) || 0
        return sum + unitPrice * qty
      }, 0)

      // Get all active PWP rules
      const allRules = await promoService.listPWPRules(
        { status: "active" },
        { take: 50 }
      )

      const now = new Date()

      for (const rule of allRules) {
        // Check date validity
        if (rule.starts_at && new Date(rule.starts_at) > now) continue
        if (rule.ends_at && new Date(rule.ends_at) < now) continue

        // Check usage limit
        if (rule.usage_limit && rule.redemption_count >= rule.usage_limit) continue

        // Check if already applied
        const alreadyApplied = items.some(
          (item) => item.metadata?.is_pwp_item && item.metadata?.pwp_rule_id === rule.id
        )
        if (alreadyApplied) continue

        let isEligible = false
        let amountNeeded: number | null = null

        if (rule.trigger_type === "cart_value") {
          const minValue = rule.trigger_cart_value || 0
          isEligible = cartValue >= minValue
          amountNeeded = isEligible ? null : minValue - cartValue
        } else if (rule.trigger_type === "product") {
          // Check if trigger product is in cart
          for (const item of items) {
            if (item.metadata?.is_pwp_item) continue
            if (!item.variant_id) continue

            try {
              const { data: variants } = await query.graph({
                entity: "product_variant",
                fields: ["id", "product_id"],
                filters: { id: item.variant_id },
              })
              if (variants[0]?.product_id === rule.trigger_product_id) {
                isEligible = true
                break
              }
            } catch {
              // Continue
            }
          }
        }

        pwpOffers.push({
          id: rule.id,
          name: rule.name,
          description: rule.rule_description,
          trigger_type: rule.trigger_type,
          trigger_cart_value: rule.trigger_cart_value,
          trigger_product_id: rule.trigger_product_id,
          reward_product_id: rule.reward_product_id,
          reward_type: rule.reward_type,
          reward_value: rule.reward_value,
          is_eligible: isEligible,
          current_cart_value: cartValue,
          amount_needed: amountNeeded,
        })
      }
    } catch (err) {
      logger.warn(`[CART-WITH-PRICING] Failed to fetch PWP offers: ${err}`)
    }

    // ========================================
    // 3. Get inventory quantities for all variants
    // ========================================
    const inventoryMap: Record<string, number> = {}

    if (variantIds.length > 0) {
      try {
        const inventoryModule = req.scope.resolve(Modules.INVENTORY)

        // Get inventory items linked to variants
        const { data: variantInventoryLinks } = await query.graph({
          entity: "product_variant_inventory_item",
          fields: ["variant_id", "inventory_item_id"],
          filters: { variant_id: variantIds },
        })

        if (variantInventoryLinks.length > 0) {
          const inventoryItemIds = variantInventoryLinks
            .map((link: any) => link.inventory_item_id)
            .filter(Boolean)

          // Get inventory levels for these items
          const inventoryLevels = await inventoryModule.listInventoryLevels(
            { inventory_item_id: inventoryItemIds },
            { select: ["inventory_item_id", "stocked_quantity", "reserved_quantity"] }
          )

          // Build a map of inventory_item_id -> available quantity
          const inventoryItemAvailable: Record<string, number> = {}
          for (const level of inventoryLevels) {
            const available = (Number(level.stocked_quantity) || 0) - (Number(level.reserved_quantity) || 0)
            // Sum up quantities across all locations for each inventory item
            inventoryItemAvailable[level.inventory_item_id] =
              (inventoryItemAvailable[level.inventory_item_id] || 0) + Math.max(0, available)
          }

          // Map back to variant_id
          for (const link of variantInventoryLinks) {
            if (link.inventory_item_id && inventoryItemAvailable[link.inventory_item_id] !== undefined) {
              inventoryMap[link.variant_id] = inventoryItemAvailable[link.inventory_item_id]
            }
          }
        }
      } catch (err) {
        logger.warn(`[CART-WITH-PRICING] Failed to fetch inventory: ${err}`)
      }
    }

    // ========================================
    // 4. Enhance cart items with pricing info
    // ========================================
    const enhancedItems = items.map((item) => {
      const pricing = item.variant_id ? bulkPricingMap[item.variant_id] : null
      const currentQty = Number(item.quantity) || 0

      // Find applicable tier for current quantity
      let applicableTier = null
      let shouldBeBulkPrice = false

      if (pricing?.tiers) {
        for (const tier of pricing.tiers.slice().reverse()) {
          if (currentQty >= tier.min_quantity) {
            applicableTier = tier
            shouldBeBulkPrice = true
            break
          }
        }
      }

      // Calculate what the price SHOULD be
      const correctPrice = shouldBeBulkPrice && applicableTier
        ? applicableTier.amount
        : pricing?.base_price || Number(item.unit_price)

      const currentPrice = Number(item.unit_price)
      const priceNeedsUpdate = correctPrice !== currentPrice

      // Get inventory quantity for this variant
      const inventoryQuantity = item.variant_id ? inventoryMap[item.variant_id] : undefined

      return {
        ...item,
        inventory_quantity: inventoryQuantity,
        _pricing: {
          base_price: pricing?.base_price || currentPrice,
          bulk_tiers: pricing?.tiers || [],
          current_tier: applicableTier,
          correct_price: correctPrice,
          price_needs_update: priceNeedsUpdate,
          is_bulk_price: shouldBeBulkPrice,
        },
      }
    })

    // ========================================
    // 4. Calculate cart totals
    // ========================================
    const subtotal = enhancedItems.reduce((sum, item) => {
      const price = item._pricing.correct_price
      const qty = Number(item.quantity) || 0
      return sum + price * qty
    }, 0)

    // PWP discount
    const pwpDiscount = enhancedItems.reduce((sum, item) => {
      if (item.metadata?.is_pwp_item && item.metadata?.pwp_discount_amount) {
        return sum + Number(item.metadata.pwp_discount_amount) * (Number(item.quantity) || 1)
      }
      return sum
    }, 0)

    // Adjustment discount (coupons)
    const adjustmentDiscount = enhancedItems.reduce((sum, item) => {
      const itemAdj = (item.adjustments || []).reduce(
        (adjSum: number, adj: any) => adjSum + (Number(adj.amount) || 0),
        0
      )
      return sum + itemAdj
    }, 0)

    // Points discount
    const pointsDiscount = Number(cart.metadata?.points_discount_amount) || 0

    const totalDiscount = pwpDiscount + adjustmentDiscount + pointsDiscount
    const total = Math.max(0, subtotal - totalDiscount)

    res.json({
      cart: {
        ...cart,
        items: enhancedItems,
      },
      pricing: {
        bulk_pricing_map: bulkPricingMap,
        pwp_offers: pwpOffers,
      },
      // Inventory map: variant_id -> available quantity
      inventory: inventoryMap,
      totals: {
        subtotal,
        pwp_discount: pwpDiscount,
        adjustment_discount: adjustmentDiscount,
        points_discount: pointsDiscount,
        total_discount: totalDiscount,
        total,
      },
      // Helper for frontend to know if any prices need syncing
      needs_price_sync: enhancedItems.some((item) => item._pricing.price_needs_update),
    })
  } catch (error) {
    logger.error(`[CART-WITH-PRICING] Failed: ${error}`)

    if (error instanceof MedusaError) {
      throw error
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Failed to get cart with pricing: ${error}`
    )
  }
}
