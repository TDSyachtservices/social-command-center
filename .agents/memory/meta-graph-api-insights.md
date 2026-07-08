---
name: Meta Graph API version & metrics
description: Which FB/IG Page Insights metrics work in v21 (July 2026) and how to fetch them
---

## API version
- v19 deprecated May 2026, v20 deprecated Sep 2026 → use **v21+**
- Both FB and IG adapters use `https://graph.facebook.com/v21.0`

## Facebook Page Insights (v21, confirmed July 2026)

### WORKS
- `page_post_engagements` — period=day, returns daily engagement counts ✅
- `page_views_total` — period=day, used as reach/impressions proxy ✅
- `fan_count` / `followers_count` — from `GET /{pageId}?fields=fan_count,followers_count` (Page object, not insights) ✅

### DEPRECATED (June 2026) — returns `#100 The value must be a valid insights metric`
- `page_impressions` ❌
- `page_impressions_unique` ❌
- `page_engaged_users` ❌
- `page_fans_adds` / `page_fan_adds_unique` ❌

### Architecture lesson
Request each metric **individually** in parallel — if you bundle them and any one is deprecated, Meta rejects the entire batch with `#100`. The adapter now uses `FB_INSIGHT_METRICS` array and fetches each metric separately, silently skipping failures.

### Engagement rate caveat
`page_post_engagements / page_views_total` can exceed 100% because one is post-level (multiple engagements per viewer) and the other is page-view count — they're not compatible denominators. Only use this ratio if you have a proper reach metric.

## Instagram Account Insights (v21, confirmed July 2026)

### Fetch strategy: split into two requests
1. `reach` + `follower_count` — period=day, time-series
2. `total_interactions` + `profile_views` — metric_type=total_value (NOT period=day)

### WORKS
- `reach` ✅
- `follower_count` ✅
- `total_interactions` ✅
- `profile_views` ✅

### DEPRECATED
- `impressions` ❌ (removed, use `reach` or `total_interactions` instead)

## Error surfacing rule
Always surface raw Meta error messages to the UI — silent zeros hide real permission or deprecation issues.
