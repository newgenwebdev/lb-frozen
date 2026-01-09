import { Migration } from '@mikro-orm/migrations';

export class Migration20250116000000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "shipment" ("id" text not null, "name" text not null, "base_rate" numeric not null, "eta" text not null, "status" text not null default 'Active', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "shipment_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_shipment_deleted_at" ON "shipment" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_shipment_status" ON "shipment" (status);`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "shipment" cascade;`);
  }

}

