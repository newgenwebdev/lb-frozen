import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { PROMO_MODULE } from "../../../../modules/promo"
import type { ApplyCouponRequest } from "../schemas"

/**
 * POST /store/coupons/apply
 * Apply a validated coupon to the cart
 * Uses line item adjustments to apply the discount
 */
export const POST = async (
  req: MedusaRequest<ApplyCouponRequest>,
  res: MedusaResponse
): Promise<void> => {
  // Use validatedBody if available, fallback to body
  const body = req.validatedBody || req.body
  const { code, cart_id } = body
  const logger = req.scope.resolve("logger")

  // Basic validation if middleware didn't run
  if (!code || !cart_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Missing required fields: code and cart_id are required"
    )
  }

  try {
    const promoService = req.scope.resolve(PROMO_MODULE) as any
    const cartModuleService = req.scope.resolve(Modules.CART)

    // Get the cart
    const cart = await cartModuleService.retrieveCart(cart_id, {
      relations: ["items", "items.adjustments"],
    })

    if (!cart) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Cart with id ${cart_id} not found`
      )
    }

    // Check if cart already has a coupon applied
    if (cart.metadata?.applied_coupon_code) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cart already has coupon "${cart.metadata.applied_coupon_code}" applied. Remove it first to apply a new one.`
      )
    }

    // Check if cart has items
    if (!cart.items || cart.items.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Cannot apply coupon to empty cart"
      )
    }

    // Find coupon by code
    const coupons = await promoService.listCoupons({ code }, {})
    const coupon = coupons[0]

    if (!coupon) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Invalid coupon code")
    }

    // Check if coupon is active
    if (coupon.status !== "active") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "This coupon is no longer active"
      )
    }

    // Check date range
    const now = new Date()
    if (coupon.starts_at && new Date(coupon.starts_at) > now) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "This coupon is not yet active"
      )
    }

    if (coupon.ends_at && new Date(coupon.ends_at) < now) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "This coupon has expired"
      )
    }

    // Check usage limit
    if (
      coupon.usage_limit !== null &&
      coupon.usage_count >= coupon.usage_limit
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "This coupon has reached its usage limit"
      )
    }

    // Calculate cart subtotal from items (in cents)
    // cart.subtotal might not be populated, so calculate from items
    logger.info(`Cart items for subtotal calculation:`)
    cart.items.forEach((item: any, index: number) => {
      logger.info(`  Item ${index}: unit_price=${item.unit_price}, quantity=${item.quantity}, total=${Number(item.unit_price) * item.quantity}`)
    })

    const cartSubtotal = cart.items.reduce((sum: number, item: any) => {
      return sum + (Number(item.unit_price) * item.quantity)
    }, 0)

    logger.info(`Cart subtotal calculated: ${cartSubtotal} cents (cart.subtotal was: ${cart.subtotal})`)

    // Calculate discount
    let discountAmount: number

    if (coupon.type === "percentage") {
      discountAmount = Math.round((cartSubtotal * coupon.value) / 100)
    } else {
      // Fixed amount in cents
      discountAmount = coupon.value
    }

    // Ensure discount doesn't exceed cart subtotal
    discountAmount = Math.min(discountAmount, cartSubtotal)

    logger.info(`Discount amount: ${discountAmount} cents (${coupon.type} - ${coupon.value})`)

    // Apply adjustment to cart (apply to first item for simplicity)
    // Note: In Medusa v2, adjustment amounts should be positive - they represent the discount value
    // Medusa handles the subtraction from the total internally
    await cartModuleService.addLineItemAdjustments([
      {
        item_id: cart.items[0].id,
        code: `COUPON_${code}`,
        amount: discountAmount, // Positive value - Medusa subtracts this from total
        description: `Coupon: ${code} (${coupon.name})`,
        promotion_id: null,
      },
    ])

    // Store coupon info in cart metadata
    // Note: Usage count is incremented in order-placed subscriber when order is completed
    await cartModuleService.updateCarts(cart_id, {
      metadata: {
        ...cart.metadata,
        applied_coupon_code: code,
        applied_coupon_id: coupon.id,
        applied_coupon_name: coupon.name,
        applied_coupon_type: coupon.type,
        applied_coupon_value: coupon.value,
        applied_coupon_discount: discountAmount,
        applied_coupon_currency: coupon.currency_code,
      },
    })

    // Retrieve updated cart
    const updatedCart = await cartModuleService.retrieveCart(cart_id, {
      relations: ["items", "items.adjustments"],
    })

    logger.info(
      `Applied coupon ${code} to cart ${cart_id} - discount: ${discountAmount} cents`
    )

    // Debug: Log the metadata that was stored
    logger.info(`Cart ${cart_id} metadata after applying coupon: ${JSON.stringify(updatedCart.metadata)}`)
    logger.info(`Cart ${cart_id} items adjustments: ${JSON.stringify(updatedCart.items?.map(i => ({ id: i.id, adjustments: (i as any).adjustments })))}`)

    res.json({
      success: true,
      cart: updatedCart,
      applied_coupon: {
        code: code,
        name: coupon.name,
        type: coupon.type,
        value: coupon.value,
        discount_amount: discountAmount,
        discount_formatted:
          coupon.type === "percentage"
            ? `${coupon.value}%`
            : `${coupon.currency_code} ${(discountAmount / 100).toFixed(2)}`,
        currency_code: coupon.currency_code,
      },
    })
  } catch (error) {
    logger.error(`Failed to apply coupon: ${error.message}`)

    if (error instanceof MedusaError) {
      throw error
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Failed to apply coupon: ${error.message}`
    )
  }
}
