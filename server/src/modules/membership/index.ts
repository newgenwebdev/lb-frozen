import { Module } from "@medusajs/framework/utils"
import MembershipModuleService from "./services/membership"
import GroupManagerService from "./services/group-manager"

export const MEMBERSHIP_MODULE = "membershipModuleService"

export default Module(MEMBERSHIP_MODULE, {
  service: MembershipModuleService,
})

export { MembershipModuleService, GroupManagerService }
