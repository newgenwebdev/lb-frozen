import { Module } from "@medusajs/framework/utils"
import BannerModuleService from "./services/banner"

export const BANNER_MODULE = "bannerModuleService"

export default Module(BANNER_MODULE, {
  service: BannerModuleService,
})

export { BannerModuleService }

