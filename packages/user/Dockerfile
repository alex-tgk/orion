# Multi-stage Dockerfile for User Service
# Stage 1: Base with pnpm
FROM node:20-alpine AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Stage 2: Dependencies
FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/user/package.json ./packages/user/
COPY packages/shared/package.json ./packages/shared/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Stage 3: Build
FROM base AS build
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
# Generate Prisma Client
RUN cd packages/user && npx prisma generate || true
# Build using NX
RUN pnpm nx build user --prod

# Stage 4: Production Dependencies
FROM base AS prod-dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/user/package.json ./packages/user/
COPY packages/shared/package.json ./packages/shared/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

# Stage 5: Runtime
FROM node:20-alpine AS runtime
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy built application and dependencies
COPY --from=build --chown=nestjs:nodejs /app/dist/packages/user ./dist
COPY --from=prod-dependencies --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy Prisma schema and generate client
COPY --from=build --chown=nestjs:nodejs /app/packages/user/prisma ./prisma
RUN npx prisma generate || true

# Create upload directory
RUN mkdir -p /app/uploads/avatars && \
    chown -R nestjs:nodejs /app

USER nestjs

ENV NODE_ENV=production
ENV PORT=3002

EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/api/user/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
