import { Migration } from '@mikro-orm/migrations';

export class Migration20251128100731 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "order_extension" drop constraint if exists "order_extension_order_id_unique";`);
    this.addSql(`create table if not exists "order_extension" ("id" text not null, "order_id" text not null, "payment_status" text check ("payment_status" in ('awaiting', 'paid', 'refunded', 'partially_refunded')) not null default 'awaiting', "fulfillment_status" text check ("fulfillment_status" in ('unfulfilled', 'processing', 'shipped', 'delivered', 'cancelled')) not null default 'unfulfilled', "courier" text null, "tracking_number" text null, "shipped_at" timestamptz null, "delivered_at" timestamptz null, "estimated_delivery" timestamptz null, "paid_at" timestamptz null, "payment_method" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "order_extension_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_order_extension_order_id_unique" ON "order_extension" (order_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_extension_deleted_at" ON "order_extension" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "order_extension" cascade;`);
  }

}
