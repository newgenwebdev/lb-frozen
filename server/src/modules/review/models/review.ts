import { model } from "@medusajs/framework/utils"

/**
 * Review Model
 * Represents a product review submitted by a customer
 */
const Review = model.define("review", {
  id: model.id().primaryKey(),
  product_id: model.text(), // Medusa product ID
  customer_id: model.text(), // Medusa customer ID
  order_id: model.text().nullable(), // Order ID for verified purchase
  order_item_id: model.text().nullable(), // Order line item ID
  rating: model.number(), // 1-5 stars
  title: model.text().nullable(), // Review title
  content: model.text().nullable(), // Review body
  images: model.json().default({ items: [] }), // Array of image URLs
  is_verified_purchase: model.boolean().default(false), // Customer actually bought this
  is_approved: model.boolean().default(true), // For moderation
  is_featured: model.boolean().default(false), // Highlight this review
  helpful_count: model.number().default(0), // How many found this helpful
})

export default Review
