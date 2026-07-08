---
name: ImageMagick multi-frame inputs
description: Animated GIFs produce one output per frame unless you select [0]
---
Any ImageMagick convert of a multi-frame input (animated GIF, multi-page TIFF) to a single output path writes `out-0.jpg`, `out-1.jpg`, ... instead of `out.jpg` — code that stats the expected single path then fails.

**Why:** An animated GIF upload silently failed the whole media pipeline (asset marked FAILED, zero versions) because statSync on the expected tmp path threw ENOENT.

**How to apply:** Always pass `input.gif[0]` (first-frame selector) as the ImageMagick input when producing a single still output. Frame 0 is always complete; no -coalesce needed. Harmless for single-frame formats.
