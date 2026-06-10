#!/bin/zsh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE_DIR="$ROOT_DIR/chillstock-guest/convex"

for target in chillstock-management chillstock-restocker; do
  rsync -a --delete "$SOURCE_DIR/" "$ROOT_DIR/$target/convex/"
done
