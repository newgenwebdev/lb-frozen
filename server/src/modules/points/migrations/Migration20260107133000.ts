import { Migration } from "@mikro-orm/migrations";

export class Migration20260107133000 extends Migration {
  override async up(): Promise<void> {
    // drop old constraint first so the UPDATE won't violate it
    this.addSql(`
      ALTER TABLE "points_config"
      DROP CONSTRAINT IF EXISTS "points_config_earning_type_check";
    `);

    // convert existing values if any
    this.addSql(`
      UPDATE "points_config"
      SET "earning_type" = 'per_currency'
      WHERE "earning_type" = 'per_product';
    `);

    // add new constraint that allows per_currency
    this.addSql(`
      ALTER TABLE "points_config"
      ADD CONSTRAINT "points_config_earning_type_check"
      CHECK ("earning_type" IN ('percentage', 'per_currency'));
    `);
  }

  override async down(): Promise<void> {
    // drop new constraint, restore old one, and revert values
    this.addSql(`
      ALTER TABLE "points_config"
      DROP CONSTRAINT IF EXISTS "points_config_earning_type_check";
    `);

    this.addSql(`
      ALTER TABLE "points_config"
      ADD CONSTRAINT "points_config_earning_type_check"
      CHECK ("earning_type" IN ('percentage', 'per_product'));
    `);

    this.addSql(`
      UPDATE "points_config"
      SET "earning_type" = 'per_product'
      WHERE "earning_type" = 'per_currency';
    `);
  }
}