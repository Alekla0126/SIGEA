#!/usr/bin/env bash
set -euo pipefail

BRANCH="${1:-main}"
APP_DIR="${APP_DIR:-/opt/sigea}"
PROJECT_NAME="${PROJECT_NAME:-sigea-v1}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.deploy.yml}"

compose() {
  docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" --env-file .env "$@"
}

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

compose build app

# Mantener DB estable y recrear solo el servicio app para no afectar otras instancias.
compose up -d --remove-orphans db

# up puede fallar si Docker aun esta removiendo el contenedor anterior. Reintenta unas veces.
set +e
status=1
for attempt in $(seq 1 6); do
  compose up -d --remove-orphans --no-deps --force-recreate app
  status=$?
  if [[ "$status" -eq 0 ]]; then
    break
  fi
  echo "docker compose up(app) fallo (intento $attempt/6). Reintentando..." >&2
  sleep 2
done
set -e

if [[ "$status" -ne 0 ]]; then
  echo "docker compose up(app) fallo despues de varios intentos." >&2
  exit "$status"
fi

echo "Esperando Postgres..."
ready=0
for _ in $(seq 1 30); do
  if compose exec -T db sh -lc 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'; then
    ready=1
    break
  fi
  sleep 1
done

if [[ "$ready" -ne 1 ]]; then
  echo "Postgres no respondio a tiempo; abortando migraciones." >&2
  compose ps >&2 || true
  exit 1
fi

compose exec -T app npm run db:migrate:deploy
compose exec -T app npm run db:seed

echo "Deploy completado: rama=$BRANCH proyecto=$PROJECT_NAME"
