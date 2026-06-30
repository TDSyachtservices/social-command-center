FROM node:20-alpine AS base
WORKDIR /app

# ─── System dependencies ───────────────────────────────────────────────────
# imagemagick: server-side image resize pipeline.
# On Alpine the base `imagemagick` package only bundles PNG/GIF/BMP coders;
# JPEG/WebP/TIFF support ships as separate codec subpackages. Without them
# ImageMagick fails with "no decode delegate for this image format" on .jpg.
RUN apk add --no-cache imagemagick imagemagick-jpeg imagemagick-webp imagemagick-tiff

# ─── Install ALL dependencies (dev + prod, with scripts so Prisma can ──────
# download its engine binary during postinstall).
# Railway's rootDirectory is /server, so the Docker build context is the
# server/ directory itself. All COPY paths are relative to server/ — NO
# server/ prefix (that would resolve to server/server/... and fail).
FROM base AS deps
COPY package*.json ./
RUN npm install

# ─── Build — reuses deps layer, no second npm install ─────────────────────
# `npm run build` already runs `prisma generate && tsc`, so no separate
# prisma generate step is needed here.
FROM deps AS builder
COPY . .
RUN npm run build
# Prune dev deps in-place so runner gets a clean prod node_modules
RUN npm prune --omit=dev

# ─── Production image ──────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Persistent upload directory — mount a Railway Volume at /app/uploads
RUN mkdir -p /app/uploads

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
