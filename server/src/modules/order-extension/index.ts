import { Module } from "@medusajs/framework/utils"
import OrderExtensionService from "./service/order-extension"

export const ORDER_EXTENSION_MODULE = "orderExtensionModuleService"

export default Module(ORDER_EXTENSION_MODULE, {
  service: OrderExtensionService,
})

export { OrderExtensionService }
