# ============================================================
# GoalIQ Live — Multi-stage Production Dockerfile
# ============================================================

# Stage 1: Build & Dependencies
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./

# Install development + production dependencies
RUN npm ci

# Copy source code
COPY . .

# Stage 2: Production Runner
FROM node:18-alpine AS runner

WORKDIR /usr/src/app

COPY package*.json ./

# Only install production dependencies
RUN npm ci --only=production

# Copy built code from builder
COPY --from=builder /usr/src/app .

# Expose API Port
EXPOSE 3001

ENV NODE_ENV=production

# Default command runs the API server. 
# Override CMD to "node ingestion/runner.js" to run the ingestion daemon.
CMD ["node", "server.js"]
