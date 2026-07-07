# syntax=docker/dockerfile:1
#
# Single Railway image that serves BOTH the React frontend and the Express API
# from one domain. Build context is the repo root (set Railway rootDirectory to
# the repo root and Dockerfile path to "Dockerfile").

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Build the React frontend (pnpm monorepo).
# MUST be glibc, NOT Alpine: pnpm-workspace.yaml maps every *-musl native binary
# (lightningcss, @tailwindcss/oxide, rollup) to "-", so Tailwind v4 + Vite cannot
# build on musl. node:22-slim is Debian (glibc).
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-slim AS web
WORKDIR /repo

# Root package.json has no packageManager field; pin pnpm explicitly.
RUN npm install -g pnpm@10

# Copy the whole workspace (root .dockerignore trims node_modules/dist/etc.)
COPY . .
RUN pnpm install --frozen-lockfile

# vite.config.ts THROWS if PORT or BASE_PATH are missing — even for `build`.
# BASE_PATH=/ serves the SPA at the domain root. VITE_API_BASE_URL is baked in at
# build time; it defaults to the Railway domain (same origin, so no CORS). Pass a
# different --build-arg VITE_API_BASE_URL=... when moving to a custom domain.
ARG VITE_API_BASE_URL=https://social-command-center-production-ec51.up.railway.app
ENV PORT=3000 BASE_PATH=/ VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN pnpm --filter @workspace/social-command-center run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Build the Express + Prisma server (standalone npm package, Alpine).
# server/package-lock.json points at an internal Replit registry Railway cannot
# reach, so we copy ONLY package.json and install fresh from the public registry.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS server-build
WORKDIR /app
COPY server/package.json ./
RUN npm install --include=dev
COPY server/ .
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 — Runtime image (Alpine).
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# imagemagick + codec subpackages for the media resize pipeline (JPEG/WebP/TIFF).
RUN apk add --no-cache imagemagick imagemagick-jpeg imagemagick-webp imagemagick-tiff

# Server build: keep the FULL node_modules so the prisma CLI is available at
# startup for `prisma migrate deploy`.
COPY --from=server-build /app/node_modules ./node_modules
COPY --from=server-build /app/dist ./dist
COPY --from=server-build /app/prisma ./prisma

# Built React app — Express serves these static files from /app/public.
COPY --from=web /repo/artifacts/social-command-center/dist/public ./public

# Persistent upload dir — mount a Railway Volume here so media survives redeploys.
RUN mkdir -p /app/uploads

# Railway injects PORT; the server reads process.env.PORT (defaults to 3001).
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
