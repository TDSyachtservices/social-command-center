-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'TIKTOK', 'WEBSITE');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PlatformPostStatus" AS ENUM ('PENDING', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'SKIPPED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('UPLOADED', 'PENDING', 'PROCESSING', 'READY', 'NEEDS_REVIEW', 'FAILED', 'NEEDS_EXTERNAL_PROCESSING');

-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('READY', 'WARNING', 'FAILED', 'NEEDS_REVIEW', 'NEEDS_EXTERNAL_PROCESSING');

-- CreateEnum
CREATE TYPE "CommentStatus" AS ENUM ('NEW', 'REPLIED', 'NEEDS_FOLLOW_UP', 'RESOLVED', 'HIDDEN', 'IGNORED', 'ESCALATED', 'FAILED_REPLY');

-- CreateEnum
CREATE TYPE "CommentPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT', 'SALES_OPPORTUNITY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "connectionStatus" TEXT NOT NULL DEFAULT 'not_connected',
    "lastSync" TIMESTAMP(3),
    "postingCapability" BOOLEAN NOT NULL DEFAULT false,
    "commentReadCapability" BOOLEAN NOT NULL DEFAULT false,
    "commentReplyCapability" BOOLEAN NOT NULL DEFAULT false,
    "moderationCapability" BOOLEAN NOT NULL DEFAULT false,
    "tokenEncrypted" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "scopes" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "originalFileType" TEXT NOT NULL,
    "originalMimeType" TEXT NOT NULL,
    "originalSizeBytes" BIGINT NOT NULL,
    "originalWidth" INTEGER,
    "originalHeight" INTEGER,
    "originalDurationSeconds" DOUBLE PRECISION,
    "originalStorageKey" TEXT,
    "originalPublicUrl" TEXT,
    "uploadedBy" TEXT,
    "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'UPLOADED',
    "qualityScoreLabel" TEXT,
    "validationStatus" "ValidationStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaVersion" (
    "id" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "placement" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "aspectRatio" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" BIGINT,
    "storageKey" TEXT,
    "publicUrl" TEXT,
    "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "cropMode" TEXT NOT NULL DEFAULT 'fit',
    "focalPointJson" JSONB,
    "safeZoneWarningsJson" JSONB,
    "qualityScore" DOUBLE PRECISION,
    "qualityScoreLabel" TEXT,
    "validationStatus" "ValidationStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "validationErrorsJson" JSONB,
    "validationWarningsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaProcessingJob" (
    "id" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "mediaVersionId" TEXT,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "masterCaption" TEXT NOT NULL,
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledPostPlatform" (
    "id" TEXT NOT NULL,
    "scheduledPostId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "status" "PlatformPostStatus" NOT NULL DEFAULT 'PENDING',
    "externalPostId" TEXT,
    "platformCaption" TEXT,
    "publishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledPostPlatform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishLog" (
    "id" TEXT NOT NULL,
    "scheduledPostId" TEXT,
    "postTitle" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "externalPostId" TEXT,
    "apiResponse" TEXT,
    "errorMessage" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublishLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialComment" (
    "id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "accountId" TEXT,
    "accountName" TEXT NOT NULL,
    "commenterName" TEXT NOT NULL,
    "commenterHandle" TEXT,
    "commentText" TEXT NOT NULL,
    "originalPostTitle" TEXT,
    "originalPostCaption" TEXT,
    "externalCommentId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "CommentStatus" NOT NULL DEFAULT 'NEW',
    "priority" "CommentPriority" NOT NULL DEFAULT 'NORMAL',
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "assignedUser" TEXT,
    "mediaUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialCommentReply" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "replyText" TEXT NOT NULL,
    "sentBy" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "externalReplyId" TEXT,
    "errorMessage" TEXT,

    CONSTRAINT "SocialCommentReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialInboxNote" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "noteText" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialInboxNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialInboxSyncLog" (
    "id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "accountId" TEXT,
    "actionType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "relatedPost" TEXT,
    "relatedCommenter" TEXT,
    "errorMessage" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialInboxSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- AddForeignKey
ALTER TABLE "MediaVersion" ADD CONSTRAINT "MediaVersion_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaProcessingJob" ADD CONSTRAINT "MediaProcessingJob_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaProcessingJob" ADD CONSTRAINT "MediaProcessingJob_mediaVersionId_fkey" FOREIGN KEY ("mediaVersionId") REFERENCES "MediaVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPost" ADD CONSTRAINT "ScheduledPost_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPostPlatform" ADD CONSTRAINT "ScheduledPostPlatform_scheduledPostId_fkey" FOREIGN KEY ("scheduledPostId") REFERENCES "ScheduledPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPostPlatform" ADD CONSTRAINT "ScheduledPostPlatform_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "SocialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishLog" ADD CONSTRAINT "PublishLog_scheduledPostId_fkey" FOREIGN KEY ("scheduledPostId") REFERENCES "ScheduledPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialComment" ADD CONSTRAINT "SocialComment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "SocialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialCommentReply" ADD CONSTRAINT "SocialCommentReply_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "SocialComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialInboxNote" ADD CONSTRAINT "SocialInboxNote_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "SocialComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialInboxSyncLog" ADD CONSTRAINT "SocialInboxSyncLog_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "SocialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
