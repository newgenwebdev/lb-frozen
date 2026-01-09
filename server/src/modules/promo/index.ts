import { Module } from "@medusajs/framework/utils"
import PromoModuleService from "./services/promo"

export const PROMO_MODULE = "promoModuleService"

export default Module(PROMO_MODULE, {
  service: PromoModuleService,
})
