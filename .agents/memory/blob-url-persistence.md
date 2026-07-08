---
name: Never persist blob: preview URLs to post media fields
description: Direct-attach media upload in post composer must swap blob: preview URL for the real server URL before save, or publishing to platforms silently fails
---

## Rule
Any UI that creates an instant local preview via `URL.createObjectURL()` (a `blob:` URL) for a file the user just selected must, before that value can be persisted to the backend, await the actual upload and replace the `blob:` reference with the permanent server URL returned by the upload endpoint. Never let form submission fire while a `blob:` URL is still the current value of a field that gets saved to the DB.

**Why:** A `blob:` URL is a browser-tab-local object reference — it only resolves inside the tab that created it and vanishes on reload. If it gets saved as `Post.mediaUrl` and later handed to a platform API (e.g. Facebook Graph `file_url`), the platform's server tries to fetch it and fails with something like "Unable to fetch video file from URL." The upload usually *did* succeed server-side (the asset shows up fine in a Media Library), so the failure is confusing: the file exists, but the specific Post record never got updated with the real URL because the original upload call was fire-and-forget with no swap-back and no UI feedback.

**How to apply:** When adding any "attach file directly to X" flow (as opposed to picking an already-uploaded asset from a library), block the parent form's submit actions while the swap is in flight, show an inline "still uploading" state, and surface upload failures instead of silently keeping the blob URL. Also note: an upload that only reaches `UPLOADED` processing status (no derived `versions`) will have `originalPublicUrl: null` in the media library — the direct-attach path should rely on the upload call's own returned `originalUrl`, not on reading back the media asset record.

## Related
- Uploaded files live in an ephemeral directory that's wiped on every Railway redeploy unless a Volume is mounted (see `railway-ephemeral-uploads.md`) — a post that failed because of a stale `blob:` URL usually can't be "fixed in place" after later redeploys; the user must re-attach/re-upload the file through the corrected flow.
