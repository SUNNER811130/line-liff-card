#!/usr/bin/env bash

set -euo pipefail

npm run build

test -d dist
test -r dist/404.html
test -r dist/index.html
test -r dist/card/default/index.html
grep -q '<div id="root"></div>' dist/index.html
if rg -n "example\\.com|line\\.ee/example|alex@example\\.com" dist; then
  echo "placeholder links still exist in dist"
  exit 1
fi
