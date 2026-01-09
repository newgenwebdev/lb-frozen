import { model } from "@medusajs/framework/utils"

/**
 * MembershipPromo Model
 * Tracks promotional periods/offers for members
 * Note: created_at, updated_at, deleted_at are auto-managed by Medusa/MikroORM
 */
const MembershipPromo = model.define("membership_promo", {
  id: model.id().primaryKey(),
  name: model.text(),
  description: model.text().nullable(),
  start_date: model.dateTime(),
  end_date: model.dateTime(),
  status: model.enum(["active", "non-active"]).default("active"),
  discount_type: model.enum(["percentage", "fixed"]).default("percentage"),
  discount_value: model.bigNumber().default(0),
  minimum_purchase: model.bigNumber().nullable(),
})

export default MembershipPromo
