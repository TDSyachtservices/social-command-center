-- Hashtag & mention libraries. These resources existed only in the Replit dev
-- backend (Drizzle) and were never ported to this production Prisma server, so
-- the frontend's /api/hashtag-sets, /api/mention-contacts and /api/mention-groups
-- calls 404'd in production. Additive CREATE TABLE IF NOT EXISTS — safe to run on
-- fresh and existing Railway databases.

-- CreateTable
CREATE TABLE IF NOT EXISTS "HashtagSet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platforms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "hashtags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HashtagSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MentionContact" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "platforms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "handles" JSONB NOT NULL DEFAULT '{}',
    "linkedinUrn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentionContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MentionGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "platforms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentionGroup_pkey" PRIMARY KEY ("id")
);
