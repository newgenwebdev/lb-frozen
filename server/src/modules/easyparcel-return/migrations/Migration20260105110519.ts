import { Migration } from '@mikro-orm/migrations';

export class Migration20260105110519 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "easyparcel_return" ("id" text not null, "return_id" text not null, "order_id" text not null, "order_no" text null, "parcel_no" text null, "awb" text null, "service_id" text not null, "service_name" text not null, "courier_id" text not null, "courier_name" text not null, "weight" real not null, "rate" integer not null, "pickup_date" text null, "pickup_time" text null, "sender_name" text not null, "sender_phone" text not null, "sender_address" text not null, "sender_postcode" text not null, "sender_country" text not null default 'SG', "receiver_name" text not null, "receiver_phone" text not null, "receiver_address" text not null, "receiver_postcode" text not null, "receiver_country" text not null default 'SG', "status" text not null default 'rate_checked', "tracking_url" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "easyparcel_return_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_easyparcel_return_deleted_at" ON "easyparcel_return" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "easyparcel_return" cascade;`);
  }

}
