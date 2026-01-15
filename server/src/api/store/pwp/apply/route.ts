import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { PROMO_MODULE } from "../../../../modules/promo"
import type PromoModuleService from "../../../../modules/promo/services/promo"
import type { ApplyPWPRequest } from "../schemas"

/**
 * Helper function to get available inventory for a specific variant
 * Returns the available quantity (stocked - reserved)
 */
async function getVariantAvailableInventory(
  query: any,
  variantId: string
): Promise<number> {
  try {
    // Get inventory item link for variant
    const { data: inventoryLinks } = await query.graph({
      entity: "product_variant_inventory_item",
      fields: ["variant_id", "inventory_item_id"],
      filters: {
        variant_id: variantId,
      },
    })

    if (inventoryLinks.length === 0) {
      // No inventory tracking for this variant - assume available
      return Infinity
    }

    const inventoryItemId = inventoryLinks[0].inventory_item_id
    if (!inventoryItemId) {
      return Infinity
    }

    // Get inventory levels
    const { data: inventoryLevels } = await query.graph({
      entity: "inventory_level",
      fields: ["inventory_item_id", "stocked_quantity", "reserved_quantity"],
      filters: {
        inventory_item_id: inventoryItemId,
      },
    })

    // Sum available quantity across all locations
    let totalAvailable = 0
    for (const level of inventoryLevels) {
      const stocked = Number(level.stocked_quantity) || 0
      const reserved = Number(level.reserved_quantity) || 0
      totalAvailable += stocked - reserved
    }

    return totalAvailable
  } catch {
    // Inventory lookup failed - assume available to not block checkout
    return Infinity
  }
}

/**
 * POST /store/pwp/apply
 * Apply a PWP offer to cart - adds the reward product at discounted price
 */
export const POST = async (
  req: MedusaRequest<ApplyPWPRequest>,
  res: MedusaResponse
): Promise<void> => {
  const body = req.validatedBody || req.body
  const { cart_id, pwp_rule_id, variant_id } = body
  const logger = req.scope.resolve("logger")

  if (!cart_id || !pwp_rule_id || !variant_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Missing required fields: cart_id, pwp_rule_id, and variant_id are required"
    )
  }

  try {
    const cartModuleService = req.scope.resolve(Modules.CART)
    const productModuleService = req.scope.resolve(Modules.PRODUCT)
    const pricingModule = req.scope.resolve(Modules.PRICING)
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const promoService = req.scope.resolve<PromoModuleService>(PROMO_MODULE)

    // Get cart
    const cart = await cartModuleService.retrieveCart(cart_id, {
      relations: ["items"],
    })

    if (!cart) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Cart with id ${cart_id} not found`
      )
    }

    // Get PWP rule
    const rule = await promoService.retrievePWPRule(pwp_rule_id)

    if (!rule) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `PWP rule with id ${pwp_rule_id} not found`
      )
    }

    // Check rule is active
    if (rule.status !== "active") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "This PWP offer is no longer active"
      )
    }

    // Check date validity
    const now = new Date()
    if (rule.starts_at && new Date(rule.starts_at) > now) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "This PWP offer has not started yet"
      )
    }
    if (rule.ends_at && new Date(rule.ends_at) < now) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "This PWP offer has expired"
      )
    }

    // Check usage limit
    if (rule.usage_limit && rule.redemption_count >= rule.usage_limit) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "This PWP offer has reached its usage limit"
      )
    }

    // Check if this PWP is already applied to cart
    const existingPWPItem = (cart.items || []).find(
      (item) => item.metadata?.is_pwp_item && item.metadata?.pwp_rule_id === pwp_rule_id
    )
    if (existingPWPItem) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "This PWP offer is already applied to your cart"
      )
    }

    // Check trigger condition
    const cartValue = (cart.items || []).reduce((sum, item) => {
      // Exclude other PWP items from cart value calculation
      if (item.metadata?.is_pwp_item) return sum
      const unitPrice = Number(item.unit_price) || 0
      const qty = Number(item.quantity) || 0
      return sum + (unitPrice * qty)
    }, 0)

    let triggerMet = false
    if (rule.trigger_type === "cart_value") {
      triggerMet = rule.trigger_cart_value ? cartValue >= rule.trigger_cart_value : false
    } else if (rule.trigger_type === "product") {
      // Check if trigger product is in cart
      for (const item of cart.items || []) {
        if (item.variant_id) {
          try {
            const variant = await productModuleService.retrieveProductVariant(item.variant_id, {
              select: ["product_id"],
            })
            if (variant?.product_id === rule.trigger_product_id) {
              triggerMet = true
              break
            }
          } catch {
            // Continue checking
          }
        }
      }
    }

    if (!triggerMet) {
      if (rule.trigger_type === "cart_value") {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Cart value must be at least ${((rule.trigger_cart_value || 0) / 100).toFixed(2)} to qualify for this offer`
        )
      } else {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "You must have the trigger product in your cart to qualify for this offer"
        )
      }
    }

    // Verify variant belongs to reward product
    const variant = await productModuleService.retrieveProductVariant(variant_id, {
      select: ["id", "product_id", "title", "sku"],
    })

    if (!variant) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Variant with id ${variant_id} not found`
      )
    }

    if (variant.product_id !== rule.reward_product_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Selected variant does not belong to the reward product"
      )
    }

    // Check variant inventory before adding to cart
    const availableInventory = await getVariantAvailableInventory(query, variant_id)
    if (availableInventory <= 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Sorry, this PWP item is currently out of stock"
      )
    }

    // Get variant price via price set link (Medusa v2 pattern)
    let originalPrice: number | null = null

    try {
      // Get variant price set via link
      const { data: variantPriceSets } = await query.graph({
        entity: "product_variant_price_set",
        fields: ["variant_id", "price_set_id"],
        filters: {
          variant_id: variant_id,
        },
      })

      if (variantPriceSets.length > 0 && variantPriceSets[0].price_set_id) {
        const prices = await pricingModule.listPrices(
          { price_set_id: [variantPriceSets[0].price_set_id] },
          { select: ["amount", "currency_code"] }
        )

        const price = prices.find(
          (p: any) => p.currency_code === (cart.currency_code || "myr")
        ) || prices[0]

        if (price) {
          originalPrice = Number(price.amount)
        }
      }
    } catch (priceErr) {
      logger.warn(`Failed to fetch price for variant ${variant_id}: ${priceErr}`)
    }

    if (!originalPrice) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "No price found for the selected variant"
      )
    }

    // Calculate discount amount
    let discountAmount: number
    if (rule.reward_type === "percentage") {
      discountAmount = Math.round(originalPrice * (rule.reward_value / 100))
    } else {
      discountAmount = Math.min(rule.reward_value, originalPrice)
    }
    const discountedPrice = originalPrice - discountAmount

    // Get product info for the line item title
    const product = await productModuleService.retrieveProduct(rule.reward_product_id!, {
      select: ["id", "title", "thumbnail"],
    })

    // Add line item to cart at ORIGINAL price with PWP metadata
    // The discount will be applied via line item adjustment
    // Store trigger requirements in metadata for validation on cart update
    const lineItems = await cartModuleService.addLineItems(cart_id, [
      {
        title: product?.title || "PWP Item",
        variant_id: variant_id,
        quantity: 1,
        unit_price: originalPrice, // Use original price - discount via adjustment
        thumbnail: product?.thumbnail || undefined,
        metadata: {
          is_pwp_item: true,
          pwp_rule_id: rule.id,
          pwp_rule_name: rule.name,
          pwp_original_price: originalPrice,
          pwp_discount_amount: discountAmount,
          pwp_discount_type: rule.reward_type,
          pwp_discount_value: rule.reward_value,
          // Store trigger requirements for cart validation
          pwp_trigger_type: rule.trigger_type,
          pwp_trigger_cart_value: rule.trigger_type === "cart_value" ? rule.trigger_cart_value : null,
          pwp_trigger_product_id: rule.trigger_type === "product" ? rule.trigger_product_id : null,
        },
      },
    ])

    const lineItemId = lineItems[0]?.id
    if (!lineItemId) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Failed to add PWP item to cart"
      )
    }

    // Apply discount via line item adjustment (this persists across cart operations)
    await cartModuleService.addLineItemAdjustments([
      {
        item_id: lineItemId,
        code: `PWP_${rule.id}`,
        amount: discountAmount, // Positive value - Medusa subtracts this from total
        description: `PWP: ${rule.name}`,
        promotion_id: null,
      },
    ])

    // Get updated cart
    const updatedCart = await cartModuleService.retrieveCart(cart_id, {
      relations: ["items", "items.adjustments"],
    })

    logger.info(`Applied PWP rule ${rule.id} (${rule.name}) to cart ${cart_id} - discount: ${discountAmount} cents`)

    res.json({
      success: true,
      message: `PWP offer "${rule.name}" applied successfully`,
      pwp_item: {
        line_item_id: lineItemId,
        variant_id: variant_id,
        original_price: originalPrice,
        discounted_price: discountedPrice,
        discount_amount: discountAmount,
        rule_name: rule.name,
      },
      cart: updatedCart,
    })
  } catch (error) {
    logger.error(`Failed to apply PWP: ${error.message}`)

    if (error instanceof MedusaError) {
      throw error
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Failed to apply PWP: ${error.message}`
    )
  }
}
