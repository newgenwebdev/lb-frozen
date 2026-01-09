-- SQL script to manually create the shipment table in pgAdmin
-- This matches the migration file: Migration20250116000000.ts

CREATE TABLE IF NOT EXISTS "shipment" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "base_rate" NUMERIC NOT NULL,
  "eta" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Active',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deleted_at" TIMESTAMPTZ NULL,
  CONSTRAINT "shipment_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "IDX_shipment_deleted_at" ON "shipment" (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS "IDX_shipment_status" ON "shipment" (status);

-- Add comments for documentation
COMMENT ON TABLE "shipment" IS 'Stores shipment methods with name, base rate, ETA, and status';
COMMENT ON COLUMN "shipment"."id" IS 'Unique identifier for the shipment';
COMMENT ON COLUMN "shipment"."name" IS 'Shipment name (e.g., Standard Shipping, Express Shipping)';
COMMENT ON COLUMN "shipment"."base_rate" IS 'Base shipping rate (numeric value)';
COMMENT ON COLUMN "shipment"."eta" IS 'Estimated time of arrival (e.g., "2-3 days", "1-2 days")';
COMMENT ON COLUMN "shipment"."status" IS 'Shipment status: "Active" or "Non Active"';
COMMENT ON COLUMN "shipment"."created_at" IS 'Timestamp when the shipment was created';
COMMENT ON COLUMN "shipment"."updated_at" IS 'Timestamp when the shipment was last updated';
COMMENT ON COLUMN "shipment"."deleted_at" IS 'Soft delete timestamp (NULL if not deleted)';

