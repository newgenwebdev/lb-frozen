import { Migration } from '@mikro-orm/migrations';

export class Migration20251221000000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "article" (
        "id" text not null,
        "title" text not null,
        "slug" text not null,
        "content" text not null,
        "excerpt" text null,
        "thumbnail" text null,
        "category" text null,
        "tags" jsonb not null default '[]',
        "author" text null,
        "status" text check ("status" in ('draft', 'published')) not null default 'draft',
        "featured" boolean not null default false,
        "published_at" timestamptz null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "article_pkey" primary key ("id")
      );
    `);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_article_slug" ON "article" (slug) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_article_deleted_at" ON "article" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_article_status" ON "article" (status);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_article_category" ON "article" (category);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_article_featured" ON "article" (featured);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_article_published_at" ON "article" (published_at);`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "article" cascade;`);
  }

}
