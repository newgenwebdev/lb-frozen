import { Migration } from '@mikro-orm/migrations';

export class Migration20251113152407 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "membership" drop constraint if exists "membership_customer_id_unique";`);
    this.addSql(`create table if not exists "membership" ("id" text not null, "customer_id" text not null, "status" text check ("status" in ('active', 'cancelled')) not null default 'active', "tier" text check ("tier" in ('premium')) not null default 'premium', "activated_at" timestamptz not null, "stripe_payment_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "membership_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_membership_customer_id_unique" ON "membership" (customer_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_membership_deleted_at" ON "membership" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "membership" cascade;`);
  }

}
