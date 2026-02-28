#!/bin/bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()  { echo -e "${GREEN}[OK]${NC} $1"; }
err() { echo -e "${RED}[ERROR]${NC} $1" >&2; exit 1; }

log "Installing Next.js dependencies..."
npm install || err "npm install failed"
ok "Node dependencies installed"

if command -v python &>/dev/null; then
  PYTHON=python
elif command -v python3 &>/dev/null; then
  PYTHON=python3
else
  err "Neither 'python' nor 'python3' was found. Please install Python."
fi
log "Using Python binary: $PYTHON"

VENV_DIR="backend/.venv"

if [ -f "$VENV_DIR/bin/activate" ]; then
  log "Existing virtual environment found at $VENV_DIR, reusing it..."
else
  log "No virtual environment found, creating one at $VENV_DIR..."
  $PYTHON -m venv "$VENV_DIR" || err "Failed to create virtual environment"
  ok "Virtual environment created"
fi

log "Activating virtual environment..."
# shellcheck source=/dev/null
source "$VENV_DIR/bin/activate" || err "Failed to activate virtual environment"
ok "Virtual environment activated"

log "Installing Python dependencies..."
pip install -r backend/requirements.txt || err "pip install failed"
ok "Python dependencies installed"

ok "All dependencies installed successfully!"