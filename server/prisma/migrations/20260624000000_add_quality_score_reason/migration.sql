-- Add qualityScoreReason to MediaVersion for AI vision scoring explanation
ALTER TABLE "MediaVersion" ADD COLUMN "qualityScoreReason" TEXT;
