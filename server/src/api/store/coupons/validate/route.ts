import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { PROMO_MODULE } from "../../../../modules/promo"
import type { ValidateCouponRequest } from "../schemas"

/**
 * POST /store/coupons/validate
 * Validate a coupon code and return discount preview
 * Does NOT apply the coupon - just validates and calculates
 */
export const POST = async (
  req: MedusaRequest<ValidateCouponRequest>,
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
      relations: ["items"],
    })

    if (!cart) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Cart with id ${cart_id} not found`
      )
    }

    // Check if cart already has a coupon applied
    if (cart.metadata?.applied_coupon_code) {
      res.json({
        valid: false,
        message: `Cart already has coupon "${cart.metadata.applied_coupon_code}" applied. Remove it first to apply a new one.`,
      })
      return
    }

    // Find coupon by code
    const coupons = await promoService.listCoupons({ code }, {})
    const coupon = coupons[0]

    if (!coupon) {
      res.json({
        valid: false,
        message: "Invalid coupon code",
      })
      return
    }

    // Check if coupon is active
    if (coupon.status !== "active") {
      res.json({
        valid: false,
        message: "This coupon is no longer active",
      })
      return
    }

    // Check date range
    const now = new Date()
    if (coupon.starts_at && new Date(coupon.starts_at) > now) {
      res.json({
        valid: false,
        message: "This coupon is not yet active",
      })
      return
    }

    if (coupon.ends_at && new Date(coupon.ends_at) < now) {
      res.json({
        valid: false,
        message: "This coupon has expired",
      })
      return
    }

    // Check usage limit
    if (
      coupon.usage_limit !== null &&
      coupon.usage_count >= coupon.usage_limit
    ) {
      res.json({
        valid: false,
        message: "This coupon has reached its usage limit",
      })
      return
    }

    // Calculate cart subtotal from items (in cents)
    // cart.subtotal might not be populated, so calculate from items
    const cartSubtotal = (cart.items || []).reduce((sum: number, item: any) => {
      return sum + (Number(item.unit_price) * item.quantity)
    }, 0)

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

    logger.info(
      `Validated coupon ${code} for cart ${cart_id} - discount: ${discountAmount} cents`
    )

    res.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        type: coupon.type,
        value: coupon.value,
        currency_code: coupon.currency_code,
      },
      discount: {
        amount: discountAmount,
        formatted:
          coupon.type === "percentage"
            ? `${coupon.value}%`
            : `${coupon.currency_code} ${(discountAmount / 100).toFixed(2)}`,
      },
      cart_subtotal: cartSubtotal,
      new_total: cartSubtotal - discountAmount,
    })
  } catch (error) {
    logger.error(`Failed to validate coupon: ${error.message}`)

    if (error instanceof MedusaError) {
      throw error
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Failed to validate coupon: ${error.message}`
    )
  }
}
