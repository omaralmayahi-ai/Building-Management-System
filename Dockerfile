# Multi-stage production Dockerfile for Midland Oil Company Assets Platform
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ---- runner stage ----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# install production deps only
COPY package*.json ./
RUN npm install --omit=dev

# dist/server.cjs is self-contained — no need to copy server.ts or src/db
COPY --from=builder /app/dist ./dist

# writable data directory (mounted as a volume in production)
RUN mkdir -p .data/files && chown -R node:node .data

USER node

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
