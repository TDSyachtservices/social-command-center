FROM node:20-alpine AS base
WORKDIR /app

# ─── System dependencies ───────────────────────────────────────────────────
# imagemagick: server-side image resize pipeline.
# On Alpine the base `imagemagick` package only bundles PNG/GIF/BMP coders;
# JPEG/WebP/TIFF support ships as separate codec subpackages. Without them
# ImageMagick fails with "no decode delegate for this image format" on .jpg.
RUN apk add --no-cache imagemagick imagemagick-jpeg imagemagick-webp imagemagick-tiff

# ─── Production dependencies ───────────────────────────────────────────────
# Build context is the repo ROOT (Railway mounts the whole monorepo).
# All COPY sources are prefixed with server/ accordingly.
FROM base AS deps
COPY server/package*.json ./
RUN npm install --omit=dev --ignore-scripts

# ─── Build ─────────────────────────────────────────────────────────────────
FROM base AS builder
COPY server/package*.json ./
RUN npm install --ignore-scripts
COPY server/prisma ./prisma
RUN npx prisma generate
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npx tsc -p tsconfig.json

# ─── Production image ──────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production

COPY --from=deps    /app/node_modules          ./node_modules
COPY --from=builder /app/dist                  ./dist
COPY --from=builder /app/prisma                ./prisma
COPY --from=builder /app/node_modules/.prisma  ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma  ./node_modules/@prisma

# Persistent upload directory — mount a Railway Volume at /app/uploads
RUN mkdir -p /app/uploads

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
