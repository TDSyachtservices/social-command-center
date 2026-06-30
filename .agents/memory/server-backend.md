---
name: Server backend structure
description: Architecture of the standalone /server backend for Social Command Center
---

## Rule
The backend lives in `/server` at the repo root — it is NOT a pnpm workspace package. It uses plain `npm install`.

**Why:** Railway deploys it as a self-contained Node service with its own `Dockerfile`. Keeping it outside the pnpm workspace avoids build conflicts with the Vite frontend.

## Key facts
- Framework: Express 5 (with `@types/express@5`)
- ORM: Prisma 6 (v6.19.3 generated); DB: PostgreSQL
- TypeScript: `tsconfig.json` targets Node 20, `module: NodeNext`
- Express 5 types: `req.params` is `string | string[]` — always use `Request<{ id: string }>` generic on parameterized route handlers
- All social platform adapters (`server/src/adapters/`) are MOCK — they log warnings and return success responses; no real OAuth/API calls
- Seed script: `server/prisma/seed.ts` — IDs like `"user_1"`, `"acc_fb"`, `"post_1"` match frontend mock data

## Deployment
- Backend: `server/Dockerfile` → Railway web service; runs `prisma migrate deploy && node dist/index.js`
- Frontend: `artifacts/social-command-center/railway.toml` → nixpacks static site; `pnpm run build && serve dist`
- Frontend reads `VITE_API_BASE_URL` at build time; falls back to mock data if unset or API unreachable

## Initial migration
`server/prisma/migrations/20260612000000_init/migration.sql` — generated via `prisma migrate diff --from-empty --to-schema-datamodel schema.prisma --script`
