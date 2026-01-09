import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { getVerifiedCustomerId } from "../../../../../utils/store-auth"

/**
 * POST /store/cart/:id/remove-points
 * Remove applied points discount from cart
 * Requires authentication
 */
export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const customerId = getVerifiedCustomerId(req)

  if (!customerId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Authentication required"
    )
  }

  const cartId = req.params.id
  const cartModuleService = req.scope.resolve(Modules.CART)
  const logger = req.scope.resolve("logger")

  try {
    // Get cart with items and adjustments
    const cart = await cartModuleService.retrieveCart(cartId, {
      relations: ["items", "items.adjustments"],
    })

    if (!cart) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Cart with id ${cartId} not found`
      )
    }

    // Verify cart belongs to customer
    if (cart.customer_id !== customerId) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Cannot modify another customer's cart"
      )
    }

    // Find and remove POINTS_REDEMPTION adjustments from all items
    // In Medusa v2, we use setLineItemAdjustments to replace the existing adjustments
    // By excluding the points adjustment, it gets removed
    for (const item of cart.items || []) {
      const hasPointsAdjustment = (item as any).adjustments?.some(
        (adj: any) => adj.code === "POINTS_REDEMPTION"
      )

      if (hasPointsAdjustment) {
        // Keep only non-points adjustments
        const remainingAdjustments = ((item as any).adjustments || [])
          .filter((adj: any) => adj.code !== "POINTS_REDEMPTION")
          .map((adj: any) => ({
            id: adj.id,
            item_id: item.id,
            code: adj.code,
            amount: adj.amount,
            description: adj.description,
            promotion_id: adj.promotion_id || null,
          }))

        await cartModuleService.setLineItemAdjustments(cartId, remainingAdjustments)
      }
    }

    // Clear points metadata from cart
    await cartModuleService.updateCarts(cartId, {
      metadata: {
        ...cart.metadata,
        points_to_redeem: null,
        points_discount_amount: null,
      },
    })

    // Retrieve updated cart
    const updatedCart = await cartModuleService.retrieveCart(cartId, {
      relations: ["items"],
    })

    logger.info(`Removed points discount from cart ${cartId}`)

    res.json({
      success: true,
      message: "Points discount removed",
      cart: updatedCart,
    })
  } catch (error) {
    logger.error(`Failed to remove points from cart: ${error.message}`)

    if (error instanceof MedusaError) {
      throw error
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Failed to remove points: ${error.message}`
    )
  }
}

/**
 * OPTIONS /store/cart/:id/remove-points
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  _req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send()
}
