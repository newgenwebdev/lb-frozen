import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import type { RemoveCouponRequest } from "../schemas"

/**
 * POST /store/coupons/remove
 * Remove an applied coupon from the cart
 * Removes the line item adjustment and clears metadata
 */
export const POST = async (
  req: MedusaRequest<RemoveCouponRequest>,
  res: MedusaResponse
): Promise<void> => {
  // Use validatedBody if available, fallback to body
  const body = req.validatedBody || req.body
  const { cart_id } = body
  const logger = req.scope.resolve("logger")

  // Basic validation if middleware didn't run
  if (!cart_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Missing required field: cart_id is required"
    )
  }

  try {
    const cartModuleService = req.scope.resolve(Modules.CART)

    // Get the cart with adjustments
    const cart = await cartModuleService.retrieveCart(cart_id, {
      relations: ["items", "items.adjustments"],
    })

    if (!cart) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Cart with id ${cart_id} not found`
      )
    }

    // Check if cart has a coupon applied
    const appliedCode = cart.metadata?.applied_coupon_code
    if (!appliedCode) {
      res.json({
        success: true,
        message: "No coupon applied to this cart",
        cart,
      })
      return
    }

    // Remove the coupon adjustment from all items
    // In Medusa v2, we use setLineItemAdjustments to replace the existing adjustments
    // By excluding the coupon adjustment, it gets removed
    for (const item of cart.items || []) {
      const couponAdjustmentCode = `COUPON_${appliedCode}`
      const hasAdjustment = (item.adjustments || []).some(
        (adj: any) => adj.code === couponAdjustmentCode
      )

      if (hasAdjustment) {
        // Keep only non-coupon adjustments
        const remainingAdjustments = (item.adjustments || [])
          .filter((adj: any) => adj.code !== couponAdjustmentCode)
          .map((adj: any) => ({
            id: adj.id,
            item_id: item.id,
            code: adj.code,
            amount: adj.amount,
            description: adj.description,
            promotion_id: adj.promotion_id || null,
          }))

        await cartModuleService.setLineItemAdjustments(cart_id, remainingAdjustments)
      }
    }

    // Clear coupon metadata by setting values to null
    // Using null instead of delete to ensure proper clearing in database
    const metadata = { ...cart.metadata }
    metadata.applied_coupon_code = null
    metadata.applied_coupon_id = null
    metadata.applied_coupon_name = null
    metadata.applied_coupon_type = null
    metadata.applied_coupon_value = null
    metadata.applied_coupon_discount = null
    metadata.applied_coupon_currency = null

    await cartModuleService.updateCarts(cart_id, {
      metadata,
    })

    // Retrieve updated cart
    const updatedCart = await cartModuleService.retrieveCart(cart_id, {
      relations: ["items", "items.adjustments"],
    })

    logger.info(`Removed coupon ${appliedCode} from cart ${cart_id}`)

    res.json({
      success: true,
      message: `Coupon "${appliedCode}" has been removed`,
      removed_code: appliedCode,
      cart: updatedCart,
    })
  } catch (error) {
    logger.error(`Failed to remove coupon: ${error.message}`)

    if (error instanceof MedusaError) {
      throw error
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Failed to remove coupon: ${error.message}`
    )
  }
}
