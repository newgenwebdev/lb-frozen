import { Migration } from '@mikro-orm/migrations';

export class Migration20251129120000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "return_request" (
      "id" text not null,
      "order_id" text not null,
      "customer_id" text not null,
      "status" text check ("status" in ('requested', 'approved', 'rejected', 'in_transit', 'received', 'inspecting', 'completed', 'cancelled')) not null default 'requested',
      "return_type" text check ("return_type" in ('refund', 'replacement')) not null default 'refund',
      "reason" text check ("reason" in ('defective', 'wrong_item', 'not_as_described', 'changed_mind', 'other')) not null,
      "reason_details" text null,
      "items" jsonb not null,
      "refund_amount" numeric not null default 0,
      "shipping_refund" numeric not null default 0,
      "total_refund" numeric not null default 0,
      "return_tracking_number" text null,
      "return_courier" text null,
      "requested_at" timestamptz not null,
      "approved_at" timestamptz null,
      "rejected_at" timestamptz null,
      "received_at" timestamptz null,
      "completed_at" timestamptz null,
      "admin_notes" text null,
      "rejection_reason" text null,
      "refund_status" text check ("refund_status" in ('pending', 'processing', 'completed', 'failed')) null,
      "stripe_refund_id" text null,
      "refunded_at" timestamptz null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "deleted_at" timestamptz null,
      constraint "return_request_pkey" primary key ("id")
    );`);

    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_return_request_order_id" ON "return_request" (order_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_return_request_customer_id" ON "return_request" (customer_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_return_request_status" ON "return_request" (status) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_return_request_deleted_at" ON "return_request" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "return_request" cascade;`);
  }

}
