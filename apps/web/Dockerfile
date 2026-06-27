FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json turbo.json tsconfig.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY apps/web apps/web
COPY packages/ui packages/ui

RUN npm ci
RUN npm run build --workspace apps/web

FROM nginx:1.27-alpine AS runtime

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80
