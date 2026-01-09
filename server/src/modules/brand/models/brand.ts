import { model } from "@medusajs/framework/utils"

/**
 * Brand Model
 * Represents a brand that can be associated with products
 */
const Brand = model.define("brand", {
  id: model.id().primaryKey(),
  name: model.text(),
  handle: model.text(),
  description: model.text().nullable(),
  logo_url: model.text().nullable(),
  is_active: model.boolean().default(true),
  rank: model.number().default(0), // For ordering brands
})

export default Brand
