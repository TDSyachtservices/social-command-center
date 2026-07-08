---
name: Railway single-image full-stack deploy
description: How production serves BOTH the React SPA and the Express API from one Railway service/domain, and the hard constraints behind the Docker build.
---

# Single Railway image: SPA + API on one domain

Production is ONE Railway service that serves the built React frontend AND the
Express API from the same domain. The root `Dockerfile` (repo-root build context)
is a 3-stage build; `server/src/app.ts` serves the SPA as static files.

## Hard constraints (non-obvious)

- **Web/frontend build stage MUST be glibc (node:22-slim), NOT Alpine/musl.**
  `pnpm-workspace.yaml` `overrides` map every `*-musl` native binary
  (`lightningcss`, `@tailwindcss/oxide`, `rollup`) to `"-"`. On musl the Vite +
  Tailwind v4 build installs no usable native binary and fails. glibc x64 works
  (linux-x64-gnu binaries are kept).
- **Server stays Alpine + npm.** `server/` is a standalone npm package (NOT in
  the pnpm workspace) whose `package-lock.json` points at the internal Replit
  registry Railway can't reach — copy `package.json` only and `npm install` fresh.
- **`vite.config.ts` throws without `PORT` and `BASE_PATH`, even for `build`.**
  Web stage sets `PORT=3000 BASE_PATH=/` (SPA at domain root).
- **`VITE_API_BASE_URL` is baked at build time** via Docker `ARG` (defaults to the
  Railway domain → same origin, no CORS). Empty `VITE_API_BASE_URL` makes the
  frontend fall back to MOCK mode (see `api.ts`), so it must be set for prod.
  A future custom domain needs a rebuild with a new `--build-arg`.
- Static serving in `app.ts` is guarded by `existsSync(cwd/public/index.html)` so
  dev and any server-only build fall through untouched (backward compatible).
  SPA fallback is plain middleware (GET/HEAD, non-`/api`) — no path patterns
  (Express 5 / path-to-regexp v8 rejects bare `*`).

## Cutover (Railway dashboard — overrides railway.toml)

**Why:** dashboard Builder/Root Directory settings override the repo's
railway.toml, so the code changes alone don't switch the build.

**How to apply:**
1. Root Directory: `/server` → repo root (blank).
2. Dockerfile path: `Dockerfile` (root).
3. Set `FRONTEND_URL` env to the Railway domain — OAuth callbacks redirect to
   `${FRONTEND_URL}/connected-accounts`; unset ⇒ redirects to localhost:5173.
   `FRONTEND_URL`/`CORS_ORIGINS` are ALSO the CORS allowlist (see below).
4. Keep the Volume mounted at `/app/uploads`; healthcheck stays `/api/health`.

## CORS / blank-screen constraint (see cors-crossorigin-asset-500.md)

`app.ts` CORS now always-allows `*.railway.app`, so the default Railway domain
works with no env config. A **custom domain** is NOT covered by that suffix — you
must add it to `FRONTEND_URL`/`CORS_ORIGINS`, not just rebuild with a new
`VITE_API_BASE_URL`, or the crossorigin JS/CSS assets are refused and the page
goes blank. The reject branch uses `cb(null,false)` (never throws) so a bad origin
can no longer 500 the whole response.

`server/Dockerfile` is kept for backward compat during the transition; it becomes
dormant once Root Directory is the repo root and can be deleted later.
