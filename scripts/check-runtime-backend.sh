#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_URL="${1:-${VITE_CARD_API_BASE_URL:-}}"
WRITE_TOKEN="${CARD_ADMIN_WRITE_TOKEN:-}"
SLUG="${CARD_RUNTIME_SLUG:-default}"
UPDATED_BY="${CARD_ADMIN_UPDATED_BY:-check-runtime-backend.sh}"

if [[ -z "${BASE_URL}" ]]; then
  echo "Usage: $0 <web-app-exec-url>"
  echo "Or set VITE_CARD_API_BASE_URL in the environment."
  exit 1
fi

echo "[check-runtime-backend] health check: ${BASE_URL}"
node "${ROOT_DIR}/scripts/_run-health-check.mjs" "${BASE_URL}" "${SLUG}"

if [[ -n "${WRITE_TOKEN}" ]]; then
  echo "[check-runtime-backend] POST initBackend smoke check"
  node "${ROOT_DIR}/scripts/init-runtime-sheet.mjs" \
    --base-url "${BASE_URL}" \
    --write-token "${WRITE_TOKEN}" \
    --updated-by "${UPDATED_BY}"
else
  echo "[check-runtime-backend] CARD_ADMIN_WRITE_TOKEN not set; skipping POST initBackend smoke check."
fi
