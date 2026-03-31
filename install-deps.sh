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

# Prefer native Linux npm CLI if available to avoid Windows cmd.exe in WSL.
if [ -f "/usr/share/nodejs/npm/bin/npm-cli.js" ]; then
  NPM_CMD=("/usr/bin/node" "/usr/share/nodejs/npm/bin/npm-cli.js")
elif command -v npm >/dev/null 2>&1 && [[ "$(command -v npm)" != /mnt/c/* ]]; then
  NPM_CMD=("npm")
else
  echo "A Linux npm installation was not found (or Windows npm is first on PATH)."
  echo "Install npm inside Ubuntu, then rerun this script:"
  echo "  sudo apt-get update && sudo apt-get install -y npm"
  exit 1
fi

echo "Using Node $(node -v)"
echo "Using npm  $(${NPM_CMD[@]} -v)"

${NPM_CMD[@]} install

echo "Dependencies installed."
