---
name: Dual backend parity
description: The app has two separate backends serving the same frontend; a resource in one but not the other breaks in that environment.
---

## Rule
Social Command Center has TWO independent backends serving the same React frontend:
- DEV (Replit): `artifacts/api-server` — Express + Drizzle + `@workspace/db`, proxied at `/api`.
- PROD (Railway): standalone `/server` — Express 5 + Prisma + PostgreSQL, single-image deploy serving SPA + API from one origin.

Any API resource (route + data model) must be implemented in BOTH backends or it works in one environment and 404s in the other.

**Why:** The frontend stores and `api.ts` call relative `/api/...` paths. In dev those hit the Drizzle api-server; in prod they hit the Prisma `/server`. hashtag-sets / mention-contacts / mention-groups existed only in the Drizzle backend, so both the Hashtag and Mention libraries 404'd in production while working perfectly in dev.

**How to apply:**
- When adding or changing an `/api/*` resource, mirror it in both: Drizzle schema + route in `artifacts/api-server`, AND Prisma model + migration + route in `/server`.
- JSON response field names must match across both (frontend expects camelCase). Prisma field names = JSON keys; keep them equal to the Drizzle camelCase columns.
- Fast parity check: `rg` the route path in both `artifacts/api-server/src/routes` and `server/src/routes`, and curl the live prod URL (`/api/<resource>`) — a `404 {"code":"NOT_FOUND"}` there with a `200` in dev is the signature of this gap.
