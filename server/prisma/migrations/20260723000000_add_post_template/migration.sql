-- CreateTable
CREATE TABLE "PostTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "postType" TEXT NOT NULL DEFAULT 'standard',
    "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "masterCaption" TEXT NOT NULL DEFAULT '',
    "platformCaptionsJson" JSONB,
    "hashtagsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostTemplate_pkey" PRIMARY KEY ("id")
);
