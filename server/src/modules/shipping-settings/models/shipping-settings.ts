import { model } from "@medusajs/framework/utils"

/**
 * ShippingSetting Model
 * Stores the sender/pickup address configuration for EasyParcel shipping
 * Only one record should exist (singleton pattern for settings)
 *
 * Note: Variable name is singular (ShippingSetting) so MedusaService
 * generates methods like listShippingSettings, createShippingSettings
 */
const ShippingSetting = model.define("shipping_setting", {
  id: model.id().primaryKey(),
  sender_name: model.text(), // Business name
  sender_phone: model.text(), // Contact phone
  sender_address: model.text(), // Street address
  sender_unit: model.text().nullable(), // Unit number (optional)
  sender_postcode: model.text(), // 6-digit postal code
  sender_country: model.text().default("SG"), // Country code (default Singapore)
})

export default ShippingSetting
