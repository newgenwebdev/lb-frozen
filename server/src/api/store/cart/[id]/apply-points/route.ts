import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { MEMBERSHIP_MODULE } from "../../../../../modules/membership"
import { POINTS_MODULE } from "../../../../../modules/points"
import type { ApplyPointsRequest } from "../../schemas"
import { getVerifiedCustomerId } from "../../../../../utils/store-auth"

/**
 * POST /store/cart/:id/apply-points
 * Apply points as discount to cart
 * Requires authentication + membership
 */
export const POST = async (
  req: MedusaRequest<ApplyPointsRequest>,
  res: MedusaResponse
) => {
  const logger = req.scope.resolve("logger")

  const customerId = getVerifiedCustomerId(req)

  if (!customerId) {
    logger.error(`[APPLY-POINTS] No customer ID extracted from token`)
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Authentication required"
    )
  }

  // Use validatedBody if available, fallback to body (middleware may not run for dynamic routes)
  const body = req.validatedBody || req.body
  const { points_to_redeem } = body
  const cartId = req.params.id

  // Basic validation if middleware didn't run
  if (!points_to_redeem || typeof points_to_redeem !== 'number' || points_to_redeem <= 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Invalid points_to_redeem: must be a positive number"
    )
  }

  const membershipService = req.scope.resolve(MEMBERSHIP_MODULE) as any
  const pointsService = req.scope.resolve(POINTS_MODULE) as any
  const cartModuleService = req.scope.resolve(Modules.CART)

  try {
    // Check membership
    const isMember = await membershipService.isMember(customerId)
    if (!isMember) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Membership required to use points"
      )
    }

    // Get cart
    const cart = await cartModuleService.retrieveCart(cartId, {
      relations: ["items"],
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
        "Cannot apply points to another customer's cart"
      )
    }

    // Calculate cart subtotal from items (in cents)
    // cart.total/subtotal might not be populated, so calculate from items
    const cartSubtotal = cart.items.reduce((sum: number, item: any) => {
      return sum + (Number(item.unit_price) * item.quantity)
    }, 0)


    // Get customer's points balance
    const balance = await pointsService.getBalance(customerId)
    if (!balance || Number(balance.balance) < points_to_redeem) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Insufficient points balance"
      )
    }

    // Calculate discount
    const discountAmount = await pointsService.calculateRedemptionDiscount(
      points_to_redeem
    )

    if (discountAmount > cartSubtotal) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Points discount ($${(discountAmount / 100).toFixed(2)}) cannot exceed cart subtotal ($${(cartSubtotal / 100).toFixed(2)})`
      )
    }

    // Apply adjustment to cart
    // Note: In Medusa v2, adjustment amounts should be positive - Medusa subtracts them from total
    await cartModuleService.addLineItemAdjustments([
      {
        item_id: cart.items[0]?.id, // Apply to first item
        code: "POINTS_REDEMPTION",
        amount: discountAmount, // Positive value - Medusa subtracts this from total
        description: `Redeemed ${points_to_redeem} points`,
        promotion_id: null,
      },
    ])

    // Store points to redeem in cart metadata for later processing
    await cartModuleService.updateCarts(cartId, {
      metadata: {
        ...cart.metadata,
        points_to_redeem,
        points_discount_amount: discountAmount,
      },
    })

    // Retrieve updated cart
    const updatedCart = await cartModuleService.retrieveCart(cartId, {
      relations: ["items"],
    })

    logger.info(
      `Applied ${points_to_redeem} points - discount: $${(discountAmount / 100).toFixed(2)}, cart: ${cartId}`
    )

    res.json({
      cart: updatedCart,
      points_applied: {
        points: points_to_redeem,
        discount_amount: discountAmount,
        discount_formatted: `$${(discountAmount / 100).toFixed(2)}`,
      },
    })
  } catch (error) {
    logger.error(`[APPLY-POINTS] Failed to apply points to cart: ${(error as Error).message}`)

    if (error instanceof MedusaError) {
      throw error
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Failed to apply points"
    )
  }
}

/**
 * OPTIONS /store/cart/:id/apply-points
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  _req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send()
}
