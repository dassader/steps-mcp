# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS base
WORKDIR /app
ENV npm_config_fund=false
ENV npm_config_update_notifier=false

FROM base AS deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY .npmrc package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY tsconfig.json tsconfig.ui.json vite.config.ts index.html ./
COPY migrations ./migrations
COPY src ./src
RUN npm run build

FROM deps AS production-deps
RUN npm ci --omit=dev && npm cache clean --force

FROM base AS runtime
ARG OCI_SOURCE="https://github.com/dassader/steps-mcp"
LABEL org.opencontainers.image.title="Steps MCP"
LABEL org.opencontainers.image.description="Agent-friendly task planning and execution MCP server with browser UI"
LABEL org.opencontainers.image.source=$OCI_SOURCE
LABEL org.opencontainers.image.licenses="ISC"
LABEL io.modelcontextprotocol.server.name="io.github.dassader/steps-mcp"

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001
ENV PUBLIC_URL=http://localhost:3001
ENV MCP_ENDPOINT=/mcp
ENV MCP_STATEFUL=true
ENV MCP_JSON_RESPONSE=false
ENV DB_PATH=/app/data/steps.db

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates libstdc++6 \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system steps \
  && useradd --system --gid steps --home-dir /app --shell /usr/sbin/nologin steps \
  && mkdir -p /app/data \
  && chown -R steps:steps /app

COPY --from=production-deps --chown=steps:steps /app/node_modules ./node_modules
COPY --from=build --chown=steps:steps /app/dist ./dist
COPY --chown=steps:steps package.json package-lock.json ./
COPY --chown=steps:steps migrations ./migrations

USER steps
EXPOSE 3001
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || '3001') + '/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/index.js"]
