-- These columns were added to the Prisma schema without migration files.
-- Using IF NOT EXISTS so this is safe to run on databases that already have
-- them (e.g. via a previous db push) and on fresh Railway databases that only
-- have the init migration applied.

ALTER TABLE "ScheduledPost" ADD COLUMN IF NOT EXISTS "postType"             TEXT         NOT NULL DEFAULT 'standard';
ALTER TABLE "ScheduledPost" ADD COLUMN IF NOT EXISTS "additionalMediaUrls"  TEXT[]       NOT NULL DEFAULT '{}';
ALTER TABLE "ScheduledPost" ADD COLUMN IF NOT EXISTS "postMetadataJson"     JSONB;

-- additionalMediaUrls on the platform row was also missing from all migrations.
ALTER TABLE "ScheduledPostPlatform" ADD COLUMN IF NOT EXISTS "additionalMediaUrls" TEXT[];
