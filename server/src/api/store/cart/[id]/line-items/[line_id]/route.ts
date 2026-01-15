import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { getApplicableBulkTier, getBasePrice } from "../../../../../../utils/cart-validation"
import type { IProductModuleService } from "@medusajs/framework/types"

interface UpdateLineItemRequest {
  quantity: number
  metadata?: Record<string, unknown>
}

/**
 * PATCH /store/cart/:id/line-items/:line_id
 * Update a line item quantity with automatic bulk pricing recalculation
 *
 * This endpoint wraps Medusa's cart.updateLineItems to:
 * 1. Recalculate bulk pricing based on new quantity
 * 2. Upgrade/downgrade tier automatically
 * 3. Revert to base price if quantity drops below bulk threshold
 */
export const PATCH = async (
  req: MedusaRequest<UpdateLineItemRequest>,
  res: MedusaResponse
): Promise<void> => {
  const { id: cart_id, line_id } = req.params
  const body = req.validatedBody || req.body
  const { quantity, metadata: userMetadata } = body
  const logger = req.scope.resolve("logger")

  if (!cart_id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Cart ID is required")
  }

  if (!line_id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Line item ID is required")
  }

  if (quantity === undefined || quantity < 0) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "quantity must be 0 or greater")
  }

  try {
    const cartModuleService = req.scope.resolve(Modules.CART)
    const pricingModule = req.scope.resolve(Modules.PRICING)
    const productModuleService = req.scope.resolve(Modules.PRODUCT) as IProductModuleService
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    // Get cart with items
    const cart = await cartModuleService.retrieveCart(cart_id, {
      relations: ["items", "items.adjustments"],
    })

    if (!cart) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Cart with id ${cart_id} not found`)
    }

    // Find the line item
    const lineItem = (cart.items || []).find((item) => item.id === line_id)

    if (!lineItem) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Line item with id ${line_id} not found in cart`
      )
    }

    // If quantity is 0, delete the item
    if (quantity === 0) {
      await cartModuleService.deleteLineItems([line_id])

      const updatedCart = await cartModuleService.retrieveCart(cart_id, {
        relations: ["items", "items.adjustments"],
      })

      res.json({
        success: true,
        message: "Line item removed",
        cart: updatedCart,
      })
      return
    }

    // Don't recalculate pricing for PWP items - they have fixed discount
    if (lineItem.metadata?.is_pwp_item) {
      await cartModuleService.updateLineItems([
        {
          id: line_id,
          quantity: quantity,
          metadata: {
            ...lineItem.metadata,
            ...userMetadata,
          },
        },
      ])

      const updatedCart = await cartModuleService.retrieveCart(cart_id, {
        relations: ["items", "items.adjustments"],
      })

      res.json({
        success: true,
        cart: updatedCart,
      })
      return
    }

    // Recalculate bulk pricing and variant discounts for regular items
    let unitPrice: number = Number(lineItem.unit_price)
    let isBulkPrice = false
    let bulkMinQuantity: number | undefined
    let isVariantDiscount = false
    let variantDiscountAmount = 0
    let variantDiscountType: string | undefined
    let originalUnitPrice = lineItem.metadata?.original_unit_price as number | undefined

    if (lineItem.variant_id) {
      try {
        const { data: variantPriceSets } = await query.graph({
          entity: "product_variant_price_set",
          fields: ["variant_id", "price_set_id"],
          filters: { variant_id: lineItem.variant_id },
        })

        if (variantPriceSets.length > 0 && variantPriceSets[0].price_set_id) {
          const prices = await pricingModule.listPrices(
            { price_set_id: [variantPriceSets[0].price_set_id] },
            { select: ["amount", "currency_code", "min_quantity", "max_quantity"] }
          )

          const currencyCode = cart.currency_code || "myr"

          // Get base price and update originalUnitPrice if not set
          const basePriceValue = getBasePrice(prices as any, currencyCode)
          if (basePriceValue !== null && !originalUnitPrice) {
            originalUnitPrice = basePriceValue
          }

          // Check for applicable bulk tier
          const applicableTier = getApplicableBulkTier(quantity, prices as any, currencyCode)

          if (applicableTier) {
            // Wholesale tier takes priority over variant discount
            unitPrice = applicableTier.amount
            isBulkPrice = true
            bulkMinQuantity = applicableTier.min_quantity
            logger.info(
              `[UPDATE-LINE-ITEM] Bulk pricing for item ${line_id}: ` +
              `qty ${quantity} -> tier min ${applicableTier.min_quantity} @ ${applicableTier.amount}`
            )
          } else if (basePriceValue !== null) {
            unitPrice = basePriceValue

            // No bulk tier applies - check for variant metadata discount
            const variant = await productModuleService.retrieveProductVariant(lineItem.variant_id, {
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
                  `[UPDATE-LINE-ITEM] Variant discount for item ${line_id}: ` +
                  `${discountType} ${discountValue} -> price ${basePriceValue} → ${discountedPrice}`
                )
              }
            }
          }
        }
      } catch (err) {
        logger.warn(`[UPDATE-LINE-ITEM] Failed to recalculate pricing for item ${line_id}: ${err}`)
      }
    }

    // Build updated metadata
    const updatedMetadata: Record<string, unknown> = {
      ...lineItem.metadata,
      ...userMetadata,
      original_unit_price: originalUnitPrice,
    }

    // Clear old pricing flags
    delete updatedMetadata.is_bulk_price
    delete updatedMetadata.bulk_min_quantity
    delete updatedMetadata.bulk_tier_price
    delete updatedMetadata.is_variant_discount
    delete updatedMetadata.variant_discount_amount
    delete updatedMetadata.variant_discount_type

    if (isBulkPrice) {
      updatedMetadata.is_bulk_price = true
      updatedMetadata.bulk_min_quantity = bulkMinQuantity
      updatedMetadata.bulk_tier_price = unitPrice
    } else if (isVariantDiscount) {
      updatedMetadata.is_variant_discount = true
      updatedMetadata.variant_discount_amount = variantDiscountAmount
      updatedMetadata.variant_discount_type = variantDiscountType
    }

    // Update the line item
    await cartModuleService.updateLineItems([
      {
        id: line_id,
        quantity: quantity,
        unit_price: unitPrice,
        metadata: updatedMetadata,
      },
    ])

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
            savings: originalUnitPrice && unitPrice ? Number(originalUnitPrice) - unitPrice : 0,
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
      price_changed: unitPrice !== Number(lineItem.unit_price),
      old_price: lineItem.unit_price,
      new_price: unitPrice,
    })
  } catch (error) {
    logger.error(`[UPDATE-LINE-ITEM] Failed to update line item: ${error.message}`)

    if (error instanceof MedusaError) {
      throw error
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Failed to update line item: ${error.message}`
    )
  }
}

/**
 * DELETE /store/cart/:id/line-items/:line_id
 * Delete a line item from cart
 */
export const DELETE = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const { id: cart_id, line_id } = req.params
  const logger = req.scope.resolve("logger")

  if (!cart_id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Cart ID is required")
  }

  if (!line_id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Line item ID is required")
  }

  try {
    const cartModuleService = req.scope.resolve(Modules.CART)

    // Get cart to verify item exists
    const cart = await cartModuleService.retrieveCart(cart_id, {
      relations: ["items"],
    })

    if (!cart) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Cart with id ${cart_id} not found`)
    }

    const lineItem = (cart.items || []).find((item) => item.id === line_id)

    if (!lineItem) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Line item with id ${line_id} not found in cart`
      )
    }

    // Delete the line item
    await cartModuleService.deleteLineItems([line_id])

    logger.info(`[DELETE-LINE-ITEM] Removed item ${line_id} from cart ${cart_id}`)

    // Get updated cart
    const updatedCart = await cartModuleService.retrieveCart(cart_id, {
      relations: ["items", "items.adjustments"],
    })

    res.json({
      success: true,
      message: "Line item removed",
      removed_item_id: line_id,
      cart: updatedCart,
    })
  } catch (error) {
    logger.error(`[DELETE-LINE-ITEM] Failed to delete line item: ${error.message}`)

    if (error instanceof MedusaError) {
      throw error
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Failed to delete line item: ${error.message}`
    )
  }
}
