import { model } from "@medusajs/framework/utils"

/**
 * Shipment Model
 * Represents a shipment method with name, base rate, ETA, and status
 */
const Shipment = model.define("shipment", {
  id: model.id().primaryKey(),
  name: model.text(),
  base_rate: model.number(),
  eta: model.text(),
  status: model.text().default("Active"),
})

export default Shipment

