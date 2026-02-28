#!/bin/bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m'

log()     { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()      { echo -e "${GREEN}[OK]${NC} $1"; }
err()     { echo -e "${RED}[ERROR]${NC} $1" >&2; exit 1; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
section() { echo -e "\n${BLUE}━━━ $1 ━━━${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cleanup() {
  echo ""
  log "Shutting down all services..."
  kill $(jobs -p) 2>/dev/null || true
  ok "All services stopped."
}
trap cleanup EXIT INT TERM

section "Installing Dependencies"

INSTALL_SCRIPT="$SCRIPT_DIR/install-dependencies.sh"

if [ ! -f "$INSTALL_SCRIPT" ]; then
  err "install-dependencies.sh not found at $INSTALL_SCRIPT"
fi

chmod +x "$INSTALL_SCRIPT"
bash "$INSTALL_SCRIPT" || err "Dependency installation failed"
ok "Dependencies ready"

section "Starting Next.js Frontend"

npm run dev &
NEXTJS_PID=$!
ok "Next.js started (PID: $NEXTJS_PID)"

section "Starting Ollama"

if ! command -v ollama &>/dev/null; then
  err "'ollama' not found. Please install it from https://ollama.com"
fi

if ollama list &>/dev/null 2>&1; then
  warn "Ollama is already running, skipping..."
else
  ollama serve &
  OLLAMA_PID=$!
  ok "Ollama started (PID: $OLLAMA_PID)"

  log "Waiting for Ollama to be ready..."
  sleep 3
fi

section "Starting FastAPI Backend"

cd "$SCRIPT_DIR/backend"
source .venv/bin/activate || err "Could not activate venv — run install-dependencies.sh first"
fastapi run ExposeAPI.py &
FASTAPI_PID=$!
cd "$SCRIPT_DIR"
ok "FastAPI started (PID: $FASTAPI_PID)"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  All services are up! Press Ctrl+C to stop.${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

wait