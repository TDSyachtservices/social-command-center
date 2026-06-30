---
name: Facebook posting permissions
description: Why a "connected" Facebook account can still fail to publish, and what unblocks it
---

## The core gotcha
A Facebook account can show `connectionStatus: "connected"` in the app yet fail every publish or reply with Graph API error `(#200) Permissions error`.

**Why:** Posting to a Page and replying to comments each need specific permissions baked into the *page access token*:
- **Publishing posts** → `pages_manage_posts`
- **Replying to comments** → `pages_manage_engagement` (NOT `pages_manage_comments` — that standalone permission no longer exists in Meta's API)

Two independent things must both be true:
1. The Meta app must be a **Business-type** app with the Pages capability — only then do these permissions exist for the app.
2. The user must complete an OAuth **reconnect** so a fresh page token is issued *with that scope granted*.

## Changing the app does not refresh the token
Swapping `META_CLIENT_ID` / `META_CLIENT_SECRET` (e.g. moving to a new Business app) does NOT update the page token already stored in the DB. The stored token is app-specific and was minted by the old app.

**How to apply:** After any change to the Meta app or its permissions, the user MUST disconnect → reconnect the Facebook account in the app. Verify by checking the account's `scopes` array and `lastSync` via `GET /api/accounts` — if `scopes` still lacks `pages_manage_posts` or `lastSync` predates the change, they have not reconnected.

## Trust granted scopes, not requested scopes
The OAuth consent screen lets the user deselect permissions, so the scopes you *request* are not necessarily *granted*. The callback should call `/me/permissions` (`getGrantedPermissions`) and derive `postingCapability` etc. from the granted set, storing the granted scopes — not the requested `FB_SCOPES`. This surfaces "connected but can't post" in the UI instead of failing silently at publish time.

## Diagnosing publish failures
The server records every attempt in the `PublishLog` table. Fetch `GET /api/logs/publish?limit=N` to read the exact Graph API error (`errorMessage` / `apiResponse`) without needing Railway log access.
