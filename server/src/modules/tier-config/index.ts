import { Module } from "@medusajs/framework/utils"
import TierConfigModuleService from "./services/tier-config"

export const TIER_CONFIG_MODULE = "tierConfigModuleService"

export default Module(TIER_CONFIG_MODULE, {
  service: TierConfigModuleService,
})

export { TierConfigModuleService }
