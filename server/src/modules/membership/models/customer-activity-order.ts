import { model } from "@medusajs/framework/utils"

/**
 * CustomerActivityOrder Model
 * Records individual orders for rolling 12-month activity calculation
 *
 * Each order is stored as a separate record to allow accurate
 * rolling window calculations. Old records (>12 months) are excluded
 * from activity calculations but kept for historical reference.
 */
const CustomerActivityOrder = model.define("customer_activity_order", {
  id: model.id().primaryKey(),
  customer_id: model.text(),           // Reference to customer
  order_id: model.text(),              // Reference to Medusa order
  order_total: model.bigNumber(),      // Order total in cents
  order_date: model.dateTime(),        // When the order was placed
})

export default CustomerActivityOrder
