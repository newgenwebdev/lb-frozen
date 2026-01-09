import { model } from "@medusajs/framework/utils"

/**
 * PointsBalance Model
 * Tracks customer point balances
 */
const PointsBalance = model.define("points_balance", {
  id: model.id().primaryKey(),
  customer_id: model.text().unique(),
  balance: model.bigNumber().default(0), // Current available points
  total_earned: model.bigNumber().default(0), // Lifetime earned
  total_redeemed: model.bigNumber().default(0), // Lifetime redeemed
})

export default PointsBalance
