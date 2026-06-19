#!/bin/bash
# QuestKids Database Backup Script
# Dumps PostgreSQL to a timestamped SQL file, keeps last 7 daily backups.
#
# Usage: ./scripts/backup-db.sh
# Cron: 0 3 * * * /home/openclaw/.openclaw/workspace/questkids/scripts/backup-db.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-${SCRIPT_DIR}/../backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/questkids_${TIMESTAMP}.sql"

# Load environment
if [ -f "${SCRIPT_DIR}/../.env" ]; then
    set -a
    source "${SCRIPT_DIR}/../.env"
    set +a
fi

DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-questkids}"
DB_PASSWORD="${DB_PASSWORD:-questkids}"
DB_NAME="${DB_NAME:-questkids}"

mkdir -p "${BACKUP_DIR}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting QuestKids database backup..."

# Try Docker-based dump first (if DB is in docker-compose)
if command -v docker &> /dev/null && docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'questkids.*db'; then
    CONTAINER=$(docker ps --format '{{.Names}}' | grep 'questkids.*db' | head -1)
    echo "[INFO] Dumping via Docker container: ${CONTAINER}"
    docker exec "${CONTAINER}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" > "${BACKUP_FILE}"
elif command -v pg_dump &> /dev/null; then
    echo "[INFO] Dumping via local pg_dump"
    PGPASSWORD="${DB_PASSWORD}" pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" > "${BACKUP_FILE}"
else
    echo "[WARN] Neither Docker nor pg_dump found. Skipping backup."
    exit 0
fi

if [ $? -eq 0 ] && [ -s "${BACKUP_FILE}" ]; then
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "[OK] Backup created: ${BACKUP_FILE} (${BACKUP_SIZE})"
    # Compress
    gzip -f "${BACKUP_FILE}"
    echo "[OK] Compressed: ${BACKUP_FILE}.gz"
else
    echo "[ERROR] Backup failed!"
    exit 1
fi

# Cleanup old backups
echo "[INFO] Cleaning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "questkids_*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete 2>/dev/null || true

BACKUP_COUNT=$(find "${BACKUP_DIR}" -name "questkids_*.sql.gz" | wc -l)
echo "[OK] Backup complete. ${BACKUP_COUNT} backups retained."
