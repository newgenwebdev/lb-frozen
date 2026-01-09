import { Module } from "@medusajs/framework/utils"
import ShipmentModuleService from "./services/shipment"

export const SHIPMENT_MODULE = "shipmentModuleService"

export default Module(SHIPMENT_MODULE, {
  service: ShipmentModuleService,
})

export { ShipmentModuleService }

