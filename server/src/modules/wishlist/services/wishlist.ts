import { MedusaService } from "@medusajs/framework/utils"
import Wishlist from "../models/wishlist"

interface CreateWishlistItemInput {
  customer_id: string
  product_id: string
  variant_id?: string
  title: string
  thumbnail?: string | null
  price: number
  original_price?: number
}

class WishlistModuleService extends MedusaService({
  Wishlist,
}) {
  /**
   * Add an item to customer's wishlist
   */
  async addItem(input: CreateWishlistItemInput) {
    try {
      // Check if already exists
      const existing = await this.listWishlists({
        customer_id: input.customer_id,
        product_id: input.product_id,
      })

      if (existing.length > 0) {
        return existing[0]
      }

      // Create new wishlist item
      const wishlist = await this.createWishlists({
        customer_id: input.customer_id,
        product_id: input.product_id,
        variant_id: input.variant_id,
        title: input.title,
        thumbnail: input.thumbnail,
        price: input.price,
        original_price: input.original_price,
      })

      return wishlist
    } catch (error) {
      throw error
    }
  }

  /**
   * Remove an item from customer's wishlist
   */
  async removeItem(customer_id: string, product_id: string) {
    try {
      const items = await this.listWishlists({
        customer_id,
        product_id,
      })

      if (items.length > 0) {
        await this.deleteWishlists(items.map((item: any) => item.id))
      }

      return { success: true }
    } catch (error) {
      throw error
    }
  }

  /**
   * Get all wishlist items for a customer
   */
  async getCustomerWishlist(customer_id: string) {
    try {
      console.log("[Wishlist] Fetching wishlist for customer:", customer_id)
      const items = await this.listWishlists(
        {
          customer_id,
        },
        {
          order: { created_at: "DESC" },
        }
      )
      console.log("[Wishlist] Found items:", items.length)
      return items
    } catch (error) {
      console.error("[Wishlist] Error fetching customer wishlist:", error)
      throw error
    }
  }

  /**
   * Check if product is in customer's wishlist
   */
  async isInWishlist(customer_id: string, product_id: string) {
    try {
      const items = await this.listWishlists({
        customer_id,
        product_id,
      })

      return items.length > 0
    } catch (error) {
      throw error
    }
  }

  /**
   * Clear entire wishlist for a customer
   */
  async clearWishlist(customer_id: string) {
    try {
      const items = await this.listWishlists({
        customer_id,
      })

      if (items.length > 0) {
        await this.deleteWishlists(items.map((item: any) => item.id))
      }

      return { success: true }
    } catch (error) {
      throw error
    }
  }

  /**
   * Get count of items in customer's wishlist
   */
  async getWishlistCount(customer_id: string) {
    try {
      const items = await this.listWishlists({
        customer_id,
      })

      return items.length
    } catch (error) {
      throw error
    }
  }
}

export default WishlistModuleService
