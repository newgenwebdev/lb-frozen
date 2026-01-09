import { MedusaService } from "@medusajs/framework/utils"
import ShippingSetting from "../models/shipping-settings"

type ShippingSettingsData = {
  id?: string
  sender_name: string
  sender_phone: string
  sender_address: string
  sender_unit?: string | null
  sender_postcode: string
  sender_country?: string
}

/**
 * ShippingSettingsModuleService
 * Handles shipping settings CRUD operations
 * Uses singleton pattern - only one settings record exists
 *
 * Note: Model variable is singular (ShippingSetting) so methods are:
 * listShippingSettings, createShippingSettings, updateShippingSettings
 */
class ShippingSettingsModuleService extends MedusaService({
  ShippingSetting,
}) {
  /**
   * Get the current shipping settings
   * Returns null if not configured yet
   */
  async getSettings(): Promise<ShippingSettingsData | null> {
    const settings = await this.listShippingSettings({}, { take: 1 })
    if (settings.length === 0) {
      return null
    }
    return settings[0]
  }

  /**
   * Create or update shipping settings
   * Uses upsert pattern - creates if not exists, updates if exists
   */
  async upsertSettings(data: ShippingSettingsData): Promise<ShippingSettingsData> {
    const existingSettings = await this.listShippingSettings({}, { take: 1 })

    if (existingSettings.length > 0) {
      // Update existing
      const updated = await this.updateShippingSettings({
        id: existingSettings[0].id,
        sender_name: data.sender_name,
        sender_phone: data.sender_phone,
        sender_address: data.sender_address,
        sender_unit: data.sender_unit ?? null,
        sender_postcode: data.sender_postcode,
        sender_country: data.sender_country || "SG",
      })
      return updated
    } else {
      // Create new
      const created = await this.createShippingSettings({
        sender_name: data.sender_name,
        sender_phone: data.sender_phone,
        sender_address: data.sender_address,
        sender_unit: data.sender_unit ?? null,
        sender_postcode: data.sender_postcode,
        sender_country: data.sender_country || "SG",
      })
      return created
    }
  }
}

export default ShippingSettingsModuleService
