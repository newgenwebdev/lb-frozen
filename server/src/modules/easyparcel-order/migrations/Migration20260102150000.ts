import { Migration } from "@mikro-orm/migrations"

export class Migration20260102150000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "easyparcel_order" (
        "id" TEXT NOT NULL,
        "order_id" TEXT NOT NULL,
        "order_no" TEXT NULL,
        "parcel_no" TEXT NULL,
        "awb" TEXT NULL,
        "service_id" TEXT NOT NULL,
        "service_name" TEXT NOT NULL,
        "courier_id" TEXT NOT NULL,
        "courier_name" TEXT NOT NULL,
        "weight" REAL NOT NULL,
        "rate" INTEGER NOT NULL,
        "pickup_date" TEXT NULL,
        "pickup_time" TEXT NULL,
        "receiver_name" TEXT NOT NULL,
        "receiver_phone" TEXT NOT NULL,
        "receiver_address" TEXT NOT NULL,
        "receiver_postcode" TEXT NOT NULL,
        "receiver_country" TEXT NOT NULL DEFAULT 'SG',
        "status" TEXT NOT NULL DEFAULT 'rate_checked',
        "tracking_url" TEXT NULL,
        "metadata" JSONB NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "easyparcel_order_pkey" PRIMARY KEY ("id")
      );
    `)

    // Indexes
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_easyparcel_order_order_id" ON "easyparcel_order" ("order_id");`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_easyparcel_order_order_no" ON "easyparcel_order" ("order_no") WHERE "order_no" IS NOT NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_easyparcel_order_awb" ON "easyparcel_order" ("awb") WHERE "awb" IS NOT NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_easyparcel_order_status" ON "easyparcel_order" ("status");`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_easyparcel_order_deleted_at" ON "easyparcel_order" ("deleted_at") WHERE "deleted_at" IS NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "easyparcel_order" CASCADE;`)
  }
}
