FROM node:22-bookworm-slim AS build

WORKDIR /workspace
RUN corepack enable

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/api-server build

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=5000
WORKDIR /workspace

COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/artifacts/api-server/node_modules ./artifacts/api-server/node_modules
COPY --from=build /workspace/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=build /workspace/artifacts/api-server/package.json ./artifacts/api-server/package.json
COPY --from=build /workspace/lib ./lib

USER node
EXPOSE 5000

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
