---
name: Railway uploads are ephemeral without a volume
description: Why uploaded/processed media disappears on Railway redeploys
---

# Railway /app/uploads is ephemeral unless a Volume is mounted

The server writes originals and processed versions under `/app/uploads` and serves
them from disk. Railway containers have an **ephemeral filesystem** — every
redeploy starts a fresh container, so anything written to `/app/uploads` is lost
unless a **Railway Volume is mounted at `/app/uploads`**.

**Why it matters:** after any push triggers a redeploy, previously uploaded media
(and generated versions) vanish, and reprocessing then reports the original file is
missing. Disk-backed media cannot survive deploys without persistent storage.

**How to apply:** mounting the volume is a Railway **dashboard** setting, not code —
it can't be fixed from the repo. If media must persist across deploys, tell the user
to mount a Railway Volume at `/app/uploads`, or move storage to object storage/S3.
