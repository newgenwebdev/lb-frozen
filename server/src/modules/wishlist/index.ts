import { Module } from "@medusajs/framework/utils"
import WishlistModuleService from "./services/wishlist"

export const WISHLIST_MODULE = "wishlistModuleService"

export default Module(WISHLIST_MODULE, {
  service: WishlistModuleService,
})

export { WishlistModuleService }
