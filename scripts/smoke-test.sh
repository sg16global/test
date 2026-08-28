#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-http://127.0.0.1:43124}"

echo "→ health"
health=$(curl -sf "$BASE/api/health")
echo "$health" | grep -q '"ok":true' || { echo "FAIL health"; exit 1; }

echo "→ create room"
room=$(curl -sf -X POST "$BASE/api/rooms" \
  -H "Content-Type: application/json" \
  -d '{"name":"SmokeTest","device":"pc"}')
code=$(echo "$room" | grep -o '"code":"[^"]*"' | cut -d'"' -f4)
[[ ${#code} -ge 4 ]] || { echo "FAIL room code: $room"; exit 1; }

echo "→ fetch room $code"
curl -sf "$BASE/api/rooms/$code" >/dev/null

echo "→ homepage"
curl -sf -o /dev/null -w "HTTP %{http_code}\n" "$BASE/" | grep -q "200"

echo "✓ all smoke tests passed ($BASE)"
