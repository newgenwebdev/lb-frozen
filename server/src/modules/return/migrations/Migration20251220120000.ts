import { Migration } from '@mikro-orm/migrations';

export class Migration20251220120000 extends Migration {

  override async up(): Promise<void> {
    // Add raw_* columns required by Medusa's bigNumber type
    // These store the raw numeric value as JSON for precision
    this.addSql(`
      ALTER TABLE "return_request"
      ADD COLUMN IF NOT EXISTS "raw_refund_amount" jsonb NULL,
      ADD COLUMN IF NOT EXISTS "raw_shipping_refund" jsonb NULL,
      ADD COLUMN IF NOT EXISTS "raw_total_refund" jsonb NULL;
    `);

    // Migrate existing numeric data to the raw_* columns
    this.addSql(`
      UPDATE "return_request"
      SET
        "raw_refund_amount" = jsonb_build_object('value', refund_amount::text, 'precision', 20),
        "raw_shipping_refund" = jsonb_build_object('value', shipping_refund::text, 'precision', 20),
        "raw_total_refund" = jsonb_build_object('value', total_refund::text, 'precision', 20)
      WHERE "raw_refund_amount" IS NULL;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "return_request"
      DROP COLUMN IF EXISTS "raw_refund_amount",
      DROP COLUMN IF EXISTS "raw_shipping_refund",
      DROP COLUMN IF EXISTS "raw_total_refund";
    `);
  }

}
