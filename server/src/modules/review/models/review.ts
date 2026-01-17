import { model } from "@medusajs/framework/utils"

/**
 * Review Model
 * Represents a product review submitted by a customer or guest
 */
const Review = model.define("review", {
  id: model.id().primaryKey(),
  product_id: model.text(), // Medusa product ID
  customer_id: model.text().nullable(), // Medusa customer ID (null for guests)
  order_id: model.text().nullable(), // Order ID for verified purchase
  order_item_id: model.text().nullable(), // Order line item ID
  
  // Guest reviewer info (when customer_id is null)
  guest_name: model.text().nullable(), // Guest's display name
  guest_email: model.text().nullable(), // Guest's email for follow-up
  guest_phone: model.text().nullable(), // Guest's phone number
  
  rating: model.number(), // 1-5 stars
  title: model.text().nullable(), // Review title
  content: model.text().nullable(), // Review body
  images: model.json().default({ items: [] }), // Array of image URLs
  is_verified_purchase: model.boolean().default(false), // Customer actually bought this
  is_guest_review: model.boolean().default(false), // True if submitted by guest
  is_approved: model.boolean().default(true), // For moderation
  is_featured: model.boolean().default(false), // Highlight this review
  helpful_count: model.number().default(0), // How many found this helpful
})

export default Review
