import { Migration } from '@mikro-orm/migrations';

export class Migration20251207182954 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "coupon" drop constraint if exists "coupon_code_unique";`);
    this.addSql(`create table if not exists "coupon" ("id" text not null, "code" text not null, "name" text not null, "type" text check ("type" in ('percentage', 'fixed')) not null default 'percentage', "value" integer not null default 0, "currency_code" text not null default 'MYR', "status" text check ("status" in ('active', 'non-active')) not null default 'active', "starts_at" timestamptz null, "ends_at" timestamptz null, "usage_limit" integer null, "usage_count" integer not null default 0, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "coupon_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_coupon_code_unique" ON "coupon" (code) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_coupon_deleted_at" ON "coupon" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pwp_rule" ("id" text not null, "name" text not null, "rule_description" text not null, "trigger_type" text check ("trigger_type" in ('product', 'cart_value')) not null default 'product', "trigger_product_id" text null, "trigger_cart_value" integer null, "reward_product_id" text null, "reward_type" text check ("reward_type" in ('percentage', 'fixed')) not null default 'percentage', "reward_value" integer not null default 0, "status" text check ("status" in ('active', 'non-active')) not null default 'active', "starts_at" timestamptz null, "ends_at" timestamptz null, "usage_limit" integer null, "redemption_count" integer not null default 0, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pwp_rule_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pwp_rule_deleted_at" ON "pwp_rule" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "coupon" cascade;`);

    this.addSql(`drop table if exists "pwp_rule" cascade;`);
  }

}
