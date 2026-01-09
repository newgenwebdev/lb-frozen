import { Migration } from '@mikro-orm/migrations';

export class Migration20251222120001 extends Migration {

  override async up(): Promise<void> {
    // Update the CHECK constraint on the type column to include new transaction types
    // First drop the existing constraint, then add the new one with all values
    this.addSql(`
      ALTER TABLE "points_transaction"
      DROP CONSTRAINT IF EXISTS "points_transaction_type_check";
    `);

    this.addSql(`
      ALTER TABLE "points_transaction"
      ADD CONSTRAINT "points_transaction_type_check"
      CHECK ("type" IN ('earned', 'redeemed', 'admin_added', 'admin_removed', 'return_deducted', 'return_restored', 'cancel_deducted', 'cancel_restored'));
    `);
  }

  override async down(): Promise<void> {
    // Restore the original CHECK constraint
    this.addSql(`
      ALTER TABLE "points_transaction"
      DROP CONSTRAINT IF EXISTS "points_transaction_type_check";
    `);

    this.addSql(`
      ALTER TABLE "points_transaction"
      ADD CONSTRAINT "points_transaction_type_check"
      CHECK ("type" IN ('earned', 'redeemed', 'admin_added', 'admin_removed'));
    `);
  }

}
