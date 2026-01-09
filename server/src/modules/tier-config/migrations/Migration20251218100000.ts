import { Migration } from '@mikro-orm/migrations';

export class Migration20251218100000 extends Migration {

  override async up(): Promise<void> {
    // Create tier_config table
    this.addSql(`
      create table if not exists "tier_config" (
        "id" text not null,
        "name" text not null,
        "slug" text not null,
        "rank" integer not null default 0,
        "order_threshold" integer not null default 0,
        "spend_threshold" numeric not null default 0,
        "points_multiplier" numeric not null default 1,
        "discount_percentage" integer not null default 0,
        "birthday_voucher_amount" numeric not null default 0,
        "is_default" boolean not null default false,
        "is_active" boolean not null default true,
        "raw_spend_threshold" jsonb not null default '{}',
        "raw_birthday_voucher_amount" jsonb not null default '{}',
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "tier_config_pkey" primary key ("id")
      );
    `);

    // Create unique index on slug
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tier_config_slug_unique" ON "tier_config" (slug) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tier_config_deleted_at" ON "tier_config" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tier_config_rank" ON "tier_config" (rank);`);

    // Insert default tiers: Classic, Silver, Gold, Platinum
    this.addSql(`
      INSERT INTO "tier_config" (
        "id", "name", "slug", "rank",
        "order_threshold", "spend_threshold",
        "points_multiplier", "discount_percentage", "birthday_voucher_amount",
        "is_default", "is_active",
        "raw_spend_threshold", "raw_birthday_voucher_amount"
      )
      VALUES
        (
          'tier_' || substr(md5(random()::text), 1, 24),
          'Classic', 'classic', 0,
          0, 0,
          1, 0, 0,
          true, true,
          '{"value": "0", "precision": 20}', '{"value": "0", "precision": 20}'
        ),
        (
          'tier_' || substr(md5(random()::text), 1, 24),
          'Silver', 'silver', 1,
          3, 50000,
          1.5, 5, 500,
          false, true,
          '{"value": "50000", "precision": 20}', '{"value": "500", "precision": 20}'
        ),
        (
          'tier_' || substr(md5(random()::text), 1, 24),
          'Gold', 'gold', 2,
          6, 100000,
          2, 10, 1000,
          false, true,
          '{"value": "100000", "precision": 20}', '{"value": "1000", "precision": 20}'
        ),
        (
          'tier_' || substr(md5(random()::text), 1, 24),
          'Platinum', 'platinum', 3,
          12, 200000,
          3, 15, 2000,
          false, true,
          '{"value": "200000", "precision": 20}', '{"value": "2000", "precision": 20}'
        )
      ON CONFLICT DO NOTHING;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "tier_config" cascade;`);
  }

}
