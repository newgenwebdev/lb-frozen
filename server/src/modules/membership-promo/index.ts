import { Module } from "@medusajs/framework/utils"
import MembershipPromoModuleService from "./services/membership-promo"

export const MEMBERSHIP_PROMO_MODULE = "membershipPromoModuleService"

export default Module(MEMBERSHIP_PROMO_MODULE, {
  service: MembershipPromoModuleService,
})

export { MembershipPromoModuleService }
