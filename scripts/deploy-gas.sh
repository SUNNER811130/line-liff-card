#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLASP_FILE="${ROOT_DIR}/.clasp.json"
SHEET_ID="${CARD_RUNTIME_SHEET_ID:-}"
SHEET_NAME="${CARD_RUNTIME_SHEET_NAME:-cards_runtime}"
WRITE_TOKEN="${CARD_ADMIN_WRITE_TOKEN:-}"
UPDATED_BY="${CARD_ADMIN_UPDATED_BY:-deploy-gas.sh}"
DEPLOYMENT_ID="${GAS_DEPLOYMENT_ID:-}"
VERSION_NOTE="${GAS_VERSION_NOTE:-line-liff-card admin backend deploy}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

require_command clasp
require_command node

if [[ ! -f "${CLASP_FILE}" ]]; then
  echo "Missing ${CLASP_FILE}. Run ./scripts/setup-gas.sh first."
  exit 1
fi

if ! clasp list >/dev/null 2>&1; then
  echo "clasp is not logged in. Run: clasp login"
  exit 1
fi

echo "[deploy-gas] clasp push --force"
(cd "${ROOT_DIR}" && clasp push --force)

echo "[deploy-gas] Creating version"
VERSION_OUTPUT="$(cd "${ROOT_DIR}" && clasp version "${VERSION_NOTE}")"
echo "${VERSION_OUTPUT}"
VERSION_NUMBER="$(printf '%s\n' "${VERSION_OUTPUT}" | sed -n 's/.*Created version \([0-9][0-9]*\).*/\1/p' | tail -n 1)"

if [[ -z "${VERSION_NUMBER}" ]]; then
  echo "[deploy-gas] Could not parse version number from clasp output."
  exit 1
fi

if [[ -n "${DEPLOYMENT_ID}" ]]; then
  echo "[deploy-gas] Updating deployment ${DEPLOYMENT_ID}"
  DEPLOY_OUTPUT="$(cd "${ROOT_DIR}" && clasp deploy --deploymentId "${DEPLOYMENT_ID}" --description "${VERSION_NOTE}" --versionNumber "${VERSION_NUMBER}")"
else
  echo "[deploy-gas] Creating new web app deployment"
  DEPLOY_OUTPUT="$(cd "${ROOT_DIR}" && clasp deploy --description "${VERSION_NOTE}" --versionNumber "${VERSION_NUMBER}")"
fi

echo "${DEPLOY_OUTPUT}"

FINAL_DEPLOYMENT_ID="$(printf '%s\n' "${DEPLOY_OUTPUT}" | grep -o 'AKfycb[[:alnum:]_-]*' | tail -n 1)"

if [[ -z "${FINAL_DEPLOYMENT_ID}" ]]; then
  FINAL_DEPLOYMENT_ID="${DEPLOYMENT_ID}"
fi

if [[ -z "${FINAL_DEPLOYMENT_ID}" ]]; then
  echo "[deploy-gas] Could not determine deployment id from clasp output."
  exit 1
fi

EXEC_URL="https://script.google.com/macros/s/${FINAL_DEPLOYMENT_ID}/exec"
echo "[deploy-gas] Web app exec URL: ${EXEC_URL}"
echo "[deploy-gas] Suggested front-end env:"
"${ROOT_DIR}/scripts/print-admin-env.sh" "${FINAL_DEPLOYMENT_ID}"

if [[ -n "${WRITE_TOKEN}" ]]; then
  echo "[deploy-gas] Initializing runtime sheet via web app"
  node "${ROOT_DIR}/scripts/init-runtime-sheet.mjs" \
    --base-url "${EXEC_URL}" \
    --write-token "${WRITE_TOKEN}" \
    --sheet-id "${SHEET_ID}" \
    --sheet-name "${SHEET_NAME}" \
    --updated-by "${UPDATED_BY}" || {
      echo "[deploy-gas] init-runtime-sheet failed. This usually means Google authorization or web app access settings still need manual completion."
      exit 1
    }
else
  echo "[deploy-gas] CARD_ADMIN_WRITE_TOKEN missing. Skipping runtime sheet initialization."
fi

echo "[deploy-gas] Running backend checks"
VITE_CARD_API_BASE_URL="${EXEC_URL}" CARD_ADMIN_WRITE_TOKEN="${WRITE_TOKEN}" CARD_ADMIN_UPDATED_BY="${UPDATED_BY}" \
  "${ROOT_DIR}/scripts/check-runtime-backend.sh" "${EXEC_URL}"
