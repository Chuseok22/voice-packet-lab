# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
# packageManager(package.json)에 적힌 pnpm 버전을 corepack이 받아 쓴다. 비대화형 빌드에서 다운로드 확인창이 뜨지 않게 한다.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY shared/package.json shared/
COPY client/package.json client/
COPY server/package.json server/
RUN pnpm install --frozen-lockfile
# 루트 .env(VITE_PRESENTER_PASSWORD)는 CI가 GitHub Secret으로 만들어 두며, 빌드 단계에서만 쓰인다.
COPY . .
RUN pnpm build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider "http://127.0.0.1:3000/healthz" || exit 1
CMD ["node", "server/dist/index.cjs"]
