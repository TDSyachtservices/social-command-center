-- Per-platform media override: each platform row can carry its own photo/video,
-- falling back to the post-level ScheduledPost.mediaUrl when null.
ALTER TABLE "ScheduledPostPlatform" ADD COLUMN     "mediaUrl" TEXT;
ALTER TABLE "ScheduledPostPlatform" ADD COLUMN     "mediaType" TEXT;
