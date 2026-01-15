import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { WISHLIST_MODULE } from "../../../../modules/wishlist"
import type { WishlistModuleService } from "../../../../modules/wishlist"
import { getVerifiedCustomerId } from "../../../../utils/store-auth"

/**
 * DELETE /store/wishlist/[product_id]
 * Remove item from wishlist
 */
export const DELETE = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const customerId = getVerifiedCustomerId(req)

  if (!customerId) {
    return res.status(401).json({
      message: "Unauthorized",
    })
  }

  const { product_id } = req.params

  if (!product_id || typeof product_id !== "string") {
    return res.status(400).json({
      message: "Missing required parameter: product_id",
    })
  }

  try {
    const wishlistService = req.scope.resolve<WishlistModuleService>(WISHLIST_MODULE)
    await wishlistService.removeItem(customerId, product_id)

    res.json({ success: true })
  } catch (error) {
    console.error("[API] Failed to remove item from wishlist:", error)
    res.status(500).json({ message: "Failed to remove item from wishlist" })
  }
}
