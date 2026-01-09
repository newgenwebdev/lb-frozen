import { Module } from "@medusajs/framework/utils"
import EasyParcelReturnModuleService from "./services/easyparcel-return"

export const EASYPARCEL_RETURN_MODULE = "easyparcelReturnModuleService"

export default Module(EASYPARCEL_RETURN_MODULE, {
  service: EasyParcelReturnModuleService,
})

export { EasyParcelReturnModuleService }
