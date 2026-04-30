#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

NODE_IMAGE="node:20.19.0-bookworm-slim"
REQUIRED_PACKED_FILES=(
  "package/dist/index.js"
  "package/README.md"
  "package/LICENSE"
  "package/package.json"
)
DEVELOPMENT_ONLY_PATH_PATTERN="^package/(src|bin|tests|scripts)/"

bun run build >/dev/null

PACKAGE_VERSION="$(node -p "require('./package.json').version")"
PACK_OUTPUT="$(npm pack --json --ignore-scripts)"
TARBALL="$(node -e "const fs = require('node:fs'); const data = JSON.parse(fs.readFileSync(0, 'utf8')); console.log(data[0].filename)" <<<"$PACK_OUTPUT")"
PACK_FILES=""

cleanup() {
  rm -f "$ROOT/$TARBALL"
  if [[ -n "$PACK_FILES" ]]; then
    rm -f "$PACK_FILES"
  fi
}
trap cleanup EXIT

PACK_FILES="$(mktemp)"
tar -tf "$TARBALL" | sort > "$PACK_FILES"

for required_file in "${REQUIRED_PACKED_FILES[@]}"; do
  grep -qx "$required_file" "$PACK_FILES"
done

if grep -Eq "$DEVELOPMENT_ONLY_PATH_PATTERN" "$PACK_FILES"; then
  echo "Packed tarball contains development-only files:" >&2
  grep -E "$DEVELOPMENT_ONLY_PATH_PATTERN" "$PACK_FILES" >&2
  exit 1
fi

docker run --rm \
  -e PACKAGE_VERSION="$PACKAGE_VERSION" \
  -e TARBALL="$TARBALL" \
  -v "$ROOT:/work" \
  -w /tmp \
  "$NODE_IMAGE" \
  sh -lc '
    npm exec --yes --package "/work/$TARBALL" -- agentbar --help >/tmp/agentbar-npm-exec-help.txt
    npm install -g "/work/$TARBALL" --loglevel=error
    agentbar --help >/tmp/agentbar-help.txt
    test "$(agentbar --version)" = "$PACKAGE_VERSION"
  '
