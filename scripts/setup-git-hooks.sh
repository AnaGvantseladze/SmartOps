#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOKS_DIR="$ROOT/.githooks"
TARGET="$ROOT/.git/hooks/prepare-commit-msg"

mkdir -p "$ROOT/.git/hooks"
cp "$HOOKS_DIR/prepare-commit-msg" "$TARGET"
chmod +x "$TARGET"

echo "Installed prepare-commit-msg hook (strips Cursor attribution)."
