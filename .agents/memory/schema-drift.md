---
name: Schema drift & migration strategy
description: How to handle Prisma schema drift between local DB and migration history, and ensure Railway deployments get new tables
---

## Rule
When the local dev DB has tables that don't exist in migration history (drift), use `prisma db push` locally to sync. But always create a **manual migration SQL file** in `server/prisma/migrations/<timestamp>_<name>/migration.sql` so Railway's `prisma migrate deploy` picks up the new tables on the next deploy.

**Why:** `prisma migrate dev` fails with drift (blocks on tables not in history). `prisma db push --accept-data-loss` works locally but doesn't write migration files. Railway's start command runs `prisma migrate deploy && node dist/index.js` — so without a migration file, new Prisma models never get created on the production DB, and the server crashes querying non-existent tables.

**How to apply:**
1. Add new Prisma models to `server/prisma/schema.prisma`
2. Run `prisma db push` locally to sync the dev DB
3. Hand-write the migration SQL and save to `server/prisma/migrations/<YYYYMMDD000000>_<name>/migration.sql`
4. Include the migration file in the GitHub push (it must reach Railway main to be deployed)
5. After Railway deploys, verify new tables exist by hitting a new endpoint or checking health

## Resolved (2026-07-07)
- `HashtagSet`, `MentionContact`, `MentionGroup` — now proper Prisma models with a real migration (`20260707000000_add_hashtag_mention_tables`, PascalCase tables) applied to the Railway prod DB. If legacy snake_case `hashtag_sets`/`mention_contacts`/`mention_groups` tables exist anywhere from old drizzle `db push`, they are orphaned/unused by the Prisma server — safe to ignore or drop.
