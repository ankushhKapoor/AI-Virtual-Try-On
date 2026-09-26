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
  echo ""
  log "Stopping all services..."
  for pid in "${PIDS[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  log "All services stopped."
}
trap cleanup EXIT INT TERM

# -- 1. Backend (Amazon/Oxylabs API, pip venv, port 8000) ------------------
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

( cd "$PROJECT_ROOT" && "$BACKEND_VENV/bin/uvicorn" backend.main:app \
  --host 0.0.0.0 --port 8000 \
  2>&1 | tee "$LOG_DIR/backend.log" | sed "s/^/[backend] /" ) &
PIDS+=($!)
ok "Backend API started -> http://0.0.0.0:8000"

# -- 2. Model API (CatVTON / uv, port 8001) --------------------------------
log "Starting Model API (port 8001)..."
if ! command -v uv &>/dev/null; then
  err "uv not found. Install: curl -LsSf https://astral.sh/uv/install.sh | sh"
  exit 1
fi

( cd "$PROJECT_ROOT" && uv run uvicorn model_api.main:app \
    --host 0.0.0.0 --port 8001 \
    2>&1 | tee "$LOG_DIR/model_api.log" | sed "s/^/[model ] /" ) &
PIDS+=($!)
ok "Model API started  -> http://0.0.0.0:8001"

# -- 3. Frontend (React/Vite / npm, port 5173) -----------------------------
log "Starting Frontend dev server (port 5173)..."
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  log "Installing npm dependencies (first run)..."
  npm --prefix "$FRONTEND_DIR" install
  ok "npm install complete"
fi

( npm --prefix "$FRONTEND_DIR" run dev \
    2>&1 | tee "$LOG_DIR/frontend.log" | sed "s/^/[vite  ] /" ) &
PIDS+=($!)
ok "Frontend started   -> http://localhost:5173"

# -- Summary ---------------------------------------------------------------
sleep 2
echo ""
echo -e "${GREEN}================================================${RESET}"
echo -e "${GREEN}  AI Virtual Try-On -- All Services Running     ${RESET}"
echo -e "${GREEN}================================================${RESET}"
echo -e "  Frontend  ->  ${CYAN}http://localhost:5173${RESET}"
echo -e "  Backend   ->  ${CYAN}http://localhost:8000${RESET}"
echo -e "  Model API ->  ${CYAN}http://localhost:8001${RESET}"
echo -e "  Logs      ->  ${CYAN}$LOG_DIR/${RESET}"
echo ""
echo -e "${YELLOW}Live output from all services shown below."
echo -e "Press Ctrl+C to stop everything.${RESET}"
echo ""

wait "${PIDS[@]}"
