#!/usr/bin/env bash
# Build sg16-transfer as an installable Android APK.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "Building APK..."
