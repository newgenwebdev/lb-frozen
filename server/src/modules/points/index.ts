import { Module } from "@medusajs/framework/utils"
import PointsModuleService from "./services/points"

export const POINTS_MODULE = "pointsModuleService"

export default Module(POINTS_MODULE, {
  service: PointsModuleService,
})

export { PointsModuleService }
