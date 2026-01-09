import { Migration } from '@mikro-orm/migrations';

export class Migration20251218065848 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "membership_promo" ("id" text not null, "name" text not null, "description" text null, "start_date" timestamptz not null, "end_date" timestamptz not null, "status" text check ("status" in ('active', 'non-active')) not null default 'active', "discount_type" text check ("discount_type" in ('percentage', 'fixed')) not null default 'percentage', "discount_value" numeric not null default 0, "minimum_purchase" numeric null, "raw_discount_value" jsonb not null, "raw_minimum_purchase" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "membership_promo_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_membership_promo_deleted_at" ON "membership_promo" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "membership_promo" cascade;`);
  }

}
