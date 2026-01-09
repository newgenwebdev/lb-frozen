import { Module } from "@medusajs/framework/utils"
import ShippingSettingsModuleService from "./services/shipping-settings"

export const SHIPPING_SETTINGS_MODULE = "shippingSettingsModuleService"

export default Module(SHIPPING_SETTINGS_MODULE, {
  service: ShippingSettingsModuleService,
})

export { ShippingSettingsModuleService }
