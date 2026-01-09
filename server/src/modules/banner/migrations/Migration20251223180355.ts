import { Migration } from '@mikro-orm/migrations';

export class Migration20251223180355 extends Migration {

  override async up(): Promise<void> {
    // Add is_enabled column to existing banner table
    this.addSql(`ALTER TABLE "banner" ADD COLUMN IF NOT EXISTS "is_enabled" boolean NOT NULL DEFAULT true;`);
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "banner" DROP COLUMN IF EXISTS "is_enabled";`);
  }

}
