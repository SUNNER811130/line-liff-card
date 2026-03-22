#!/usr/bin/env bash

set -euo pipefail

search_files() {
  local pattern="$1"
  shift

  if command -v rg >/dev/null 2>&1; then
    rg "$pattern" "$@"
    return
  fi

  grep -R --line-number --extended-regexp "$pattern" "$@"
}

search_quiet() {
  local pattern="$1"
  shift

  if command -v rg >/dev/null 2>&1; then
    rg -q "$pattern" "$@"
    return
  fi

  grep -R --quiet --extended-regexp "$pattern" "$@"
}

npm run build

test -d dist
test -r dist/404.html
test -r dist/index.html
test -r dist/admin/index.html
test -r dist/card/default/index.html
test -r dist/card/demo-consultant/index.html
grep -q '<div id="root"></div>' dist/index.html
grep -q '<div id="root"></div>' dist/admin/index.html
search_quiet 'getCard|action:"getCard"' dist/assets
search_quiet '正式後台|電子名片管理' dist/assets
if search_files "example\\.com|line\\.ee/example|alex@example\\.com" dist; then
  echo "placeholder links still exist in dist"
  exit 1
fi
