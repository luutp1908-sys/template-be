#!/usr/bin/env bash
set -euo pipefail

S3_BUCKET="${S3_BUCKET:-}"
S3_OBJECT_KEY="${S3_OBJECT_KEY:-}"
RDS_HOST="${RDS_HOST:-}"
RDS_PORT="${RDS_PORT:-5432}"
RDS_DB_NAME="${RDS_DB_NAME:-}"
RDS_USER="${RDS_USER:-}"
RDS_PASSWORD="${RDS_PASSWORD:-}"
AWS_REGION="${AWS_REGION:-ap-southeast-1}"
AWS_PROFILE="${AWS_PROFILE:-}"
BASTION_HOST="${BASTION_HOST:-}"
BASTION_USER="${BASTION_USER:-ec2-user}"
LOCAL_TUNNEL_PORT="${LOCAL_TUNNEL_PORT:-5433}"
DUMP_PATH="${DUMP_PATH:-/tmp/rds-restore.sql}"

if [[ -z "${S3_BUCKET}" || -z "${S3_OBJECT_KEY}" ]]; then
  echo "S3_BUCKET and S3_OBJECT_KEY are required."
  echo "Example: export S3_BUCKET='template-saas-db-backups'; export S3_OBJECT_KEY='database-backups/template_saas-20240901T000000Z.sql'"
  exit 1
fi

if [[ -z "${RDS_HOST}" || -z "${RDS_DB_NAME}" || -z "${RDS_USER}" || -z "${RDS_PASSWORD}" ]]; then
  echo "RDS_HOST, RDS_DB_NAME, RDS_USER and RDS_PASSWORD are required."
  exit 1
fi

echo "Downloading dump from S3..."
if [[ -n "${AWS_PROFILE}" ]]; then
  aws --profile "${AWS_PROFILE}" --region "${AWS_REGION}" s3 cp "s3://${S3_BUCKET}/${S3_OBJECT_KEY}" "${DUMP_PATH}"
else
  aws --region "${AWS_REGION}" s3 cp "s3://${S3_BUCKET}/${S3_OBJECT_KEY}" "${DUMP_PATH}"
fi

TARGET_HOST="${RDS_HOST}"
TARGET_PORT="${RDS_PORT}"
if [[ -n "${BASTION_HOST}" ]]; then
  echo "Opening SSH tunnel through bastion host '${BASTION_HOST}'..."
  ssh -o StrictHostKeyChecking=no -o ExitOnForwardFailure=yes \
    -N -L "${LOCAL_TUNNEL_PORT}:${RDS_HOST}:${RDS_PORT}" \
    "${BASTION_USER}@${BASTION_HOST}" &
  SSH_PID=$!
  trap 'kill "$SSH_PID" 2>/dev/null || true' EXIT
  sleep 5
  TARGET_HOST="127.0.0.1"
  TARGET_PORT="${LOCAL_TUNNEL_PORT}"
fi

echo "Restoring into RDS database '${RDS_DB_NAME}'..."
PGPASSWORD="${RDS_PASSWORD}" psql \
  "host=${TARGET_HOST} port=${TARGET_PORT} dbname=${RDS_DB_NAME} user=${RDS_USER} sslmode=require" \
  -v ON_ERROR_STOP=1 \
  -f "${DUMP_PATH}"

echo "Restore completed successfully."
