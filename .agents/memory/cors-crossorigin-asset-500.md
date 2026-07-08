---
name: CORS crossorigin asset 500 (blank SPA)
description: Why the single-origin SPA can render blank in prod — CORS rejection that throws 500s the app's own JS/CSS asset requests.
---

# CORS rejection throwing → 500 on assets → blank SPA

On the single Railway image (SPA + API on one origin), the production page can go
fully blank with an empty `#root` and NO JS error in the console.

## Root cause

Vite marks the built `<script>`/`<link>` tags `crossorigin`, so the browser sends
an `Origin` header even for these SAME-ORIGIN asset requests. If the Express CORS
`origin` callback rejects an origin by calling `cb(new Error(...))`, the `cors`
middleware routes that through `next(err)` → the global error handler → **HTTP 500
for the entire response, including the static JS/CSS**. The entry bundle never
loads, so React never mounts (and any client-side ErrorBoundary/window handlers
never run, hence a blank page with no visible error).

Same-origin API `fetch` GETs send NO `Origin` header, so they returned 200 — that
asymmetry (assets 500, API 200) is the tell.

**Why it hit prod only:** the reject branch is gated on `NODE_ENV==="production"`,
and the app's own Railway origin (`*.up.railway.app`) was not in the allowlist
(only localhost + `*.replit.*` + `FRONTEND_URL`/`CORS_ORIGINS`).

## The rule / fix

- In the CORS `origin` callback, **never `cb(new Error(...))`** — use
  `cb(null, false)` (omit CORS headers, still return the response). Throwing turns
  a policy decision into a 500 that blanks the whole app.
- **Always allow the app's own origin.** The fix added `origin.endsWith(".railway.app")`
  to the always-allowed list (mirrors the existing `.replit.*` entries), so assets
  get a correct `Access-Control-Allow-Origin`.

**Security tradeoff (documented, accepted for now):** the `.railway.app` suffix +
`credentials:true` reflects ACAO+credentials for ANY Railway tenant. Harmless while
the API has NO cookie/session auth. **If cookie/session auth is ever added, tighten
this to the exact origin** (or scope the `cors()` middleware to `/api/*` only so
static assets never go through CORS at all — the cleaner structural fix).

## How to debug this class fast

- Reproduce without a browser: `curl -H "Origin: <site-origin>" <asset-url>` — a 500
  only-with-Origin confirms it instantly (plain curl sends no Origin → 200, hiding it).
- `external_url` screenshots (Firecrawl) do NOT reliably run an SPA's JS — they show
  blank even when the site works. Use the `testing` skill's `runTest` pointed at the
  ABSOLUTE production URL to get the real Chromium console + failed-request list.
