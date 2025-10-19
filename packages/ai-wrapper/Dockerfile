FROM node:18-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY packages/ai-wrapper/package.json ./packages/ai-wrapper/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/ai-wrapper ./packages/ai-wrapper
COPY packages/shared ./packages/shared
COPY nx.json tsconfig.base.json ./

# Build the service
RUN pnpm nx build ai-wrapper

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Install Claude CLI (optional - for real AI)
# RUN npm install -g @anthropic-ai/claude-cli

# Copy built application
COPY --from=builder /app/dist/packages/ai-wrapper ./

# Install production dependencies
RUN pnpm install --prod

# Expose port
EXPOSE 3200

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3200/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the service
CMD ["node", "main.js"]
