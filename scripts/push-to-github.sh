#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [ $# -lt 1 ]; then echo "Usage: bash scripts/push-to-github.sh <github-repo-url>"; exit 1; fi
URL="$1"
if git remote get-url github >/dev/null 2>&1; then git remote set-url github "$URL"; else git remote add github "$URL"; fi
git push -u github main
