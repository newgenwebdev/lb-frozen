import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import type { RemoveMembershipPromoRequest } from "../schemas"

/**
 * POST /store/membership-promo/remove
 * Remove an applied membership promo from the cart
 */
export const POST = async (
  req: MedusaRequest<RemoveMembershipPromoRequest>,
  res: MedusaResponse
): Promise<void> => {
  const body = req.validatedBody || req.body
  const { cart_id } = body
  const logger = req.scope.resolve("logger")

  if (!cart_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Missing required field: cart_id"
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

    // Check if cart has a membership promo applied
    const appliedPromoId = cart.metadata?.applied_membership_promo_id
    if (!appliedPromoId) {
      res.json({
        success: true,
        message: "No membership promo applied to this cart",
        cart,
      })
      return
    }

    const appliedPromoName = cart.metadata?.applied_membership_promo_name

    // Remove the membership promo adjustment from all items
    for (const item of cart.items || []) {
      const promoAdjustmentCode = `MEMBERSHIP_PROMO_${appliedPromoId}`
      const hasAdjustment = (item.adjustments || []).some(
        (adj: any) => adj.code === promoAdjustmentCode
      )

      if (hasAdjustment) {
        // Keep only non-promo adjustments
        const remainingAdjustments = (item.adjustments || [])
          .filter((adj: any) => adj.code !== promoAdjustmentCode)
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

    // Clear membership promo metadata
    const metadata = { ...cart.metadata }
    metadata.applied_membership_promo_id = null
    metadata.applied_membership_promo_name = null
    metadata.applied_membership_promo_type = null
    metadata.applied_membership_promo_value = null
    metadata.applied_membership_promo_discount = null

    await cartModuleService.updateCarts(cart_id, {
      metadata,
    })

    // Retrieve updated cart
    const updatedCart = await cartModuleService.retrieveCart(cart_id, {
      relations: ["items", "items.adjustments"],
    })

    logger.info(`Removed membership promo ${appliedPromoName} from cart ${cart_id}`)

    res.json({
      success: true,
      message: `Membership promo "${appliedPromoName}" has been removed`,
      removed_promo_id: appliedPromoId,
      removed_promo_name: appliedPromoName,
      cart: updatedCart,
    })
  } catch (error) {
    logger.error(`Failed to remove membership promo: ${error.message}`)

    if (error instanceof MedusaError) {
      throw error
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Failed to remove membership promo: ${error.message}`
    )
  }
}
