import { Module } from "@medusajs/framework/utils"
import ReviewModuleService from "./services/review"

export const REVIEW_MODULE = "reviewModuleService"

export default Module(REVIEW_MODULE, {
  service: ReviewModuleService,
})

export { ReviewModuleService }
