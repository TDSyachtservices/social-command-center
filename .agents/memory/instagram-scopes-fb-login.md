---
name: Instagram scopes (Facebook-login path)
description: Which Instagram OAuth scopes this app must request, and what "Invalid Scopes" really means.
---

This app uses **"Instagram API with Facebook Login for Business"** — it logs in via
`facebook.com/dialog/oauth`, exchanges on `graph.facebook.com`, and reaches the linked
IG Business account through the **Page** token (`{page-id}?fields=instagram_business_account`).

For THIS path the correct scope names are the **non-prefixed** ones:
`instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`,
`instagram_manage_insights`, `instagram_manage_messages` (+ `pages_show_list`, `pages_read_engagement`).

Do NOT switch to the `instagram_business_*` names. Those belong to the *other* product —
"Instagram API with Business Login for Instagram" (`api.instagram.com` / `graph.instagram.com`,
no Facebook Page). Using `instagram_business_*` with the facebook.com dialog will break it.

**Why this is a trap:** generic web-search/AI answers claim `instagram_basic` was
"deprecated/invalid" after the Dec 2024 Basic Display API shutdown and tell you to rename to
`instagram_business_*`. That conflates the two Instagram products. Meta's own overview still
lists `instagram_basic` etc. under the "Facebook login" column. Trust the Meta docs table
(Instagram Platform → Overview → "Features and permissions") over AI summaries.

**"Invalid Scopes: instagram_basic, ..." in the OAuth dialog = the Meta app has not had the
Instagram product added.** The scope names are fine; the permissions just aren't available
to request yet. Fix is in the Meta App Dashboard (add the Instagram product / "Instagram API
setup with Facebook login"), not in code. The connecting user must also be an admin/dev/tester
of the app (Dev mode) or the perms must have Advanced Access via App Review (Live mode), and the
IG account must be a Professional account linked to the Page.

**Granted scopes/capabilities are captured ONLY at OAuth callback time** (via `/me/permissions`)
and persisted on the SocialAccount row. Enabling a permission in the Meta dashboard afterward
does nothing until the user RECONNECTS (re-runs OAuth). And a plain reconnect will NOT re-prompt
for a permission the user previously skipped/declined unless the OAuth URL sets
`auth_type=rerequest`. So after enabling a new permission: redeploy if needed, then reconnect,
and keep the permission checked on the Facebook consent screen.

**Connected-card capability checkmarks must be derived from granted scopes, never hardcoded.**
IG comment moderation (hide/delete) uses the *same* `instagram_manage_comments` permission as
read/reply — so `moderationCapability` for IG = `canIgComment`, not a constant.
