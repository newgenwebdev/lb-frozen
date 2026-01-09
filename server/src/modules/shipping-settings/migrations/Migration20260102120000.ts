import { Migration } from '@mikro-orm/migrations';

export class Migration20260102120000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "shipping_setting" ("id" text not null, "sender_name" text not null, "sender_phone" text not null, "sender_address" text not null, "sender_unit" text null, "sender_postcode" text not null, "sender_country" text not null default 'SG', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "shipping_setting_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_shipping_setting_deleted_at" ON "shipping_setting" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "shipping_setting" cascade;`);
  }

}
