-- Per-platform caption overrides should survive save → edit even before the
-- user has connected a social account.  Making accountId optional allows the
-- route to create a "caption-only" platform row with accountId = NULL; the
-- publisher skips such rows (no token to use) but the caption is preserved in
-- the DB so the editor can reload it on the next open.

-- Drop the existing NOT NULL constraint and required FK.
ALTER TABLE "ScheduledPostPlatform" ALTER COLUMN "accountId" DROP NOT NULL;

-- Replace the strict FK (DELETE RESTRICT) with a nullable one (SET NULL).
-- This prevents orphaned rows if the account is deleted later.
ALTER TABLE "ScheduledPostPlatform" DROP CONSTRAINT "ScheduledPostPlatform_accountId_fkey";
ALTER TABLE "ScheduledPostPlatform" ADD CONSTRAINT "ScheduledPostPlatform_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "SocialAccount"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
