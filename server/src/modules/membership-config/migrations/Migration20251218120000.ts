import { Migration } from '@mikro-orm/migrations';

export class Migration20251218120000 extends Migration {

  override async up(): Promise<void> {
    // Create membership_config table
    this.addSql(`
      create table if not exists "membership_config" (
        "id" text not null,
        "program_type" text check ("program_type" in ('free', 'paid')) not null default 'free',
        "price" numeric not null default 0,
        "duration_months" integer null,
        "evaluation_period_months" integer not null default 12,
        "evaluation_trigger" text check ("evaluation_trigger" in ('on_order', 'daily', 'both')) not null default 'both',
        "auto_enroll_on_first_order" boolean not null default true,
        "is_enabled" boolean not null default true,
        "raw_price" jsonb not null default '{"value": "0", "precision": 20}',
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "membership_config_pkey" primary key ("id")
      );
    `);

    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_membership_config_deleted_at" ON "membership_config" (deleted_at) WHERE deleted_at IS NULL;`);

    // Insert default configuration
    this.addSql(`
      INSERT INTO "membership_config" (
        "id", "program_type", "price", "duration_months",
        "evaluation_period_months", "evaluation_trigger",
        "auto_enroll_on_first_order", "is_enabled",
        "raw_price"
      )
      VALUES (
        'memcfg_' || substr(md5(random()::text), 1, 24),
        'free', 0, null,
        12, 'both',
        true, true,
        '{"value": "0", "precision": 20}'
      )
      ON CONFLICT DO NOTHING;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "membership_config" cascade;`);
  }

}
