import { model } from "@medusajs/framework/utils"

/**
 * Wishlist Model
 * Represents a wishlist item for a customer
 */
const Wishlist = model.define("wishlist", {
  id: model.id().primaryKey(),
  customer_id: model.text(), // Medusa customer ID
  product_id: model.text(), // Medusa product ID
  variant_id: model.text().nullable(), // Variant ID (optional, for specific variant tracking)
  title: model.text(), // Product title (denormalized for quick display)
  thumbnail: model.text().nullable(), // Product thumbnail URL
  price: model.number(), // Product price at time of adding
  original_price: model.number().nullable(), // Original price if on discount
})

export default Wishlist
