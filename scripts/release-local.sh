#!/usr/bin/env bash
#
# Local mirror of .github/workflows/release.yml. Does, on your machine, what the
# `release` + `update-ui-crate` jobs do in CI (minus the GitHub release / PR):
#
#   1. Build web-ui
#   2. Zip the build as ui-v<version>.zip
#   3. Refresh the local restate-web-ui-crate checkout
#      (swap the asset, bump the crate version, cargo build)
#
# Usage:
#   scripts/release-local.sh [path-to-restate-web-ui-crate]
#   CRATE_DIR=/path/to/crate scripts/release-local.sh
#
# Defaults to the sibling checkout at ../restate-web-ui-crate.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CRATE_DIR_INPUT="${1:-${CRATE_DIR:-$REPO_DIR/../restate-web-ui-crate}}"

if [ ! -f "$CRATE_DIR_INPUT/Cargo.toml" ]; then
  echo "error: no Cargo.toml at '$CRATE_DIR_INPUT' — pass the crate path as an arg or set CRATE_DIR" >&2
  exit 1
fi
CRATE_DIR="$(cd "$CRATE_DIR_INPUT" && pwd)"

if ! command -v cargo-set-version >/dev/null 2>&1; then
  echo "error: cargo-set-version not found — install with: cargo install cargo-set-version" >&2
  exit 1
fi

VERSION="$(node -p "require('$REPO_DIR/package.json').version")"
ARTIFACT="ui-v${VERSION}.zip"
BUILD_DIR="$REPO_DIR/dist/apps/web-ui"
STAGED_ZIP="$REPO_DIR/dist/$ARTIFACT"

echo "==> web-ui:   $REPO_DIR"
echo "==> crate:    $CRATE_DIR"
echo "==> version:  $VERSION  ($ARTIFACT)"

echo "==> [1/3] Building web-ui..."
cd "$REPO_DIR"
pnpm nx build web-ui --skip-nx-cache
if [ ! -d "$BUILD_DIR" ]; then
  echo "error: build output not found at $BUILD_DIR" >&2
  exit 1
fi

echo "==> [2/3] Zipping $ARTIFACT..."
rm -f "$STAGED_ZIP"
( cd "$BUILD_DIR" && zip -qr "$STAGED_ZIP" . )

echo "==> [3/3] Updating crate..."
rm -f "$CRATE_DIR"/assets/*.zip
cp "$STAGED_ZIP" "$CRATE_DIR/assets/$ARTIFACT"
( cd "$CRATE_DIR" && cargo set-version "$VERSION" && cargo build )

echo "==> Done."
echo "    asset:  $CRATE_DIR/assets/$ARTIFACT ($(du -h "$CRATE_DIR/assets/$ARTIFACT" | cut -f1))"
echo "    sha256: $(shasum -a 256 "$CRATE_DIR/assets/$ARTIFACT" | awk '{print $1}')"
