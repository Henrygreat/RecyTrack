# Stage 1: Install dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY .npmrc* ./
# Use --omit=optional for cross-platform builds (WASM fallbacks are used)
RUN npm ci --omit=optional

# Stage 2: Build the application
FROM node:22-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time placeholder for Prisma schema validation (not a secret)
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"

# Generate Prisma client and build Next.js
RUN npx prisma generate && npm run build

# Stage 3: Production runtime
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma schema, migrations, and generated client for runtime migrations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Set correct ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Runtime secrets (DATABASE_URL, AUTH_SECRET, AUTH_URL) are injected by Coolify
# DO NOT add secrets as ENV or ARG in this Dockerfile

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
