#!/usr/bin/env bash

set -euo pipefail

DEPLOYMENT_ID="${1:-${GAS_DEPLOYMENT_ID:-}}"
BASE_URL="${VITE_CARD_API_BASE_URL:-}"

if [[ -n "${DEPLOYMENT_ID}" ]]; then
  BASE_URL="https://script.google.com/macros/s/${DEPLOYMENT_ID}/exec"
fi

if [[ -z "${BASE_URL}" ]]; then
  echo "Usage: $0 <deployment-id>"
  echo "Or set GAS_DEPLOYMENT_ID / VITE_CARD_API_BASE_URL."
  exit 1
fi

cat <<EOF
VITE_CARD_API_BASE_URL=${BASE_URL}

# Optional operator env for local scripts only. Do not commit real values.
CARD_RUNTIME_SHEET_ID=PASTE_YOUR_GOOGLE_SHEET_ID
CARD_RUNTIME_SHEET_NAME=cards_runtime
CARD_ADMIN_WRITE_TOKEN=PASTE_YOUR_LONG_RANDOM_TOKEN
EOF
