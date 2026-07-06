# Verdict Astrology — Next.js web app
# Build:  docker build -t astroapp-web .
# Run:    see docker-compose.yml

# ── deps: install node modules (compiles the swisseph native addon) ─────────
FROM node:22-bookworm-slim AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── build: compile the Next.js standalone bundle ────────────────────────────
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── runner ───────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# swisseph is loaded at runtime with its ephemeris data files; the standalone
# tracer cannot see the dynamic ephe path, so copy the whole package explicitly.
COPY --from=deps /app/node_modules/swisseph ./node_modules/swisseph

# Saved persons live in /app/data — mount it as a volume to persist
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3000
CMD ["node", "server.js"]
