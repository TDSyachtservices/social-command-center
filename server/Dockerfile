FROM node:20-alpine AS base
WORKDIR /app

# ─── System dependencies ───────────────────────────────────────────────────
# imagemagick: server-side image resize pipeline.
# On Alpine the base `imagemagick` package only bundles PNG/GIF/BMP coders;
# JPEG/WebP/TIFF support ships as separate codec subpackages. Without them
# ImageMagick fails with "no decode delegate for this image format" on .jpg.
RUN apk add --no-cache imagemagick imagemagick-jpeg imagemagick-webp imagemagick-tiff

# ─── Production dependencies ───────────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts

# ─── Prisma client generation ──────────────────────────────────────────────
# Runs in its own stage so we get the generated client without needing the
# full source or tsc — avoids the tsc build-cache problem.
FROM base AS prisma
COPY package*.json ./
RUN npm install --ignore-scripts
COPY prisma ./prisma
RUN npx prisma generate

# ─── Source checkout ──────────────────────────────────────────────────────
# dist/ is committed to the repo alongside src/. We copy the full checkout
# here and take dist/ from it in the runner — bypassing the tsc layer cache
# entirely. Every GitHub push + redeploy always uses the latest committed JS.
FROM base AS source
COPY . .

# ─── Production image ──────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production

COPY --from=deps   /app/node_modules          ./node_modules
COPY --from=source /app/dist                  ./dist
COPY --from=source /app/prisma                ./prisma
COPY --from=prisma /app/node_modules/.prisma  ./node_modules/.prisma
COPY --from=prisma /app/node_modules/@prisma  ./node_modules/@prisma

# Persistent upload directory — mount a Railway Volume at /app/uploads
RUN mkdir -p /app/uploads

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
