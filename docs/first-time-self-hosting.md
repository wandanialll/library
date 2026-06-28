# First-Time Self-Hosting Guide (VPS/Droplet + GitHub CI/CD)

This guide is for people hosting this app for the first time using self-managed infrastructure.

It covers:

- Local prerequisites and first deployment test.
- Provisioning a VPS/DigitalOcean droplet.
- Running the app stack (Web + API + PostgreSQL) with Docker Compose.
- Configuring GitHub Actions CI/CD for SSH-based self-hosted deployments.

## 1. What Gets Deployed

Current deployment stack in this repository:

- Web frontend from [apps/web/Dockerfile](../apps/web/Dockerfile)
- API service from [apps/api/Dockerfile](../apps/api/Dockerfile)
- PostgreSQL database from [infra/docker-compose.app.yml](../infra/docker-compose.app.yml)
- Runtime configuration from [infra/.env.compose.example](../infra/.env.compose.example)

Compose services:

1. `web`
2. `postgres`
3. `api`

## 2. Prerequisites (Your Machine)

Install:

1. Git
2. Docker + Docker Compose plugin
3. Node.js 20+
4. npm 10+

Clone and install:

```bash
git clone <your-repo-url>
cd library
npm ci
```

## 3. Local First-Run Smoke Test

Start full stack:

```bash
npm run stack:up --workspace apps/api
```

Verify frontend and API health:

```bash
curl http://localhost:8080/api/health
```

Expected: JSON response with `ok: true` (and DB health details).

Stop stack:

```bash
npm run stack:down --workspace apps/api
```

## 4. Provision a Droplet / VPS

Recommended baseline:

1. Ubuntu 24.04 LTS
2. 2 vCPU / 2 GB RAM minimum
3. 30+ GB disk
4. Public IPv4

Initial server hardening (recommended):

1. Create a non-root sudo user.
2. Disable password SSH login (key-based only).
3. Enable firewall (UFW): allow `22`, `80`, `443`.
4. Keep system updated.

Example:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl git
```

## 5. Install Docker on VPS

Use Docker official install instructions for your distro.

After install:

```bash
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
```

Log out and back in, then verify:

```bash
docker --version
docker compose version
```

## 6. Deploy on VPS (Manual First Time)

Pick a deploy path (example: `/opt/library`):

```bash
sudo mkdir -p /opt/library
sudo chown -R $USER:$USER /opt/library
cd /opt/library
git clone <your-repo-url> .
```

Create runtime env from template:

```bash
cp infra/.env.compose.example .env
```

Edit `.env` for production values:

1. `WEB_PORT` (typically `80` on VPS)
1. `AUTH_USERNAME`
1. `AUTH_PASSWORD`
1. `AUTH_SECRET` (use a long random secret)
1. `CORS_ORIGIN` (set to your site origin, example `https://library.wandanial.com`)
1. `POSTGRES_PASSWORD` (strong password)
1. `DATABASE_URL` (keep host as `postgres` when using compose network)

Bring up stack:

```bash
docker compose --env-file .env -f infra/docker-compose.app.yml up -d --build
```

Check logs:

```bash
docker compose --env-file .env -f infra/docker-compose.app.yml logs -f
```

## 7. DNS and HTTPS (Recommended)

For production:

1. Point `library.wandanial.com` A record to the VPS IP.
2. Set `WEB_PORT=80` in `.env` so the web container serves the app on standard HTTP.
3. Add TLS with a host-level reverse proxy (Nginx/Caddy/Traefik) and forward to `localhost:80`.

Keep API container private if possible; expose only `80/443` publicly.

## 8. GitHub Actions CI/CD Setup

Workflows in repo:

1. CI: [.github/workflows/ci.yml](../.github/workflows/ci.yml)
2. CD: [.github/workflows/cd-self-hosted.yml](../.github/workflows/cd-self-hosted.yml)

### 8.1 CI behavior

On PR and push to `master`/`main`:

1. `npm ci`
2. `npm run typecheck`
3. `npm run build --workspace apps/api`
4. `npm run build --workspace apps/web`

### 8.2 CD behavior

On manual dispatch, CD job will:

1. Require a `release_tag` input.
2. SSH to your server.
3. Clone/pull repository in `DEPLOY_PATH`.
4. Verify the requested release tag exists and checkout that tag.
5. Require `.env` to already exist on the server.
6. Run compose deploy (`up -d --build`).

### 8.3 Required GitHub repository secrets

Set these in GitHub: `Settings -> Secrets and variables -> Actions`.

Required:

1. `DEPLOY_HOST` (server IP or hostname)
2. `DEPLOY_USER` (SSH user)
3. `DEPLOY_SSH_KEY` (private key content)
4. `DEPLOY_PATH` (example `/opt/library`)

Optional:

1. `DEPLOY_PORT` (default `22`)

## 9. Day-2 Operations

Update deployment manually:

```bash
cd /opt/library
git fetch --all --prune
git reset --hard origin/main
docker compose --env-file .env -f infra/docker-compose.app.yml up -d --build
```

Restart stack:

```bash
docker compose --env-file .env -f infra/docker-compose.app.yml restart
```

Stop stack:

```bash
docker compose --env-file .env -f infra/docker-compose.app.yml down
```

## 10. Backups and Recovery

Minimum recommendation:

1. Nightly PostgreSQL dump to host disk.
2. Upload backup files to off-machine storage.
3. Periodic restore drill on a test machine.

Example dump command:

```bash
docker compose --env-file .env -f infra/docker-compose.app.yml exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql
```

## 11. Raspberry Pi Notes

This stack is compatible with ARM when Docker images support ARM (Postgres official image does).

Recommendations on Pi:

1. Prefer SSD over SD card for DB durability.
2. Increase swap conservatively if memory is low.
3. Keep same `.env` format and compose workflow.
4. Use a reverse proxy + TLS exactly like VPS setup.

## 12. Troubleshooting

### Frontend/API health fails

1. Check DB container is healthy.
2. Confirm web container is up and serving on `WEB_PORT`.
3. Confirm `DATABASE_URL` points to `postgres` host in compose network.
4. Confirm `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` align with URL.

### CD workflow does nothing

1. Ensure required secrets are set.
2. Confirm branch is `master` or `main`.
3. Check Actions logs for SSH key/permission issues.

### Empty feed after first deploy

1. This is expected with a fresh empty DB.
2. Login as admin and create your first post.
3. Confirm `DATABASE_URL` is correct if posting fails.
