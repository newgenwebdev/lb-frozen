import { Migration } from '@mikro-orm/migrations';

export class Migration20250115000000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "banner" ("id" text not null, "announcement_text" text not null, "link" text null, "start_date" timestamptz not null, "end_date" timestamptz not null, "background_color" text not null default '#007AFF', "text_color" text not null default '#FFFFFF', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "banner_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_banner_deleted_at" ON "banner" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_banner_start_date" ON "banner" (start_date);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_banner_end_date" ON "banner" (end_date);`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "banner" cascade;`);
  }

}

