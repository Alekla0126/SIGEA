#!/usr/bin/env bash
set -euo pipefail

BRANCH="${1:-main}"
APP_DIR="${APP_DIR:-/opt/sigea}"
PROJECT_NAME="${PROJECT_NAME:-sigea-v1}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.deploy.yml}"

if [[ ! -d "$APP_DIR" ]]; then
  echo "No existe $APP_DIR" >&2
  exit 1
fi

cd "$APP_DIR"

git fetch --all --prune
git checkout "$BRANCH"
git pull origin "$BRANCH"

if [[ -f ".env.$BRANCH" ]]; then
  cp ".env.$BRANCH" .env
elif [[ -f ".env.deploy" ]]; then
  cp ".env.deploy" .env
fi

if [[ ! -f ".env" ]]; then
  echo "Falta archivo .env en $APP_DIR (.env.$BRANCH o .env.deploy)" >&2
  exit 1
fi

docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" --env-file .env build app
docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" --env-file .env up -d

docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" --env-file .env exec -T app npm run db:migrate:deploy
docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" --env-file .env exec -T app npm run db:seed

echo "Deploy completado: rama=$BRANCH proyecto=$PROJECT_NAME"
