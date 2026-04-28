FROM node:20-alpine AS base
WORKDIR /app

# ── Dependencies ────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# ── Build ────────────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time secrets passed as ARG so they are baked into the Next.js bundle
ARG MONGODB_URI
ARG SESSION_SECRET
ARG PG_HOST
ARG PG_PORT=5432
ARG PG_DB
ARG PG_USER
ARG PG_PASS

ENV MONGODB_URI=$MONGODB_URI \
    SESSION_SECRET=$SESSION_SECRET \
    PG_HOST=$PG_HOST \
    PG_PORT=$PG_PORT \
    PG_DB=$PG_DB \
    PG_USER=$PG_USER \
    PG_PASS=$PG_PASS

RUN npm run build

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Runtime environment variables (override build-time values if needed)
ARG MONGODB_URI
ARG SESSION_SECRET
ARG PG_HOST
ARG PG_PORT=5432
ARG PG_DB
ARG PG_USER
ARG PG_PASS

ENV MONGODB_URI=$MONGODB_URI \
    SESSION_SECRET=$SESSION_SECRET \
    PG_HOST=$PG_HOST \
    PG_PORT=$PG_PORT \
    PG_DB=$PG_DB \
    PG_USER=$PG_USER \
    PG_PASS=$PG_PASS \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

EXPOSE 3000
CMD ["node", "server.js"]
