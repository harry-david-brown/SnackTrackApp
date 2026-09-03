#!/usr/bin/env bash

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$(cd "$APP_DIR/../SnackTrackAPI" && pwd)"

info() { printf '[setup] %s\n' "$1"; }
fail() { printf '[setup] error: %s\n' "$1" >&2; exit 1; }

command -v node >/dev/null || fail 'Node.js 20 or newer is required.'
command -v npm >/dev/null || fail 'npm is required.'
command -v docker >/dev/null || fail 'Docker Desktop is required.'
docker compose version >/dev/null 2>&1 || fail 'Docker Compose v2 is required.'

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
[ "$NODE_MAJOR" -ge 20 ] || fail "Node.js 20 or newer is required; found $(node --version)."

if [ ! -f "$APP_DIR/.env" ]; then
  info 'Creating the app .env from .env.example.'
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
fi
if [ ! -f "$API_DIR/.env" ]; then
  info 'Creating the API .env from .env.example.'
  cp "$API_DIR/.env.example" "$API_DIR/.env"
fi

info 'Installing exact API dependencies from package-lock.json.'
(cd "$API_DIR" && npm ci)
info 'Installing exact app dependencies from package-lock.json.'
(cd "$APP_DIR" && npm ci)

info 'Validating and starting PostgreSQL, Redis, MinIO, migrations, API, and worker.'
(cd "$API_DIR" && docker compose config --quiet && docker compose up -d --build)

info 'Waiting for the API health endpoint.'
attempt=0
until curl --silent --fail http://localhost:3000/health >/dev/null; do
  attempt=$((attempt + 1))
  [ "$attempt" -lt 30 ] || fail 'The API did not become healthy. Run npm run backend:logs from SnackTrackApp.'
  sleep 2
done

info 'Setup complete. Run npm run dev in SnackTrackApp.'
info 'MinIO console: http://localhost:9001 (local credentials are in SnackTrackAPI/docker-compose.yml).'
