#!/usr/bin/env bash
# ============================================================
# AI Virtual Try-On -- Start Script
# Services:
#   Backend API  (Oxylabs/Amazon)  port 8000  (pip venv)
#   Model API    (CatVTON)         port 8001  (uv)
#   Frontend     (React/Vite)      port 5173  (npm)
# ============================================================
set -euo pipefail

# Ensure uv is on PATH (installed in ~/.local/bin)
export PATH="$HOME/.local/bin:$PATH"

PROJECT_ROOT="$(dirname "$(realpath "$0")")"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend/frontend"
LOG_DIR="$PROJECT_ROOT/.logs"
mkdir -p "$LOG_DIR"

GREEN='\033[0;32m' YELLOW='\033[1;33m' RED='\033[0;31m'
CYAN='\033[0;36m'  RESET='\033[0m'

log()  { echo -e "${CYAN}[$(date +%H:%M:%S)]${RESET} $*"; }
ok()   { echo -e "${GREEN}[OK]${RESET} $*"; }
warn() { echo -e "${YELLOW}[WARN]${RESET} $*"; }
err()  { echo -e "${RED}[ERROR]${RESET} $*" >&2; }

PIDS=()
cleanup() {
  log "Stopping all services..."
  for pid in "${PIDS[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# -- 1. Backend (Amazon/Oxylabs API) -----------------------------------
log "Starting Backend API (port 8000)..."
[ ! -f "$BACKEND_DIR/.env" ] && \
  warn "backend/.env missing -- copy .env.example and add Oxylabs credentials"

BACKEND_VENV="$BACKEND_DIR/.venv"
if [ ! -d "$BACKEND_VENV" ]; then
  log "Setting up backend virtual environment..."
  python3 -m venv "$BACKEND_VENV"
  "$BACKEND_VENV/bin/pip" install -q --upgrade pip
  "$BACKEND_VENV/bin/pip" install -q -r "$BACKEND_DIR/requirements.txt"
  ok "Backend venv ready"
fi

PYTHONPATH="$PROJECT_ROOT" \
  "$BACKEND_VENV/bin/uvicorn" backend.main:app \
  --host 127.0.0.1 --port 8000 \
  > "$LOG_DIR/backend.log" 2>&1 &
PIDS+=($!)
ok "Backend API -> http://127.0.0.1:8000  (log: $LOG_DIR/backend.log)"

# -- 2. Model API (CatVTON / uv) ---------------------------------------
log "Starting Model API (port 8001)..."
if ! command -v uv &>/dev/null; then
  err "uv not found. Install: curl -LsSf https://astral.sh/uv/install.sh | sh"
  exit 1
fi

(cd "$PROJECT_ROOT" && uv run uvicorn model_api.main:app \
    --host 127.0.0.1 --port 8001 \
    > "$LOG_DIR/model_api.log" 2>&1) &
PIDS+=($!)
ok "Model API  -> http://127.0.0.1:8001  (log: $LOG_DIR/model_api.log)"

# -- 3. Frontend (React/Vite / npm) ------------------------------------
log "Starting Frontend dev server (port 5173)..."
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  log "Installing npm dependencies (first run)..."
  npm --prefix "$FRONTEND_DIR" install
  ok "npm install complete"
fi

npm --prefix "$FRONTEND_DIR" run dev > "$LOG_DIR/frontend.log" 2>&1 &
PIDS+=($!)
ok "Frontend   -> http://localhost:5173  (log: $LOG_DIR/frontend.log)"

# -- Summary -----------------------------------------------------------
sleep 3
echo ""
echo -e "${GREEN}================================================${RESET}"
echo -e "${GREEN}  AI Virtual Try-On -- All Services Running     ${RESET}"
echo -e "${GREEN}================================================${RESET}"
echo -e "  Frontend  ->  ${CYAN}http://localhost:5173${RESET}"
echo -e "  Backend   ->  ${CYAN}http://127.0.0.1:8000${RESET}"
echo -e "  Model API ->  ${CYAN}http://127.0.0.1:8001${RESET}"
echo -e "  Logs      ->  ${CYAN}$LOG_DIR/${RESET}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services.${RESET}"
echo ""
wait "${PIDS[@]}"
