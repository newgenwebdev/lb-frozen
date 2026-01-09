import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import type { RemovePWPRequest } from "../schemas"

/**
 * POST /store/pwp/remove
 * Remove a PWP item from the cart
 */
export const POST = async (
  req: MedusaRequest<RemovePWPRequest>,
  res: MedusaResponse
): Promise<void> => {
  const body = req.validatedBody || req.body
  const { cart_id, line_item_id } = body
  const logger = req.scope.resolve("logger")

  if (!cart_id || !line_item_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Missing required fields: cart_id and line_item_id are required"
    )
  }

  try {
    const cartModuleService = req.scope.resolve(Modules.CART)

    // Get cart with items
    const cart = await cartModuleService.retrieveCart(cart_id, {
      relations: ["items"],
    })

    if (!cart) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Cart with id ${cart_id} not found`
      )
    }

    // Find the line item
    const lineItem = (cart.items || []).find((item) => item.id === line_item_id)

    if (!lineItem) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Line item with id ${line_item_id} not found in cart`
      )
    }

    // Check if it's a PWP item
    if (!lineItem.metadata?.is_pwp_item) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "This item is not a PWP item"
      )
    }

    const pwpRuleName = lineItem.metadata?.pwp_rule_name || "Unknown"

    // Remove the line item
    await cartModuleService.deleteLineItems([line_item_id])

    // Get updated cart
    const updatedCart = await cartModuleService.retrieveCart(cart_id, {
      relations: ["items", "items.adjustments"],
    })

    logger.info(`Removed PWP item ${line_item_id} from cart ${cart_id}`)

    res.json({
      success: true,
      message: `PWP offer "${pwpRuleName}" has been removed from your cart`,
      removed_item_id: line_item_id,
      cart: updatedCart,
    })
  } catch (error) {
    logger.error(`Failed to remove PWP item: ${error.message}`)

    if (error instanceof MedusaError) {
      throw error
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Failed to remove PWP item: ${error.message}`
    )
  }
}
