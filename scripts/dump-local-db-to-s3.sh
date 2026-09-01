#!/usr/bin/env bash
set -euo pipefail

LOCAL_DB_NAME="${LOCAL_DB_NAME:-template_saas}"
LOCAL_DB_USER="${LOCAL_DB_USER:-postgres}"
LOCAL_DB_PASSWORD="${LOCAL_DB_PASSWORD:-postgres}"
AWS_S3_BUCKET="${AWS_S3_BUCKET:-}"
AWS_REGION="${AWS_REGION:-ap-southeast-1}"
AWS_PROFILE="${AWS_PROFILE:-}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUMP_PATH="${DUMP_PATH:-/tmp/${LOCAL_DB_NAME}-${TIMESTAMP}.sql}"

if [[ -z "${AWS_S3_BUCKET}" ]]; then
  echo "AWS_S3_BUCKET is required. Example: export AWS_S3_BUCKET='template-saas-db-backups'"
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q '^template_saas_postgres$'; then
  echo "Starting local postgres container..."
  cd /Users/luu/Desktop/templates/be
  docker compose up -d postgres
fi

echo "Creating dump for local database '${LOCAL_DB_NAME}'..."
docker exec template_saas_postgres \
  sh -lc "PGPASSWORD='${LOCAL_DB_PASSWORD}' pg_dump -U ${LOCAL_DB_USER} -d ${LOCAL_DB_NAME} --clean --if-exists --no-owner --no-privileges > /tmp/${LOCAL_DB_NAME}-local.sql"

docker cp "template_saas_postgres:/tmp/${LOCAL_DB_NAME}-local.sql" "${DUMP_PATH}"

echo "Uploading dump to S3..."
if [[ -n "${AWS_PROFILE}" ]]; then
  AWS_CMD=(aws --profile "${AWS_PROFILE}" --region "${AWS_REGION}" s3 cp "${DUMP_PATH}" "s3://${AWS_S3_BUCKET}/database-backups/${LOCAL_DB_NAME}-${TIMESTAMP}.sql")
else
  AWS_CMD=(aws --region "${AWS_REGION}" s3 cp "${DUMP_PATH}" "s3://${AWS_S3_BUCKET}/database-backups/${LOCAL_DB_NAME}-${TIMESTAMP}.sql")
fi
"${AWS_CMD[@]}"

echo "Local dump uploaded successfully: s3://${AWS_S3_BUCKET}/database-backups/${LOCAL_DB_NAME}-${TIMESTAMP}.sql"
