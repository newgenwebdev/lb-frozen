import { Module } from "@medusajs/framework/utils"
import BrandModuleService from "./services/brand"

export const BRAND_MODULE = "brandModuleService"

export default Module(BRAND_MODULE, {
  service: BrandModuleService,
})

export { BrandModuleService }
