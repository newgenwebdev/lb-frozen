import { Migration } from '@mikro-orm/migrations';

export class Migration20251113152408 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "points_balance" drop constraint if exists "points_balance_customer_id_unique";`);
    this.addSql(`create table if not exists "points_balance" ("id" text not null, "customer_id" text not null, "balance" numeric not null default 0, "total_earned" numeric not null default 0, "total_redeemed" numeric not null default 0, "raw_balance" jsonb not null, "raw_total_earned" jsonb not null, "raw_total_redeemed" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "points_balance_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_points_balance_customer_id_unique" ON "points_balance" (customer_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_points_balance_deleted_at" ON "points_balance" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "points_config" ("id" text not null, "earning_type" text check ("earning_type" in ('percentage', 'per_product')) not null default 'percentage', "earning_rate" integer not null default 5, "redemption_rate" integer not null default 0.01, "is_enabled" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "points_config_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_points_config_deleted_at" ON "points_config" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "points_transaction" ("id" text not null, "customer_id" text not null, "type" text check ("type" in ('earned', 'redeemed', 'admin_added', 'admin_removed')) not null, "amount" numeric not null, "order_id" text null, "reason" text not null, "balance_after" numeric not null, "created_by" text null, "raw_amount" jsonb not null, "raw_balance_after" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "points_transaction_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_points_transaction_deleted_at" ON "points_transaction" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "points_balance" cascade;`);

    this.addSql(`drop table if exists "points_config" cascade;`);

    this.addSql(`drop table if exists "points_transaction" cascade;`);
  }

}
