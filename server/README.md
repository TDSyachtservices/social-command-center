# Social Command Center — API Server

Express 5 + Prisma + PostgreSQL backend for the Social Command Center.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in values
cp .env.example .env

# 3. Generate Prisma client
npm run prisma:generate

# 4. Run migrations (dev)
npm run prisma:migrate

# 5. Seed the database
npm run prisma:seed

# 6. Start the dev server
npm run dev
```

The server starts on `http://localhost:3001` by default.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Start production server from `dist/` |
| `npm run typecheck` | Type-check without emitting |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run pending migrations (dev) |
| `npm run prisma:migrate:prod` | Deploy migrations (production) |
| `npm run prisma:seed` | Seed with demo data |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run prisma:reset` | Reset + re-seed database |

## API Routes

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check + DB ping |
| GET/POST | `/api/posts` | List / create posts |
| GET/PATCH/DELETE | `/api/posts/:id` | Get / update / delete post |
| POST | `/api/posts/:id/retry` | Retry failed post |
| GET/POST | `/api/accounts` | List / create connected accounts |
| PATCH/DELETE | `/api/accounts/:id` | Update / remove account |
| POST | `/api/accounts/:id/disconnect` | Revoke account connection |
| POST | `/api/scheduler/publish-now` | Immediate publish trigger |
| POST | `/api/scheduler/schedule` | Schedule a post |
| POST | `/api/scheduler/cancel` | Cancel a scheduled post |
| GET | `/api/scheduler/queue` | Upcoming scheduled posts |
| POST | `/api/scheduler/webhooks/n8n` | N8N webhook receiver |
| GET | `/api/inbox` | List social comments |
| GET | `/api/inbox/:id` | Get single comment |
| PATCH | `/api/inbox/:id` | Update status/priority/assignment |
| POST | `/api/inbox/:id/replies` | Send reply |
| POST | `/api/inbox/:id/notes` | Add internal note |
| GET | `/api/logs/publish` | Publish logs |
| GET | `/api/logs/comment` | Comment/sync logs |
| GET/PUT | `/api/settings/:key` | Get / upsert setting key |
| PATCH | `/api/settings` | Bulk update settings |
| POST | `/api/ai/generate-caption` | AI caption generation |
| POST | `/api/ai/improve-caption` | AI caption improvement |
| GET | `/api/ai/status` | AI endpoint connectivity |
| GET | `/api/media` | List media assets |
| GET | `/api/media/:id` | Get media asset + versions |
| POST | `/api/media/upload-intent` | Register upload intent |
| POST | `/api/media/:id/process` | Trigger media processing |
| DELETE | `/api/media/:id` | Delete media asset |
| GET | `/api/website/posts` | CMS-ready published posts |
| POST | `/api/website/webhook` | Website webhook receiver |

## Environment Variables

See `.env.example` for all options.

**Required for production:**
- `DATABASE_URL` — PostgreSQL connection string
- `FRONTEND_URL` — Comma-separated frontend origin(s) for CORS
- `INTERNAL_API_KEY` — Key for internal/webhook routes
- `NODE_ENV=production`

## Deploy to Railway

1. Create a new Railway project
2. Add a PostgreSQL service
3. Add this `/server` directory as a service (Dockerfile build)
4. Set `DATABASE_URL` from the PostgreSQL service
5. Set `FRONTEND_URL` to your frontend Railway domain
6. Set `INTERNAL_API_KEY`, `N8N_WEBHOOK_SECRET`, and `TOKEN_ENCRYPTION_KEY`
7. Railway will run `prisma migrate deploy && node dist/index.js` on start

## Database Schema

14 Prisma models covering:
- `User` — Admin users
- `SocialAccount` — Connected platform accounts
- `MediaAsset` + `MediaVersion` + `MediaProcessingJob` — Media pipeline
- `ScheduledPost` + `ScheduledPostPlatform` — Post scheduling
- `PublishLog` — Publishing audit trail
- `SocialComment` + `SocialCommentReply` + `SocialInboxNote` — Social inbox
- `SocialInboxSyncLog` — Comment sync audit trail
- `Setting` — Key/value app settings
- `AuditLog` — General audit log

## Social Platform Adapters

All adapters in `src/adapters/` are **mock implementations** in this phase.
They log warnings and return mock success responses. Real OAuth tokens and
platform API calls will be wired once token storage is implemented.

Adapters: `facebook.ts`, `instagram.ts`, `linkedin.ts`, `tiktok.ts`, `website.ts`
