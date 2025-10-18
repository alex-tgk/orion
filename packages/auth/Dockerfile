# Build stage
FROM node:20-alpine AS builder

# Install dependencies for building native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/auth/package*.json ./packages/auth/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY packages/auth ./packages/auth
COPY packages/shared ./packages/shared
COPY nx.json ./
COPY tsconfig*.json ./

# Build the application
RUN npm run build:auth

# Runtime stage
FROM node:20-alpine

# Add non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy built application and production dependencies
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/auth/package*.json ./packages/auth/
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared/package*.json ./packages/shared/

# Switch to non-root user
USER nodejs

# Expose port (default 3000)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/auth/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)}).on('error', () => process.exit(1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/packages/auth/src/main.js"]