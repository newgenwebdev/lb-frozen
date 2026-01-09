import { model } from "@medusajs/framework/utils"

/**
 * CustomerActivity Model
 * Tracks aggregated rolling 12-month order activity for tier calculation
 *
 * This is a denormalized summary table that gets recalculated periodically
 * or after each order to determine customer's current tier eligibility.
 */
const CustomerActivity = model.define("customer_activity", {
  id: model.id().primaryKey(),
  customer_id: model.text().unique(),              // Reference to customer
  rolling_order_count: model.number().default(0),  // Number of orders in last 12 months
  rolling_spend_total: model.bigNumber().default(0), // Total spend in last 12 months (in cents)
  last_calculated_at: model.dateTime(),            // When stats were last recalculated
})

export default CustomerActivity
