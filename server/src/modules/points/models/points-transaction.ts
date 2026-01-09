import { model } from "@medusajs/framework/utils"

/**
 * PointsTransaction Model
 * Audit log of all point movements
 */
const PointsTransaction = model.define("points_transaction", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  type: model.enum(["earned", "redeemed", "admin_added", "admin_removed", "return_deducted", "return_restored", "cancel_deducted", "cancel_restored"]),
  amount: model.bigNumber(), // Positive for earn, negative for redeem
  order_id: model.text().nullable(),
  reason: model.text(), // e.g., "Purchase order #123", "Admin adjustment"
  balance_after: model.bigNumber(), // Snapshot of balance after transaction
  created_by: model.text().nullable(), // Admin user ID if manual adjustment
})

export default PointsTransaction
