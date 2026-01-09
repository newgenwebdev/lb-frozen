import { Module } from "@medusajs/framework/utils"
import ReturnService from "./service/return"

export const RETURN_MODULE = "returnModuleService"

export default Module(RETURN_MODULE, {
  service: ReturnService,
})

export { ReturnService }
