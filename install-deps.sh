#!/usr/bin/env bash
set -euo pipefail

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed in this Ubuntu environment."
  echo "Install it with one of these options:"
  echo "  Option A (recommended): nvm + latest LTS"
  echo "    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash"
  echo "    source ~/.nvm/nvm.sh"
  echo "    nvm install --lts"
  echo "  Option B: sudo apt install -y nodejs npm"
  exit 1
fi

echo "Using Node $(node -v)"
echo "Using npm  $(npm -v)"

npm install

echo "Dependencies installed."
