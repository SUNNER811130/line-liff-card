#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLASP_FILE="${ROOT_DIR}/.clasp.json"
SCRIPT_ROOT="gas/card-admin-webapp"
SCRIPT_ID="${GAS_SCRIPT_ID:-}"
TITLE="${GAS_PROJECT_TITLE:-line-liff-card admin backend v2}"
RECREATE="${GAS_RECREATE:-0}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

write_clasp_file() {
  local target_script_id="$1"
  node --input-type=module -e "import fs from 'node:fs'; fs.writeFileSync('${CLASP_FILE}', JSON.stringify({ scriptId: '${target_script_id}', rootDir: '${SCRIPT_ROOT}' }, null, 2) + '\n');"
}

require_command clasp
require_command node

if ! clasp list >/dev/null 2>&1; then
  echo "clasp is not logged in."
  echo "Run: clasp login"
  exit 1
fi

echo "[setup-gas] clasp login status: ok"

if [[ -n "${SCRIPT_ID}" ]]; then
  write_clasp_file "${SCRIPT_ID}"
  echo "[setup-gas] Updated ${CLASP_FILE} from GAS_SCRIPT_ID"
  cat "${CLASP_FILE}"
  exit 0
fi

if [[ -f "${CLASP_FILE}" && "${RECREATE}" != "1" ]]; then
  echo "[setup-gas] Found existing ${CLASP_FILE}"
  echo "[setup-gas] Set GAS_RECREATE=1 to create a brand new standalone GAS project."
  cat "${CLASP_FILE}"
  exit 0
fi

if [[ -f "${CLASP_FILE}" && "${RECREATE}" == "1" ]]; then
  rm -f "${CLASP_FILE}"
fi

TMP_DIR="$(mktemp -d /tmp/line-liff-card-gas-setup.XXXXXX)"
trap 'rm -rf "${TMP_DIR}"' EXIT

echo "[setup-gas] Creating a new standalone Apps Script project: ${TITLE}"
(cd "${TMP_DIR}" && clasp create --type standalone --title "${TITLE}")

TMP_CLASP_FILE="${TMP_DIR}/.clasp.json"
if [[ ! -f "${TMP_CLASP_FILE}" ]]; then
  echo "[setup-gas] clasp create did not generate ${TMP_CLASP_FILE}."
  exit 1
fi

SCRIPT_ID="$(node --input-type=module -e "import fs from 'node:fs'; const payload = JSON.parse(fs.readFileSync('${TMP_CLASP_FILE}', 'utf8')); process.stdout.write(payload.scriptId || '');")"
if [[ -z "${SCRIPT_ID}" ]]; then
  echo "[setup-gas] Could not read scriptId from ${TMP_CLASP_FILE}."
  exit 1
fi

write_clasp_file "${SCRIPT_ID}"
echo "[setup-gas] Created ${CLASP_FILE}"
cat "${CLASP_FILE}"
