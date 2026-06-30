---
name: Per-platform post media
description: How a post carries a different photo/video per platform, with a shared fallback and publish-time locking.
---

# Per-platform post media

Each `ScheduledPostPlatform` row can carry its own nullable `mediaUrl`/`mediaType` that overrides the post-level `ScheduledPost.mediaUrl`/`mediaType`.

- Publish picks `platform.mediaUrl ?? post.mediaUrl` (same for type). Post-level media is the **shared fallback** for any selected platform without its own image, and the list thumbnail.
- On create/update, post-level media is seeded from the first platform that has media when the client sends no explicit post-level value — keep this so list thumbnails / older clients keep working.
- **Why publish-time locking:** on successful publish the publisher writes the *effective* media back onto the platform row. Without it, a later edit of the post-level fallback would retroactively change an already-published row's displayed media even though the external post is unchanged.
- **Preview must mirror publish:** the composer passes the first-platform media as the preview `mediaUrl` fallback so a platform without its own media previews with the same shared image it will actually publish.

**How to apply:** any change to media selection, publishing, or the post composer must keep the `platform ?? post` fallback consistent across server publish, create/update fallback seeding, and the live preview. PATCH only updates platform rows whose status is not PUBLISHED/PUBLISHING. Platform-row reconciliation on edit (adding/removing platforms) is a separate, still-unhandled gap — PATCH does not create/delete rows.
