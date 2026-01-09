import { model } from "@medusajs/framework/utils"

/**
 * Banner Model
 * Represents an announcement banner with text, link, dates, and colors
 */
const Banner = model.define("banner", {
  id: model.id().primaryKey(),
  announcement_text: model.text(),
  link: model.text().nullable(),
  start_date: model.dateTime(),
  end_date: model.dateTime(),
  background_color: model.text().default("#007AFF"), // Hex color code
  text_color: model.text().default("#FFFFFF"), // Hex color code
  is_enabled: model.boolean().default(true), // Manual toggle for enabling/disabling banner
})

export default Banner

