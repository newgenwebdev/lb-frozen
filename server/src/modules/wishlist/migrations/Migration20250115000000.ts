import { Migration } from "@mikro-orm/migrations"

export class Migration20250115000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table if not exists "wishlist" (
        "id" text not null,
        "customer_id" text not null,
        "product_id" text not null,
        "variant_id" text,
        "title" text not null,
        "thumbnail" text,
        "price" numeric not null,
        "original_price" numeric,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz,
        constraint "wishlist_pkey" primary key ("id"),
        constraint "wishlist_customer_product_unique" unique ("customer_id", "product_id")
      );
    `)

    this.addSql(`
      create index if not exists "IDX_wishlist_customer_id" on "wishlist" ("customer_id");
    `)

    this.addSql(`
      create index if not exists "IDX_wishlist_product_id" on "wishlist" ("product_id");
    `)
  }

  async down(): Promise<void> {
    this.addSql(`
      drop table if exists "wishlist" cascade;
    `)
  }
}
