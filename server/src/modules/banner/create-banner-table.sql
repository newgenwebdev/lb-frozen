-- Create banner table for pgAdmin
-- This SQL script creates the banner table with all required fields and indexes

-- Drop table if exists (optional - remove if you want to keep existing data)
-- DROP TABLE IF EXISTS "banner" CASCADE;

-- Create banner table
CREATE TABLE IF NOT EXISTS "banner" (
  "id" TEXT NOT NULL,
  "announcement_text" TEXT NOT NULL,
  "link" TEXT NULL,
  "start_date" TIMESTAMPTZ NOT NULL,
  "end_date" TIMESTAMPTZ NOT NULL,
  "background_color" TEXT NOT NULL DEFAULT '#007AFF',
  "text_color" TEXT NOT NULL DEFAULT '#FFFFFF',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deleted_at" TIMESTAMPTZ NULL,
  CONSTRAINT "banner_pkey" PRIMARY KEY ("id")
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "IDX_banner_deleted_at" 
  ON "banner" (deleted_at) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS "IDX_banner_start_date" 
  ON "banner" (start_date);

CREATE INDEX IF NOT EXISTS "IDX_banner_end_date" 
  ON "banner" (end_date);

-- Add comment to table
COMMENT ON TABLE "banner" IS 'Stores announcement banners with text, links, dates, and color settings';

-- Add comments to columns
COMMENT ON COLUMN "banner"."id" IS 'Primary key identifier';
COMMENT ON COLUMN "banner"."announcement_text" IS 'The announcement text to display';
COMMENT ON COLUMN "banner"."link" IS 'Optional URL link for the banner';
COMMENT ON COLUMN "banner"."start_date" IS 'Start date when banner becomes active';
COMMENT ON COLUMN "banner"."end_date" IS 'End date when banner expires';
COMMENT ON COLUMN "banner"."background_color" IS 'Background color in hex format (e.g. #007AFF)';
COMMENT ON COLUMN "banner"."text_color" IS 'Text color in hex format (e.g. #FFFFFF)';
COMMENT ON COLUMN "banner"."created_at" IS 'Timestamp when banner was created';
COMMENT ON COLUMN "banner"."updated_at" IS 'Timestamp when banner was last updated';
COMMENT ON COLUMN "banner"."deleted_at" IS 'Timestamp when banner was soft deleted (NULL if not deleted)';

