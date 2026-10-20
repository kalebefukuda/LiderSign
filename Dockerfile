# syntax=docker/dockerfile:1.7
# LíderSign: uma imagem só. O Nest serve a API (/v1) e o React (build do Vite) na mesma porta.
#   docker compose up --build   ->   http://localhost:3000/demo

ARG NODE_VERSION=22

# ---------- base: Node + pnpm + openssl (Prisma) ----------
FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /repo

# ---------- build: instala tudo e compila na ordem shared -> agent -> web -> api ----------
FROM base AS build
# Primeiro só os manifestos: a camada de dependências fica em cache entre builds
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/agent/package.json packages/agent/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY packages ./packages
COPY apps ./apps

RUN pnpm --filter @lidersign/shared build \
    && pnpm --filter @lidersign/agent build \
    && pnpm --filter @lidersign/web build \
    && pnpm --filter @lidersign/api build

# Pasta enxuta da API: só dependências de produção + pacotes do workspace já compilados
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm --filter @lidersign/api deploy --prod --legacy /out \
    && mkdir -p /out/web \
    && cp -r apps/web/dist /out/web/dist

# ---------- runtime ----------
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ARG PRISMA_VERSION=6.19.3
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
# CLI do Prisma para as migrações no boot (a API não leva o prisma como dependência de produção)
RUN npm install -g prisma@${PRISMA_VERSION} \
    && prisma -v \
    && npm cache clean --force

ENV NODE_ENV=production \
    PORT=3000 \
    WEB_DIST_DIR=/app/web/dist \
    STORAGE_DIR=/data/storage \
    CERT_DIR=/data/certs

WORKDIR /app
COPY --from=build --chown=node:node /out ./
# Cliente Prisma gerado dentro da pasta de produção
RUN prisma generate --schema prisma/schema.prisma

COPY --chown=node:node infra/entrypoint.sh /usr/local/bin/lidersign-entrypoint
RUN chmod +x /usr/local/bin/lidersign-entrypoint \
    && mkdir -p /data/storage /data/certs \
    && chown -R node:node /data /app

USER node
VOLUME ["/data"]
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=12 \
    CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["lidersign-entrypoint"]
