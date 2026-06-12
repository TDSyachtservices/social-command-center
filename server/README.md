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
| POST | `/api/accounts/connect-mock` | Create new mock-connected account |
| POST | `/api/accounts/:id/connect-mock` | Reconnect existing account (mock) |
| POST | `/api/accounts/:id/disconnect` | Revoke account connection |
| POST | `/api/scheduler/publish-now` | Immediate publish trigger |
| POST | `/api/scheduler/schedule` | Schedule a post |
| POST | `/api/scheduler/cancel` | Cancel a scheduled post |
| GET | `/api/scheduler/queue` | Upcoming scheduled posts |
| POST | `/api/scheduler/webhooks/n8n` | N8N webhook (requires x-internal-api-key) |
| GET | `/api/inbox` | List social comments |
| GET | `/api/inbox/:id` | Get single comment |
| PATCH | `/api/inbox/:id` | Update status/priority/assignment |
| PATCH | `/api/inbox/:id/hide` | Hide comment |
| PATCH | `/api/inbox/:id/assign` | Assign comment |
| POST | `/api/inbox/:id/replies` | Send reply |
| POST | `/api/inbox/:id/notes` | Add internal note |
| POST | `/api/inbox/sync-mock` | Trigger mock inbox sync |
| GET | `/api/inbox/sync-logs` | List inbox sync logs |
| GET | `/api/logs/publish` | Publish logs |
| GET | `/api/logs/comment` | Comment/sync logs |
| GET/PUT | `/api/settings/:key` | Get / upsert setting key |
| GET | `/api/settings` | All settings as key→value map |
| POST | `/api/ai/generate-caption` | AI caption generation |
| POST | `/api/ai/improve-caption` | AI caption improvement |
| GET | `/api/ai/status` | AI endpoint connectivity |
| GET | `/api/media` | List media assets |
| GET | `/api/media/:id` | Get media asset + versions |
| POST | `/api/media/upload-intent` | Register upload intent |
| POST | `/api/media/:id/process` | Trigger media processing |
| DELETE | `/api/media/:id` | Delete media asset |
| GET | `/api/website/posts` | CMS-ready published posts |
| POST | `/api/website/publish` | Publish post to website (`{ postId }`) |
| GET | `/api/website/status` | Website CMS connectivity check |

## Environment Variables

See `.env.example` for all options.

**Required for production:**

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `FRONTEND_URL` | Comma-separated frontend origin(s) for CORS (e.g. `https://your-frontend.up.railway.app`) |
| `INTERNAL_API_KEY` | Shared secret for internal/webhook routes (`x-internal-api-key` header) |
| `NODE_ENV` | Set to `production` |
| `PORT` | HTTP port (Railway injects this automatically) |
| `TOKEN_ENCRYPTION_KEY` | Key for encrypting stored OAuth tokens |

**Optional:**

| Variable | Description |
|---|---|
| `N8N_WEBHOOK_SECRET` | Legacy; replaced by `INTERNAL_API_KEY` for webhook auth |
| `AI_ENDPOINT` | Local AI model endpoint (e.g. `http://localhost:11434`) |

## Deploy to Railway — Two-Service Setup

This project deploys as **two separate Railway services** in one project:

### Service 1: PostgreSQL database
Add a Railway PostgreSQL plugin to the project. Railway injects `DATABASE_URL` automatically into services that reference it.

### Service 2: API server (`/server`)
1. Create a new Railway service and point it to the `/server` directory.
2. Railway detects the `Dockerfile` and builds automatically.
3. Set the following environment variables in the Railway dashboard for this service:

```
DATABASE_URL    = ${{Postgres.DATABASE_URL}}
FRONTEND_URL    = https://<your-frontend-domain>.up.railway.app
INTERNAL_API_KEY = <generate a strong random string>
TOKEN_ENCRYPTION_KEY = <generate a strong random string>
NODE_ENV        = production
```

> **Internal reference syntax:** Use `${{ServiceName.VARIABLE}}` to pull a variable from another Railway service in the same project. For example, `${{Postgres.DATABASE_URL}}` wires the database URL from the PostgreSQL plugin directly into the API server without copying secrets manually.

### Service 3: Frontend (static)
Deploy the Vite build output as a static site. Set:

```
VITE_API_BASE_URL = https://<your-api-server-domain>.up.railway.app
```

Build command: `pnpm --filter @workspace/social-command-center run build`  
Static directory: `artifacts/social-command-center/dist`

### Post-deploy
After first deploy, run migrations and seed from the Railway shell:

```bash
npm run prisma:migrate:prod
npm run prisma:seed
```

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
