import { Migration } from '@mikro-orm/migrations';

export class Migration20251218120001 extends Migration {

  override async up(): Promise<void> {
    // Add new columns to points_config table
    this.addSql(`ALTER TABLE "points_config" ADD COLUMN IF NOT EXISTS "include_tax_in_earning" boolean NOT NULL DEFAULT false;`);
    this.addSql(`ALTER TABLE "points_config" ADD COLUMN IF NOT EXISTS "include_shipping_in_earning" boolean NOT NULL DEFAULT false;`);
    this.addSql(`ALTER TABLE "points_config" ADD COLUMN IF NOT EXISTS "min_points_to_redeem" integer NOT NULL DEFAULT 100;`);
    this.addSql(`ALTER TABLE "points_config" ADD COLUMN IF NOT EXISTS "max_redemption_percentage" integer NOT NULL DEFAULT 50;`);
    this.addSql(`ALTER TABLE "points_config" ADD COLUMN IF NOT EXISTS "expiration_months" integer NOT NULL DEFAULT 0;`);

    // Update earning_type enum to use 'per_currency' instead of 'per_product'
    // First, update any existing 'per_product' values
    this.addSql(`UPDATE "points_config" SET "earning_type" = 'per_currency' WHERE "earning_type" = 'per_product';`);
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "points_config" DROP COLUMN IF EXISTS "include_tax_in_earning";`);
    this.addSql(`ALTER TABLE "points_config" DROP COLUMN IF EXISTS "include_shipping_in_earning";`);
    this.addSql(`ALTER TABLE "points_config" DROP COLUMN IF EXISTS "min_points_to_redeem";`);
    this.addSql(`ALTER TABLE "points_config" DROP COLUMN IF EXISTS "max_redemption_percentage";`);
    this.addSql(`ALTER TABLE "points_config" DROP COLUMN IF EXISTS "expiration_months";`);
  }

}
