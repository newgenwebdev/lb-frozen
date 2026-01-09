import { Migration } from '@mikro-orm/migrations';

export class Migration20251222120000 extends Migration {

  override async up(): Promise<void> {
    // Add original order discount information columns
    this.addSql(`
      ALTER TABLE "return_request"
      ADD COLUMN IF NOT EXISTS "original_order_total" numeric NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "coupon_code" text NULL,
      ADD COLUMN IF NOT EXISTS "coupon_discount" numeric NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "points_redeemed" numeric NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "points_discount" numeric NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "pwp_discount" numeric NOT NULL DEFAULT 0;
    `);

    // Add raw_* columns required by Medusa's bigNumber type for the new fields
    this.addSql(`
      ALTER TABLE "return_request"
      ADD COLUMN IF NOT EXISTS "raw_original_order_total" jsonb NULL,
      ADD COLUMN IF NOT EXISTS "raw_coupon_discount" jsonb NULL,
      ADD COLUMN IF NOT EXISTS "raw_points_redeemed" jsonb NULL,
      ADD COLUMN IF NOT EXISTS "raw_points_discount" jsonb NULL,
      ADD COLUMN IF NOT EXISTS "raw_pwp_discount" jsonb NULL;
    `);

    // Migrate existing numeric data to the raw_* columns
    this.addSql(`
      UPDATE "return_request"
      SET
        "raw_original_order_total" = jsonb_build_object('value', original_order_total::text, 'precision', 20),
        "raw_coupon_discount" = jsonb_build_object('value', coupon_discount::text, 'precision', 20),
        "raw_points_redeemed" = jsonb_build_object('value', points_redeemed::text, 'precision', 20),
        "raw_points_discount" = jsonb_build_object('value', points_discount::text, 'precision', 20),
        "raw_pwp_discount" = jsonb_build_object('value', pwp_discount::text, 'precision', 20)
      WHERE "raw_original_order_total" IS NULL;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "return_request"
      DROP COLUMN IF EXISTS "original_order_total",
      DROP COLUMN IF EXISTS "coupon_code",
      DROP COLUMN IF EXISTS "coupon_discount",
      DROP COLUMN IF EXISTS "points_redeemed",
      DROP COLUMN IF EXISTS "points_discount",
      DROP COLUMN IF EXISTS "pwp_discount",
      DROP COLUMN IF EXISTS "raw_original_order_total",
      DROP COLUMN IF EXISTS "raw_coupon_discount",
      DROP COLUMN IF EXISTS "raw_points_redeemed",
      DROP COLUMN IF EXISTS "raw_points_discount",
      DROP COLUMN IF EXISTS "raw_pwp_discount";
    `);
  }

}
