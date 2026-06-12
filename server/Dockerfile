FROM node:20-alpine AS base
WORKDIR /app

# ─── Install dependencies ──────────────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts

# ─── Build ─────────────────────────────────────────────────────────────────
FROM base AS builder
COPY package*.json ./
RUN npm install --ignore-scripts
COPY . .
RUN npx prisma generate
RUN npm run build

# ─── Production image ──────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3001

# Run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
