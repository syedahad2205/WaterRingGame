#!/usr/bin/env bash
# validateFileStructure.sh — task 1.1.1a
# Checks that all required folders exist relative to the project root.
# Exits 0 on success, 1 if any folder is missing.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

REQUIRED_DIRS=(
  "src/app"
  "src/components"
  "src/constants"
  "src/features"
  "src/hooks"
  "src/screens"
  "src/services"
  "src/store"
  "src/types"
  "src/utils"
  "__tests__/unit"
  "__tests__/property"
  "__tests__/integration"
  "__tests__/fixtures"
  "functions/src"
  "android"
  "ios"
)

FAILED=0

for dir in "${REQUIRED_DIRS[@]}"; do
  full_path="$ROOT/$dir"
  if [ -d "$full_path" ]; then
    echo "✓ $dir"
  else
    echo "✗ Missing: $dir"
    FAILED=1
  fi
done

if [ "$FAILED" -eq 0 ]; then
  echo ""
  echo "✓ Folder structure valid"
  exit 0
else
  echo ""
  echo "✗ Folder structure validation FAILED"
  exit 1
fi
