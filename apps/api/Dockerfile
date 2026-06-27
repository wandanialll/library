FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json turbo.json tsconfig.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/api/tsconfig.json apps/api/tsconfig.json
COPY apps/api/tsconfig.build.json apps/api/tsconfig.build.json
COPY apps/api/src apps/api/src

RUN npm ci
RUN npm run build --workspace apps/api

FROM node:20-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/data ./apps/api/data

WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/server.js"]
