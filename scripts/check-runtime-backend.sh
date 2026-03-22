#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_URL="${1:-${VITE_CARD_API_BASE_URL:-}}"
SLUG="${CARD_RUNTIME_SLUG:-default}"

if [[ -z "${BASE_URL}" ]]; then
  echo "Usage: $0 <web-app-exec-url>"
  echo "Or set VITE_CARD_API_BASE_URL in the environment."
  exit 1
fi

echo "[check-runtime-backend] health check: ${BASE_URL}"
node "${ROOT_DIR}/scripts/_run-health-check.mjs" "${BASE_URL}" "${SLUG}"
