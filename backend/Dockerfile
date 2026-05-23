# ============================================================
# GoalIQ Live — Production Dockerfile (Node 20 LTS)
# ============================================================

# Stage 1: Install all deps (including dev for any build steps)
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --omit=dev

# Copy source code
COPY . .

# Stage 2: Lean production runner
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

# Copy only what we need from builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app .

# Expose API Port (Railway overrides with PORT env var)
EXPOSE 3001

ENV NODE_ENV=production

# Run server
CMD ["node", "server.js"]
