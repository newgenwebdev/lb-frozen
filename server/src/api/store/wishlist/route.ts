import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { WISHLIST_MODULE } from "../../../modules/wishlist"
import type { WishlistModuleService } from "../../../modules/wishlist"
import { getVerifiedCustomerId } from "../../../utils/store-auth"
import { z } from "zod"

const CreateWishlistSchema = z.object({
  product_id: z.string(),
  variant_id: z.string().optional(),
  title: z.string(),
  thumbnail: z.string().nullable().optional(),
  price: z.number(),
  original_price: z.number().optional(),
})

/**
 * GET /store/wishlist
 * Fetch customer's wishlist
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const customerId = getVerifiedCustomerId(req)

  if (!customerId) {
    return res.status(401).json({
      message: "Unauthorized",
    })
  }

  try {
    console.log("[API] GET /store/wishlist - customerId:", customerId)
    const wishlistService = req.scope.resolve<WishlistModuleService>(WISHLIST_MODULE)
    console.log("[API] wishlistService resolved:", !!wishlistService)
    const items = await wishlistService.getCustomerWishlist(customerId)
    console.log("[API] Wishlist items:", items.length)

    res.json({ wishlist: items })
  } catch (error) {
    console.error("[API] Failed to fetch wishlist:", error)
    res.status(500).json({ message: "Failed to fetch wishlist" })
  }
}

/**
 * POST /store/wishlist
 * Add item to wishlist
 */
export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const customerId = getVerifiedCustomerId(req)

  if (!customerId) {
    return res.status(401).json({
      message: "Unauthorized",
    })
  }

  const parseResult = CreateWishlistSchema.safeParse(req.body)
  if (!parseResult.success) {
    return res.status(400).json({
      message: "Missing required fields",
      errors: parseResult.error.flatten(),
    })
  }

  const data = parseResult.data

  try {
    const wishlistService = req.scope.resolve<WishlistModuleService>(WISHLIST_MODULE)
    const item = await wishlistService.addItem({
      customer_id: customerId,
      product_id: data.product_id,
      variant_id: data.variant_id,
      title: data.title,
      thumbnail: data.thumbnail,
      price: data.price,
      original_price: data.original_price,
    })

    res.status(201).json({ item })
  } catch (error) {
    console.error("[API] Failed to add item to wishlist:", error)
    res.status(500).json({ message: "Failed to add item to wishlist" })
  }
}
