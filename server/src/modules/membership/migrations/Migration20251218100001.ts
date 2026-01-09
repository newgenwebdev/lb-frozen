import { Migration } from '@mikro-orm/migrations';

export class Migration20251218100001 extends Migration {

  override async up(): Promise<void> {
    // Create customer_activity table for rolling 12-month tracking
    this.addSql(`
      create table if not exists "customer_activity" (
        "id" text not null,
        "customer_id" text not null,
        "rolling_order_count" integer not null default 0,
        "rolling_spend_total" numeric not null default 0,
        "last_calculated_at" timestamptz not null,
        "raw_rolling_spend_total" jsonb not null default '{}',
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "customer_activity_pkey" primary key ("id")
      );
    `);

    // Create unique index on customer_id
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_customer_activity_customer_id_unique" ON "customer_activity" (customer_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_customer_activity_deleted_at" ON "customer_activity" (deleted_at) WHERE deleted_at IS NULL;`);

    // Create customer_activity_order table for individual order records
    this.addSql(`
      create table if not exists "customer_activity_order" (
        "id" text not null,
        "customer_id" text not null,
        "order_id" text not null,
        "order_total" numeric not null,
        "order_date" timestamptz not null,
        "raw_order_total" jsonb not null default '{}',
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "customer_activity_order_pkey" primary key ("id")
      );
    `);

    // Create indexes for customer_activity_order
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_customer_activity_order_customer_id" ON "customer_activity_order" (customer_id);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_customer_activity_order_order_date" ON "customer_activity_order" (order_date);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_customer_activity_order_deleted_at" ON "customer_activity_order" (deleted_at) WHERE deleted_at IS NULL;`);

    // Alter membership table: add tier_slug and tier_updated_at, migrate from tier column
    // First add the new columns
    this.addSql(`ALTER TABLE "membership" ADD COLUMN IF NOT EXISTS "tier_slug" text DEFAULT 'classic';`);
    this.addSql(`ALTER TABLE "membership" ADD COLUMN IF NOT EXISTS "tier_updated_at" timestamptz NULL;`);

    // Migrate existing premium members to classic tier (they can upgrade based on activity)
    this.addSql(`UPDATE "membership" SET "tier_slug" = 'classic' WHERE "tier_slug" IS NULL;`);

    // Drop the old tier column and its constraint
    this.addSql(`ALTER TABLE "membership" DROP CONSTRAINT IF EXISTS "membership_tier_check";`);
    this.addSql(`ALTER TABLE "membership" DROP COLUMN IF EXISTS "tier";`);
  }

  override async down(): Promise<void> {
    // Drop the new tables
    this.addSql(`drop table if exists "customer_activity_order" cascade;`);
    this.addSql(`drop table if exists "customer_activity" cascade;`);

    // Restore the old tier column
    this.addSql(`ALTER TABLE "membership" ADD COLUMN IF NOT EXISTS "tier" text DEFAULT 'premium';`);
    this.addSql(`ALTER TABLE "membership" ADD CONSTRAINT "membership_tier_check" CHECK ("tier" IN ('premium'));`);

    // Drop the new columns
    this.addSql(`ALTER TABLE "membership" DROP COLUMN IF EXISTS "tier_slug";`);
    this.addSql(`ALTER TABLE "membership" DROP COLUMN IF EXISTS "tier_updated_at";`);
  }

}
