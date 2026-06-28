# shadcn/ui monorepo template

This is a Vite monorepo template with shadcn/ui.

## Deployment Docs

- First-time self-hosting guide: `docs/first-time-self-hosting.md`

## Adding components

To add components to your app, run the following command at the root of your `web` app:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

This will place the ui components in the `packages/ui/src/components` directory.

## Using components

To use the components in your app, import them from the `ui` package.

```tsx
import { Button } from "@workspace/ui/components/button";
```

## Library API auth setup

The API now includes a basic login flow and protects post creation.

### Environment variables

Set these in your shell before running the API workspace:

```bash
AUTH_USERNAME=admin
AUTH_PASSWORD=change-me
AUTH_SECRET=dev-secret-change
AUTH_TOKEN_TTL_SECONDS=86400
CORS_ORIGIN=http://localhost:5173
MAX_BODY_BYTES=20971520
DATABASE_URL=postgres://user:password@localhost:5432/library
```

If `DATABASE_URL` is set, the API uses PostgreSQL for post metadata and auto-creates the `posts` table on startup access. If `DATABASE_URL` is not set, it falls back to the existing local JSON storage in `apps/api/data/posts.json`.

## Self-managed database mode

You can run PostgreSQL yourself without relying on a managed third-party database.

### Why this fits droplet and Raspberry Pi

- Same API codebase and env vars in both environments.
- PostgreSQL Docker image supports ARM and x86, so the same compose file works on Raspberry Pi and cloud VMs.
- You control backup strategy, data location, and lifecycle.

### Quick start (self-hosted Postgres)

1. Copy env template values from `apps/api/.env.self-hosted.example`.
2. Start local Postgres:

```bash
npm run db:up --workspace apps/api
```

3. Run API with `DATABASE_URL` set.

4. Optional: migrate existing JSON posts into Postgres:

```bash
npm run migrate:json-to-db --workspace apps/api
```

5. Stop Postgres when needed:

```bash
npm run db:down --workspace apps/api
```

### Compose file location

- `infra/docker-compose.db.yml`

## Full self-hosted app stack

Run Web + API + PostgreSQL together with Docker Compose (portable to droplet and Raspberry Pi):

```bash
npm run stack:up --workspace apps/api
```

Logs and shutdown:

```bash
npm run stack:logs --workspace apps/api
npm run stack:down --workspace apps/api
```

Compose files and templates:

- `infra/docker-compose.app.yml`
- `infra/.env.compose.example`

## GitHub Actions CI/CD

Workflows included:

- `/.github/workflows/ci.yml`: runs install, typecheck, and build on push/PR.
- `/.github/workflows/cd-self-hosted.yml`: manual deploy over SSH from an explicit release tag.

For CD, configure these GitHub repo secrets:

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `DEPLOY_PATH`
- Optional: `DEPLOY_PORT`

Deployment workflow behavior:

1. Trigger CD manually and provide a `release_tag` input (for example `v1.2.0`).
2. Pull that tag on your server and deploy from the tagged revision.
3. Require an existing server `.env` file.
4. Run `docker compose -f infra/docker-compose.app.yml up -d --build`.
5. Run JSON-to-DB migration inside the API container (safe/no-op on conflicts).

### Notes

- Upload files remain local filesystem-backed (`apps/api/data/uploads`) so this path is also self-managed.
- For production, mount persistent volumes for both PostgreSQL data and API uploads.

### Endpoints

- `POST /auth/login` returns a bearer token.
- `POST /posts` now requires `Authorization: Bearer <token>`.
- `GET /posts`, `GET /posts/:id`, and `GET /assets/:name` remain public.

### Frontend login page

Run the web app and open `/login` to sign in. After login, the app stores the token locally and enables protected post actions in the feed.
