#!/usr/bin/env bash
set -euo pipefail

LOCAL_DB_NAME="${LOCAL_DB_NAME:-template_saas}"
LOCAL_DB_USER="${LOCAL_DB_USER:-postgres}"
LOCAL_DB_PASSWORD="${LOCAL_DB_PASSWORD:-postgres}"
LOCAL_DB_HOST="${LOCAL_DB_HOST:-localhost}"
LOCAL_DB_PORT="${LOCAL_DB_PORT:-5432}"

RDS_DATABASE_URL="${RDS_DATABASE_URL:-}"
RDS_HOST="${RDS_HOST:-}"
RDS_PORT="${RDS_PORT:-5432}"
RDS_DB_NAME="${RDS_DB_NAME:-}"
RDS_USER="${RDS_USER:-}"
RDS_PASSWORD="${RDS_PASSWORD:-}"
BASTION_HOST="${BASTION_HOST:-}"
BASTION_USER="${BASTION_USER:-ec2-user}"
LOCAL_TUNNEL_PORT="${LOCAL_TUNNEL_PORT:-5433}"
LOCAL_DUMP_PATH="${LOCAL_DUMP_PATH:-/tmp/${LOCAL_DB_NAME}-local.sql}"

if [[ -z "${RDS_DATABASE_URL}" && ( -z "${RDS_HOST}" || -z "${RDS_DB_NAME}" || -z "${RDS_USER}" || -z "${RDS_PASSWORD}" ) ]]; then
  echo "Missing RDS connection config."
  echo "Either set RDS_DATABASE_URL, or set RDS_HOST + RDS_DB_NAME + RDS_USER + RDS_PASSWORD."
  echo "Example:"
  echo "  export RDS_DATABASE_URL='postgresql://template_admin:YOUR_PASSWORD@template-saas-prod-postgres....rds.amazonaws.com:5432/template_saas_fresh_20260828?schema=public'"
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q '^template_saas_postgres$'; then
  echo "Starting local postgres container..."
  cd /Users/luu/Desktop/templates/be
  docker compose up -d postgres
fi

echo "Dumping local database '${LOCAL_DB_NAME}'..."
docker exec template_saas_postgres \
  sh -lc "PGPASSWORD='${LOCAL_DB_PASSWORD}' pg_dump -U ${LOCAL_DB_USER} -d ${LOCAL_DB_NAME} --clean --if-exists --no-owner --no-privileges > /tmp/${LOCAL_DB_NAME}-local.sql"

docker cp "template_saas_postgres:/tmp/${LOCAL_DB_NAME}-local.sql" "${LOCAL_DUMP_PATH}"

if [[ -n "${BASTION_HOST}" ]]; then
  echo "Using SSH tunnel through bastion host '${BASTION_HOST}'..."
  ssh -o StrictHostKeyChecking=no -o ExitOnForwardFailure=yes \
    -N -L "${LOCAL_TUNNEL_PORT}:${RDS_HOST}:${RDS_PORT}" \
    "${BASTION_USER}@${BASTION_HOST}" &
  SSH_PID=$!
  trap 'kill "$SSH_PID" 2>/dev/null || true' EXIT

  python3 - <<'PY'
import socket
import time
import os
port = int(os.environ.get('LOCAL_TUNNEL_PORT', '5433'))
for _ in range(30):
    s = socket.socket()
    s.settimeout(1)
    try:
        s.connect(('127.0.0.1', port))
        s.close()
        break
    except OSError:
        time.sleep(1)
else:
    raise SystemExit(f"Tunnel to localhost:{port} was not ready in time.")
PY

  export PGPASSWORD="${RDS_PASSWORD}"
  psql "host=127.0.0.1 port=${LOCAL_TUNNEL_PORT} dbname=${RDS_DB_NAME} user=${RDS_USER} sslmode=disable" \
    -v ON_ERROR_STOP=1 \
    -f "${LOCAL_DUMP_PATH}"

  exit 0
fi

echo "Restoring dump into AWS RDS..."
if [[ -n "${RDS_DATABASE_URL}" ]]; then
  psql "${RDS_DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${LOCAL_DUMP_PATH}"
else
  export PGPASSWORD="${RDS_PASSWORD}"
  psql "host=${RDS_HOST} port=${RDS_PORT} dbname=${RDS_DB_NAME} user=${RDS_USER} sslmode=require" \
    -v ON_ERROR_STOP=1 \
    -f "${LOCAL_DUMP_PATH}"
fi

echo "Restore complete."
echo "You can validate with:"
echo "  psql \"${RDS_DATABASE_URL:-postgresql://${RDS_USER}@${RDS_HOST}:${RDS_PORT}/${RDS_DB_NAME}?sslmode=require}\" -c '\\dt'"
