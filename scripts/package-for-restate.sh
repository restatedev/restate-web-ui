#!/usr/bin/env bash
set -euo pipefail

if [ $# -gt 1 ]; then
  echo "usage: $0 [<restate-repo>]" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(node -p "require('$ROOT/package.json').version")"
ZIP="$ROOT/dist/ui-v$VERSION.zip"

cd "$ROOT"
pnpm nx build web-ui
rm -f "$ZIP"
(cd dist/apps/web-ui && zip -qr "$ZIP" .)
echo "built $ZIP"

if [ $# -eq 1 ]; then
  ASSETS="$1/crates/web-ui/assets"
  if [ ! -d "$ASSETS" ]; then
    echo "$ASSETS doesn't exist" >&2
    exit 1
  fi
  rm -f "$ASSETS"/ui-*.zip
  cp "$ZIP" "$ASSETS/"
  echo "copied to $ASSETS/$(basename "$ZIP")"
fi
