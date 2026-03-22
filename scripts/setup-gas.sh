#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLASP_FILE="${ROOT_DIR}/.clasp.json"
CLASP_TEMPLATE="${ROOT_DIR}/.clasp.json.template"
SCRIPT_ROOT="gas/card-admin-webapp"
SCRIPT_ID="${GAS_SCRIPT_ID:-}"
TITLE="${GAS_PROJECT_TITLE:-line-liff-card admin backend}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

require_command clasp
require_command node

if ! clasp login --status >/dev/null 2>&1; then
  echo "clasp is not logged in."
  echo "Run: clasp login"
  exit 1
fi

echo "[setup-gas] clasp login status: ok"
echo "[setup-gas] Reminder: Apps Script API and Google Sheets API may still require manual enablement in Google Cloud / Apps Script."

if [[ -f "${CLASP_FILE}" ]]; then
  echo "[setup-gas] Found existing .clasp.json"
  cat "${CLASP_FILE}"
  exit 0
fi

if [[ -n "${SCRIPT_ID}" ]]; then
  node -e "const fs=require('node:fs');const path='${CLASP_FILE}';const payload={scriptId:process.env.GAS_SCRIPT_ID,rootDir:'${SCRIPT_ROOT}'};fs.writeFileSync(path,JSON.stringify(payload,null,2)+'\n');" \
    >/dev/null
  echo "[setup-gas] Wrote ${CLASP_FILE} from GAS_SCRIPT_ID"
  cat "${CLASP_FILE}"
  exit 0
fi

echo "[setup-gas] No .clasp.json or GAS_SCRIPT_ID found. Creating a new standalone Apps Script project."
(cd "${ROOT_DIR}" && clasp create --type standalone --title "${TITLE}" --rootDir "${SCRIPT_ROOT}")

if [[ ! -f "${CLASP_FILE}" ]]; then
  echo "[setup-gas] clasp create did not generate ${CLASP_FILE}."
  echo "Use ${CLASP_TEMPLATE} and fill in the real scriptId manually."
  exit 1
fi

echo "[setup-gas] Created ${CLASP_FILE}"
cat "${CLASP_FILE}"
