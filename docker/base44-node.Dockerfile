# Base44 development image for the pnpm workspace.
#
# Plain runtime base only: the repository is bind-mounted at /app by
# docker-compose.base44.yml and dependencies are installed at container start,
# so edits show up without rebuilding an image (nothing is baked with COPY).
FROM node:24-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl openssl \
 && rm -rf /var/lib/apt/lists/* \
 && npm install --global pnpm@10.34.9

ENV PNPM_STORE_DIR=/pnpm-store
ENV npm_config_store_dir=/pnpm-store
ENV CI=true

WORKDIR /app
