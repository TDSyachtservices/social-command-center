---
name: KPI mock data invariant
description: summaryStats totals must reconcile with per-platform breakdown sums in the KPI section
---

In `artifacts/social-command-center/src/data/mockKpi.ts`, the `summaryStats` totals must equal
the sum of the corresponding per-platform `platformSnapshots` values.

**Why:** The KPI metric detail pages (`/kpi/metric/:metricId`, driven by `kpiMetrics.ts`)
render a literal "How this is calculated" expression like `a + b + c + d = total`, where the
addends come from `platformSnapshots` and the total comes from `summaryStats`. If they disagree,
the UI shows a visibly wrong equation (this happened once: `postsPublished30d` was 4 while the
per-platform counts summed to 15).

**How to apply:** When editing any `summaryStats` field, verify it equals the sum of the matching
`platformSnapshots` field (e.g. `totalReach30d` == Σ `reach30d`, `postsPublished30d` == Σ `postsPublished`).
Non-additive metrics (engagement rate = average; avg-reach-per-post = totalReach/totalPosts) are
modeled with `unit: "percent"` / `unit: "avg"` in `kpiMetrics.ts` so the page does NOT sum them —
keep that unit tagging correct rather than forcing a sum.
