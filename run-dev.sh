#!/usr/bin/env bash
set -euo pipefail

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is missing. Run ./install-deps.sh after installing Node in Ubuntu."
  exit 1
fi

# 0.0.0.0 lets Windows browser access the WSL dev server consistently.
npm run dev -- --host 0.0.0.0 --port 5173
