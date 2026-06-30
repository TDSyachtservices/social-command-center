---
name: Social adapter contract
description: Required exports for every platform adapter in server/src/adapters/
---

## Rule
Every adapter file (facebook, instagram, linkedin, tiktok, website) must export these four functions at the top level:

```ts
export function getCapabilities(): PlatformCapabilities
export async function publishPost(opts): Promise<PublishResult>
export async function getComments(opts): Promise<PlatformComment[]>
export async function replyToComment(opts): Promise<PublishResult>
```

**Why:** The code review rejected the first push because adapters only had platform-specific named exports (e.g. `facebookPublish`). The route files and future orchestration layer expect the standard contract names.

**How to apply:** When adding a new adapter or editing an existing one, always include all four standard exports even if they're MOCK stubs. Legacy named exports (e.g. `facebookPublish`) may remain as aliases but are not sufficient alone.

## Which platforms actually publish
The publisher (`server/src/services/publisher.ts`) dispatches by `account.platform`. **Facebook and Instagram are REAL**; LinkedIn/TikTok/etc. are still skipped ("Platform adapter not yet implemented"). A connected platform with no real adapter is silently marked SKIPPED, not failed.

**Instagram publishing gotchas (Graph API content-publishing):**
- MEDIA IS MANDATORY — Instagram cannot post text-only. No media → the row is marked FAILED with a clear message (publisher does not silently skip it).
- Two-step flow: POST `/{ig-user-id}/media` (image_url|video_url + caption) → container id, then POST `/{ig-user-id}/media_publish` (creation_id). Poll the container's `status_code` until `FINISHED` before publishing (videos/Reels need transcoding time).
- Node is the **IG user id** (`account.accountId` of the INSTAGRAM row, e.g. 1784…), token is the **Page token** stored on that row; needs `instagram_content_publish` scope.
- `image_url` must be a PUBLICLY reachable URL (IG fetches it server-side) — depends on the media route's RAILWAY_PUBLIC_DOMAIN-based public URL, which is subject to the ephemeral-uploads caveat.

## Types (from facebook.ts, re-exported by all adapters)
```ts
interface PlatformCapabilities { posting: boolean; commentRead: boolean; commentReply: boolean; moderation: boolean; }
interface PublishResult { success: boolean; externalPostId?: string; rawResponse?: unknown; }
interface PlatformComment { /* defined in facebook.ts */ }
```
