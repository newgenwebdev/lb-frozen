import { Module } from "@medusajs/framework/utils"
import MembershipConfigModuleService from "./services/membership-config"

export const MEMBERSHIP_CONFIG_MODULE = "membershipConfigModuleService"

export default Module(MEMBERSHIP_CONFIG_MODULE, {
  service: MembershipConfigModuleService,
})
