import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { MEMBERSHIP_PROMO_MODULE } from "../../../../modules/membership-promo"
import { MEMBERSHIP_MODULE } from "../../../../modules/membership"
import type { ApplyMembershipPromoRequest } from "../schemas"

/**
 * POST /store/membership-promo/apply
 * Automatically find and apply the best active membership promo to the cart
 * Requires authentication - only applies to members
 */
export const POST = async (
  req: MedusaRequest<ApplyMembershipPromoRequest>,
  res: MedusaResponse
): Promise<void> => {
  const body = req.validatedBody || req.body
  const { cart_id } = body
  const logger = req.scope.resolve("logger")

  // Check authentication
  const authContext = (req as any).auth_context
  if (!authContext?.actor_id) {
    res.status(401).json({ message: "Authentication required to apply membership promo" } as any)
    return
  }

  const customerId = authContext.actor_id

  if (!cart_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Missing required field: cart_id"
    )
  }

  try {
    const membershipPromoService = req.scope.resolve(MEMBERSHIP_PROMO_MODULE) as any
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

    // Check if cart already has a membership promo applied
    if (cart.metadata?.applied_membership_promo_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Cart already has a membership promo applied. Remove it first to apply a new one."
      )
    }

    // Check if cart has items
    if (!cart.items || cart.items.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Cannot apply membership promo to empty cart"
      )
    }

    // Check if customer is a member using the membership module
    const membershipService = req.scope.resolve(MEMBERSHIP_MODULE) as any
    const membershipData = await membershipService.getMembershipWithActivity(customerId)

    const isMember = membershipData?.membership?.status === "active"

    if (!isMember) {
      res.json({
        success: false,
        message: "Only members can apply membership promos",
        is_member: false,
        cart,
      })
      return
    }

    // Get all active membership promos
    const now = new Date()
    const [promos] = await membershipPromoService.listPromos({
      status: "active",
      limit: 100,
    })

    logger.info(`Found ${promos?.length || 0} promos with status "active"`)

    // Filter promos by date range
    const activePromos = promos.filter((promo: any) => {
      const startDate = new Date(promo.start_date)
      const endDate = new Date(promo.end_date)
      const isInRange = startDate <= now && endDate >= now
      logger.info(`Promo "${promo.name}": start=${startDate.toISOString()}, end=${endDate.toISOString()}, now=${now.toISOString()}, inRange=${isInRange}`)
      return isInRange
    })

    if (activePromos.length === 0) {
      res.json({
        success: false,
        message: "No active membership promos available",
        cart,
        debug: {
          total_promos_found: promos?.length || 0,
          current_time: now.toISOString(),
        },
      })
      return
    }

    // Calculate cart subtotal from items (in cents)
    const cartSubtotal = cart.items.reduce((sum: number, item: any) => {
      return sum + (Number(item.unit_price) * item.quantity)
    }, 0)

    logger.info(`Cart subtotal: ${cartSubtotal} cents`)

    // Find the best promo (highest discount) that meets minimum purchase
    let bestPromo: any = null
    let bestDiscountAmount = 0

    for (const promo of activePromos) {
      // Check minimum purchase requirement
      const minPurchase = promo.minimum_purchase ? Number(promo.minimum_purchase) : 0
      if (cartSubtotal < minPurchase) {
        logger.info(`Promo ${promo.name} requires minimum ${minPurchase}, cart has ${cartSubtotal}`)
        continue
      }

      // Calculate discount for this promo
      let discountAmount: number
      if (promo.discount_type === "percentage") {
        discountAmount = Math.round((cartSubtotal * Number(promo.discount_value)) / 100)
      } else {
        // Fixed amount in cents
        discountAmount = Number(promo.discount_value)
      }

      // Ensure discount doesn't exceed cart subtotal
      discountAmount = Math.min(discountAmount, cartSubtotal)

      logger.info(`Promo ${promo.name}: discount ${discountAmount} cents`)

      // Track best promo
      if (discountAmount > bestDiscountAmount) {
        bestDiscountAmount = discountAmount
        bestPromo = promo
      }
    }

    if (!bestPromo) {
      res.json({
        success: false,
        message: "No applicable membership promos for your cart",
        cart,
      })
      return
    }

    logger.info(`Applying best promo: ${bestPromo.name} - discount: ${bestDiscountAmount} cents`)

    // Apply adjustment to cart (apply to first item for simplicity)
    await cartModuleService.addLineItemAdjustments([
      {
        item_id: cart.items[0].id,
        code: `MEMBERSHIP_PROMO_${bestPromo.id}`,
        amount: bestDiscountAmount,
        description: `Membership Promo: ${bestPromo.name}`,
        promotion_id: null,
      },
    ])

    // Store promo info in cart metadata
    await cartModuleService.updateCarts(cart_id, {
      metadata: {
        ...cart.metadata,
        applied_membership_promo_id: bestPromo.id,
        applied_membership_promo_name: bestPromo.name,
        applied_membership_promo_type: bestPromo.discount_type,
        applied_membership_promo_value: Number(bestPromo.discount_value),
        applied_membership_promo_discount: bestDiscountAmount,
      },
    })

    // Retrieve updated cart
    const updatedCart = await cartModuleService.retrieveCart(cart_id, {
      relations: ["items", "items.adjustments"],
    })

    logger.info(
      `Applied membership promo ${bestPromo.name} to cart ${cart_id} - discount: ${bestDiscountAmount} cents`
    )

    res.json({
      success: true,
      cart: updatedCart,
      applied_promo: {
        id: bestPromo.id,
        name: bestPromo.name,
        description: bestPromo.description,
        discount_type: bestPromo.discount_type,
        discount_value: Number(bestPromo.discount_value),
        discount_amount: bestDiscountAmount,
        discount_formatted:
          bestPromo.discount_type === "percentage"
            ? `${bestPromo.discount_value}%`
            : `$${(bestDiscountAmount / 100).toFixed(2)}`,
      },
    })
  } catch (error) {
    logger.error(`Failed to apply membership promo: ${error.message}`)

    if (error instanceof MedusaError) {
      throw error
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Failed to apply membership promo: ${error.message}`
    )
  }
}
