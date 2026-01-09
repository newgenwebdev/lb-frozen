import { Migration } from '@mikro-orm/migrations';

export class Migration20251223120000 extends Migration {

  override async up(): Promise<void> {
    // Add replacement order tracking columns
    this.addSql(`
      ALTER TABLE "return_request"
      ADD COLUMN IF NOT EXISTS "replacement_order_id" text NULL,
      ADD COLUMN IF NOT EXISTS "replacement_created_at" timestamptz NULL;
    `);

    // Add index for faster lookups by replacement_order_id
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_return_request_replacement_order_id"
      ON "return_request" ("replacement_order_id")
      WHERE "replacement_order_id" IS NOT NULL;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      DROP INDEX IF EXISTS "idx_return_request_replacement_order_id";
    `);

    this.addSql(`
      ALTER TABLE "return_request"
      DROP COLUMN IF EXISTS "replacement_order_id",
      DROP COLUMN IF EXISTS "replacement_created_at";
    `);
  }

}
