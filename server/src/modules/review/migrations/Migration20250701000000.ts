import { Migration } from '@mikro-orm/migrations';

export class Migration20250701000000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "review" (
        "id" text not null,
        "product_id" text not null,
        "customer_id" text not null,
        "order_id" text null,
        "order_item_id" text null,
        "rating" integer not null,
        "title" text null,
        "content" text null,
        "images" jsonb not null default '{"items": []}',
        "is_verified_purchase" boolean not null default false,
        "is_approved" boolean not null default true,
        "is_featured" boolean not null default false,
        "helpful_count" integer not null default 0,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "review_pkey" primary key ("id")
      );
    `);
    
    // Indexes for efficient querying
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_product_id" ON "review" (product_id);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_customer_id" ON "review" (customer_id);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_order_id" ON "review" (order_id) WHERE order_id IS NOT NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_rating" ON "review" (rating);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_is_approved" ON "review" (is_approved);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_is_featured" ON "review" (is_featured);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_created_at" ON "review" (created_at);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_deleted_at" ON "review" (deleted_at) WHERE deleted_at IS NULL;`);
    
    // Composite index for product + approved (common query)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_product_approved" ON "review" (product_id, is_approved);`);
    
    // Unique constraint: one review per customer per product
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_review_customer_product_unique" ON "review" (customer_id, product_id) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "review" cascade;`);
  }

}
