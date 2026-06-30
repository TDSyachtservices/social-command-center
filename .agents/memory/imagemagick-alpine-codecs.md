---
name: ImageMagick on Alpine needs codec subpackages
description: Why image processing fails with "no decode delegate" on Alpine/Railway and how to fix it
---

# ImageMagick on Alpine: codec subpackages

The base Alpine `imagemagick` apk package only bundles PNG/GIF/BMP coders. JPEG,
WebP, TIFF, HEIC, etc. ship as **separate codec subpackages** (`imagemagick-jpeg`,
`imagemagick-webp`, `imagemagick-tiff`, …). With only the base package installed,
the binary runs but fails to read the file with:

`no decode delegate for this image format '...jpg' @ error/constitute.c/ReadImage`

**Why:** the codecs need external delegate libs, so Alpine splits them out to keep
the base package small. Installing only `imagemagick` silently lacks JPEG support.

**How to apply:** in the Dockerfile install the codecs for the formats you accept,
e.g. `apk add --no-cache imagemagick imagemagick-jpeg imagemagick-webp imagemagick-tiff`
(PNG+GIF are in base; JPEG+WebP are the required adds). Verify a package name
exists at `https://pkgs.alpinelinux.org/package/edge/community/x86_64/<pkg>` before
pushing, to avoid a failed Docker build.

**Binary name caveat:** Alpine IM7's primary binary is `magick`; legacy `convert`
may not be on PATH. Probe for whichever exists rather than hardcoding one — but the
codec subpackages, not the binary name, are the usual root cause of decode failures.
