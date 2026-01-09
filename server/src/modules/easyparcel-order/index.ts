import { Module } from "@medusajs/framework/utils"
import EasyParcelOrderModuleService from "./services/easyparcel-order"

export const EASYPARCEL_ORDER_MODULE = "easyparcelOrderModuleService"

export default Module(EASYPARCEL_ORDER_MODULE, {
  service: EasyParcelOrderModuleService,
})

export { EasyParcelOrderModuleService }
