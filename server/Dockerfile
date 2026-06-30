FROM node:20-alpine AS base
WORKDIR /app

# ─── System dependencies ───────────────────────────────────────────────────
# imagemagick: server-side image resize pipeline.
# On Alpine the base `imagemagick` package only bundles PNG/GIF/BMP coders;
# JPEG/WebP/TIFF support ships as separate codec subpackages. Without them
# ImageMagick fails with "no decode delegate for this image format" on .jpg.
RUN apk add --no-cache imagemagick imagemagick-jpeg imagemagick-webp imagemagick-tiff

# ─── Install ALL dependencies ─────────────────────────────────────────────
# Railway's rootDirectory is /server, so the Docker build context is the
# server/ directory itself. All COPY paths are relative to server/ — NO
# server/ prefix (that would resolve to server/server/... and fail).
# We install all deps (including dev) so prisma CLI is available both for
# `npm run build` (prisma generate + tsc) and for `npx prisma migrate deploy`
# at container startup. prisma is in devDependencies so we must NOT prune.
FROM base AS deps
# Copy only package.json — NOT package-lock.json.
# The lockfile is generated on Replit with internal registry URLs
# (package-firewall.replit.local) that Railway cannot reach. Excluding it
# lets npm resolve all deps fresh from the public registry on every build.
COPY package.json ./
RUN npm install --include=dev

# ─── Build — reuses deps layer, no second npm install ─────────────────────
# `npm run build` already runs `prisma generate && tsc`, so no separate
# prisma generate step is needed here.
FROM deps AS builder
COPY . .
RUN npm run build

# ─── Production image ──────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production

# Copy ALL node_modules from builder (including dev deps) so that
# `npx prisma migrate deploy` can find the prisma CLI at startup.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Persistent upload directory — mount a Railway Volume at /app/uploads
RUN mkdir -p /app/uploads

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
