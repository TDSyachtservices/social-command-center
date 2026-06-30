---
name: Media optimizer focal crop & AI score
description: Non-obvious rules for the media optimizer's focal-point crop preview and AI quality scoring
---

## Live crop preview must reproduce the server crop, not CSS object-position
The server crops a cover-scaled image with the focal point as the **centre** of the
crop window: `offset = clamp(focal * scaledDim - targetDim/2, 0, scaledDim - targetDim)`.

CSS `object-position: p%` uses a different model (`p * (scaled - target)`), so for any
off-centre focal point it shows a DIFFERENT crop than what gets written.

**How to apply:** render the optimizer's live preview with `background-size` /
`background-position` derived from the same clamped crop rect the source-overlay uses
(`bgPos% = (focalPx - target/2) / (srcDim - targetDim) * 100`, default 50% when that
dimension isn't cropped). Never use `object-position` for the preview. The source
overlay rectangle and the server already agree; the preview was the odd one out.

## A re-crop invalidates the AI score — guard against stale score writes
Saving a new focal point re-cuts the image AND clears that version's AI quality score
(server sets it to NEEDS_REVIEW/null). Async AI scoring captures the version, scores,
then patches — so a score that was in flight when the crop was saved can overwrite the
invalidation and wrongly mark the new crop "Good/READY".

**How to apply:** disable "Edit Crop" for a version while it is being scored (and during
"AI check all"). The crop editor replaces the grid, so you also can't start scoring while
editing — together that closes the race without a revision counter.
