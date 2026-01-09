import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { getApplicableBulkTier, getBasePrice } from "../../../../../utils/cart-validation"

interface AddLineItemRequest {
  variant_id: string
  quantity: number
  metadata?: Record<string, unknown>
}

interface UpdateLineItemRequest {
  quantity: number
  metadata?: Record<string, unknown>
}

/**
 * POST /store/cart/:id/line-items
 * Add a line item to cart with automatic bulk pricing detection
 *
 * This endpoint wraps Medusa's cart.addLineItems to:
 * 1. Check if variant has bulk pricing tiers
 * 2. Apply the correct tier price based on quantity
 * 3. Store bulk pricing metadata for cart validation
 */
export const POST = async (
  req: MedusaRequest<AddLineItemRequest>,
  res: MedusaResponse
): Promise<void> => {
  const { id: cart_id } = req.params
  const body = req.validatedBody || req.body
  const { variant_id, quantity, metadata: userMetadata } = body
  const logger = req.scope.resolve("logger")

  if (!cart_id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Cart ID is required")
  }

  if (!variant_id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "variant_id is required")
  }

  if (!quantity || quantity < 1) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "quantity must be at least 1")
  }

  try {
    const cartModuleService = req.scope.resolve(Modules.CART)
    const productModuleService = req.scope.resolve(Modules.PRODUCT)
    const pricingModule = req.scope.resolve(Modules.PRICING)
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    // Get cart
    const cart = await cartModuleService.retrieveCart(cart_id, {
      relations: ["items"],
    })

    if (!cart) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Cart with id ${cart_id} not found`)
    }

    // Get variant with product info, metadata, and options for variant title
    const variant = await productModuleService.retrieveProductVariant(variant_id, {
      relations: ["product", "options", "options.option"],
      select: ["id", "title", "sku", "product_id", "metadata"],
    })

    if (!variant) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Variant with id ${variant_id} not found`)
    }

    // Check if this variant already exists in cart
    const existingItem = (cart.items || []).find(
      (item) => item.variant_id === variant_id && !item.metadata?.is_pwp_item
    )

    // Calculate total quantity (existing + new)
    const totalQuantity = existingItem
      ? Number(existingItem.quantity || 0) + quantity
      : quantity

    // Get variant price tiers
    let unitPrice: number | null = null
    let isBulkPrice = false
    let bulkMinQuantity: number | undefined
    let originalUnitPrice: number | null = null
    let isVariantDiscount = false
    let variantDiscountAmount = 0
    let variantDiscountType: string | undefined

    try {
      const { data: variantPriceSets } = await query.graph({
        entity: "product_variant_price_set",
        fields: ["variant_id", "price_set_id"],
        filters: { variant_id: variant_id },
      })

      if (variantPriceSets.length > 0 && variantPriceSets[0].price_set_id) {
        const prices = await pricingModule.listPrices(
          { price_set_id: [variantPriceSets[0].price_set_id] },
          { select: ["amount", "currency_code", "min_quantity", "max_quantity"] }
        )

        const currencyCode = cart.currency_code || "sgd"

        // Get base price
        const basePriceValue = getBasePrice(prices as any, currencyCode)
        originalUnitPrice = basePriceValue

        // Check for applicable bulk tier
        const applicableTier = getApplicableBulkTier(totalQuantity, prices as any, currencyCode)

        if (applicableTier) {
          // Wholesale tier takes priority over variant discount
          unitPrice = applicableTier.amount
          isBulkPrice = true
          bulkMinQuantity = applicableTier.min_quantity
          logger.info(
            `[ADD-LINE-ITEM] Bulk pricing applied for variant ${variant_id}: ` +
            `qty ${totalQuantity} -> tier min ${applicableTier.min_quantity} @ ${applicableTier.amount}`
          )
        } else if (basePriceValue !== null) {
          unitPrice = basePriceValue

          // No bulk tier applies - check for variant metadata discount
          const variantMetadata = (variant as any).metadata || {}
          const discountValue = Number(variantMetadata.discount) || 0
          const discountType = variantMetadata.discount_type as string | undefined

          if (discountValue > 0 && discountType) {
            let discountedPrice: number

            if (discountType === "percentage") {
              // Percentage discount (e.g., 15 means 15% off)
              const discountPercent = Math.min(discountValue, 100) // Cap at 100%
              discountedPrice = Math.round(basePriceValue * (1 - discountPercent / 100))
            } else {
              // Fixed discount (value is in cents)
              discountedPrice = Math.max(0, basePriceValue - discountValue)
            }

            if (discountedPrice < basePriceValue) {
              unitPrice = discountedPrice
              isVariantDiscount = true
              variantDiscountAmount = basePriceValue - discountedPrice
              variantDiscountType = discountType
              logger.info(
                `[ADD-LINE-ITEM] Variant discount applied for ${variant_id}: ` +
                `${discountType} ${discountValue} -> price ${basePriceValue} → ${discountedPrice}`
              )
            }
          }
        }
      }
    } catch (err) {
      logger.warn(`[ADD-LINE-ITEM] Failed to fetch pricing for variant ${variant_id}: ${err}`)
    }

    // Fallback: Use variant's calculated price if available
    if (unitPrice === null) {
      // This is a fallback - ideally we should always have pricing
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `No price found for variant ${variant_id}`
      )
    }

    // Build metadata
    const itemMetadata: Record<string, unknown> = {
      ...userMetadata,
    }

    if (isBulkPrice) {
      itemMetadata.is_bulk_price = true
      itemMetadata.bulk_min_quantity = bulkMinQuantity
      itemMetadata.bulk_tier_price = unitPrice
      itemMetadata.original_unit_price = originalUnitPrice
    } else if (isVariantDiscount) {
      itemMetadata.is_variant_discount = true
      itemMetadata.variant_discount_amount = variantDiscountAmount
      itemMetadata.variant_discount_type = variantDiscountType
      itemMetadata.original_unit_price = originalUnitPrice
    } else if (originalUnitPrice !== null) {
      itemMetadata.original_unit_price = originalUnitPrice
    }

    // Get product for title/thumbnail
    const product = (variant as any).product || await productModuleService.retrieveProduct(variant.product_id!, {
      select: ["id", "title", "thumbnail"],
    })

    // Determine variant option label and value - skip if "Default" or "-"
    // Priority: variant.options (most reliable) > variant.title
    let variantOptionLabel: string | null = null // e.g., "Size", "Type", "Color"
    let variantOptionValue: string | null = null // e.g., "100ml", "Water", "Red"

    // Check variant options first (e.g., Size: "250ml", Type: "Water")
    const variantOptions = (variant as any).options as Array<{ value?: string; option?: { title?: string } }> | undefined
    if (variantOptions && variantOptions.length > 0) {
      // Use first non-default option
      for (const opt of variantOptions) {
        if (opt?.value && opt.value.toLowerCase() !== "default" && opt.value !== "-") {
          variantOptionLabel = opt.option?.title || null
          variantOptionValue = opt.value
          break
        }
      }
    }

    // Fallback to variant.title if no option found (label will be null)
    if (!variantOptionValue && variant.title && variant.title.toLowerCase() !== "default" && variant.title !== "-") {
      variantOptionValue = variant.title
    }

    // Format subtitle: "Label: Value" if label exists, otherwise just "Value"
    const variantSubtitle = variantOptionValue
      ? (variantOptionLabel ? `${variantOptionLabel}: ${variantOptionValue}` : variantOptionValue)
      : null

    logger.info(`[ADD-LINE-ITEM] Variant ${variant_id} title: "${variant.title}", options: ${JSON.stringify(variantOptions?.map(o => ({ label: o.option?.title, value: o.value })))}, resolved subtitle: "${variantSubtitle}")`)

    if (existingItem) {
      // Update existing item with new quantity and possibly new bulk price
      await cartModuleService.updateLineItems([
        {
          id: existingItem.id,
          quantity: totalQuantity,
          unit_price: unitPrice,
          metadata: {
            ...existingItem.metadata,
            ...itemMetadata,
          },
        },
      ])
      logger.info(`[ADD-LINE-ITEM] Updated existing item ${existingItem.id} in cart ${cart_id}: qty ${totalQuantity}`)
    } else {
      // Add new line item with variant subtitle (e.g., "Material: Water", "Size: 100ml")
      await cartModuleService.addLineItems(cart_id, [
        {
          title: product?.title || variant.title || "Product",
          subtitle: variantSubtitle, // e.g., "Material: Water", "Size: 100ml"
          variant_id: variant_id,
          quantity: quantity,
          unit_price: unitPrice,
          thumbnail: product?.thumbnail || undefined,
          metadata: itemMetadata,
        },
      ])
      logger.info(`[ADD-LINE-ITEM] Added new item to cart ${cart_id}: variant ${variant_id}, qty ${quantity}, subtitle: ${variantSubtitle}`)
    }

    // Get updated cart
    const updatedCart = await cartModuleService.retrieveCart(cart_id, {
      relations: ["items", "items.adjustments"],
    })

    res.json({
      success: true,
      cart: updatedCart,
      bulk_pricing_applied: isBulkPrice,
      bulk_tier: isBulkPrice
        ? {
            min_quantity: bulkMinQuantity,
            unit_price: unitPrice,
            original_price: originalUnitPrice,
            savings: originalUnitPrice ? originalUnitPrice - unitPrice : 0,
          }
        : null,
      variant_discount_applied: isVariantDiscount,
      variant_discount: isVariantDiscount
        ? {
            discount_type: variantDiscountType,
            discount_amount: variantDiscountAmount,
            unit_price: unitPrice,
            original_price: originalUnitPrice,
          }
        : null,
    })
  } catch (error) {
    logger.error(`[ADD-LINE-ITEM] Failed to add line item: ${error.message}`)

    if (error instanceof MedusaError) {
      throw error
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Failed to add line item: ${error.message}`
    )
  }
}
