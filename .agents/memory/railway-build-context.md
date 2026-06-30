---
name: Railway build context & builder
description: How Railway builds the social-command-center /server, why Dockerfile COPY paths must be unprefixed, and the railway.json-vs-dashboard builder override.
---

# Railway build context & builder (server/)

The Railway service for this project deploys the standalone `/server` Express+Prisma API.

## Confirmed settings (verified with the user)
- **Deploy branch: `main`** (the repo default branch).
- **Builder: `Dockerfile`** (set in the Railway dashboard, Settings → Build).
- **rootDirectory: `/server`**, so the **Docker build context is `server/` itself**, NOT the repo root.

## The two non-obvious traps

1. **Dashboard Builder overrides `railway.json`.**
   `server/railway.json` declares `"builder": "RAILPACK"`, but the dashboard Builder
   is set to `Dockerfile`, and the dashboard wins. So Railway always uses the
   Dockerfile regardless of what `railway.json` says. Don't trust `railway.json`'s
   builder field to reflect reality — confirm the dashboard setting.

2. **Dockerfile COPY paths must have NO `server/` prefix.**
   Because the build context is already `server/`, a `COPY server/package*.json ./`
   resolves to `server/server/package.json` and fails at the COPY step (this was the
   long-standing build failure). Correct form mirrors the proven `backend-foundation`
   Dockerfile: `COPY package*.json ./`, `COPY . .`, then `npm run build`.

**Why:** rootDirectory scopes the build context; people assume context = repo root and
prefix paths, which silently breaks only on Railway (works in a root-context Docker build).

**How to apply:** when editing `server/Dockerfile`, keep all COPY sources relative to
`server/` (unprefixed). A committed `server/dist/` is harmless — `npm run build`
recompiles it during the image build.

## Deploy-not-updating gotcha
Pushing commits to GitHub `main` via the Git Data API should fire Railway's deploy
webhook, but if the live `/api/health` never changes after a push, have the user
manually click **Deploy** in Railway → Deployments and read the **Build Logs** — that
is the only place the real failure (COPY / npm / tsc / prisma migrate / healthcheck)
is visible from outside.
