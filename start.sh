#!/usr/bin/env bash
# ============================================================
# AI Virtual Try-On -- Start Script
# Services:
#   Backend API  (database, Oxylabs, recommendations) port 8000 (root uv env)
#   Model API    (CatVTON)                             port 8001 (root uv env)
#   Frontend     (React/Vite)                          port 5173 (frontend/)
# ============================================================
set -euo pipefail

# Ensure uv is on PATH (installed in ~/.local/bin)
export PATH="$HOME/.local/bin:$PATH"

PROJECT_ROOT="$(dirname "$(realpath "$0")")"
# Keep uv's cache in the repository so the launcher never depends on a
# user-specific cache directory. The cache is gitignored.
export UV_CACHE_DIR="$PROJECT_ROOT/.uv-cache"
LOG_DIR="$PROJECT_ROOT/.logs"
mkdir -p "$LOG_DIR"

# Read only the simple URL/port assignments from .env without sourcing it as
# shell code (database passwords and other values may contain shell syntax).
read_project_env() {
  python3 - "$PROJECT_ROOT/.env" "$1" <<'PY'
import pathlib, sys
path, key = pathlib.Path(sys.argv[1]), sys.argv[2]
if path.exists():
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and line.split("=", 1)[0].strip() == key:
            value = line.split("=", 1)[1].strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in "'\"":
                value = value[1:-1]
            print(value)
            break
PY
}

BACKEND_URL="${BACKEND_URL:-$(read_project_env BACKEND_URL)}"
MODEL_API_URL="${MODEL_API_URL:-$(read_project_env MODEL_API_URL)}"
FRONTEND_PORT="${FRONTEND_PORT:-$(read_project_env FRONTEND_PORT)}"
BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:8000}"
MODEL_API_URL="${MODEL_API_URL:-http://127.0.0.1:8001}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
BACKEND_PORT="$(python3 -c 'import sys; from urllib.parse import urlsplit; print(urlsplit(sys.argv[1]).port or 8000)' "$BACKEND_URL")"
MODEL_PORT="$(python3 -c 'import sys; from urllib.parse import urlsplit; print(urlsplit(sys.argv[1]).port or 8001)' "$MODEL_API_URL")"

GREEN='\033[0;32m' YELLOW='\033[1;33m' RED='\033[0;31m'
CYAN='\033[0;36m'  RESET='\033[0m'

log()  { echo -e "${CYAN}[$(date +%H:%M:%S)]${RESET} $*"; }
ok()   { echo -e "${GREEN}[OK]${RESET} $*"; }
warn() { echo -e "${YELLOW}[WARN]${RESET} $*"; }
err()  { echo -e "${RED}[ERROR]${RESET} $*" >&2; }

reset_log() {
  local log_file="$1"
  : > "$log_file"
  printf '[%s] launcher: starting service\n' "$(date --iso-8601=seconds)" >> "$log_file"
}

wait_for_health() {
  local service_name="$1"
  local service_url="$2"
  local log_file="$3"
  local attempt

  for attempt in $(seq 1 30); do
    if curl --fail --silent --show-error --max-time 2 "$service_url/health" >/dev/null; then
      ok "$service_name health check passed -> $service_url/health"
      return 0
    fi
    sleep 1
  done

  err "$service_name did not become healthy. Last log lines:"
  tail -n 40 "$log_file" >&2 || true
  return 1
}

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

# -- Shared Python environment ------------------------------------------------
if ! command -v uv &>/dev/null; then
  err "uv not found. Install: curl -LsSf https://astral.sh/uv/install.sh | sh"
  exit 1
fi

log "Synchronizing the root uv environment..."
( cd "$PROJECT_ROOT" && uv sync --locked )
ok "Root .venv is ready"

# -- 1. Backend (database, Amazon/Oxylabs, recommendations; port 8000) ------
log "Starting Backend API (port $BACKEND_PORT)..."
if [ ! -f "$PROJECT_ROOT/.env" ]; then
  warn "No .env file found -- copy .env.example to .env and configure credentials"
fi

reset_log "$LOG_DIR/backend.log"
( cd "$PROJECT_ROOT" && PYTHONUNBUFFERED=1 stdbuf -oL -eL uv run --locked uvicorn backend.main:app \
  --host 0.0.0.0 --port "$BACKEND_PORT" \
  2>&1 | stdbuf -oL -eL tee -a "$LOG_DIR/backend.log" | stdbuf -oL -eL sed "s/^/[backend] /" ) &
PIDS+=($!)
ok "Backend API started -> $BACKEND_URL"

# -- 2. Model API (CatVTON; root uv environment, port 8001) -----------------
log "Starting Model API (port $MODEL_PORT)..."
reset_log "$LOG_DIR/model_api.log"
( cd "$PROJECT_ROOT" && PYTHONUNBUFFERED=1 stdbuf -oL -eL uv run --locked uvicorn model_api.main:app \
    --host 0.0.0.0 --port "$MODEL_PORT" \
    2>&1 | stdbuf -oL -eL tee -a "$LOG_DIR/model_api.log" | stdbuf -oL -eL sed "s/^/[model ] /" ) &
PIDS+=($!)
ok "Model API started  -> $MODEL_API_URL"

# -- 3. Frontend (React/Vite / frontend, port 5173) -------------------------
log "Starting Frontend dev server (port $FRONTEND_PORT)..."
if [ ! -d "$PROJECT_ROOT/frontend/node_modules" ]; then
  log "Installing npm dependencies (first run)..."
  ( cd "$PROJECT_ROOT/frontend" && npm install )
  ok "npm install complete"
fi

reset_log "$LOG_DIR/frontend.log"
( cd "$PROJECT_ROOT/frontend" && stdbuf -oL -eL npm run dev -- \
    -- --port "$FRONTEND_PORT" \
    2>&1 | stdbuf -oL -eL tee -a "$LOG_DIR/frontend.log" | stdbuf -oL -eL sed "s/^/[vite  ] /" ) &
PIDS+=($!)
ok "Frontend started   -> http://localhost:$FRONTEND_PORT"

# -- Summary ---------------------------------------------------------------
wait_for_health "Backend API" "$BACKEND_URL" "$LOG_DIR/backend.log"
wait_for_health "Model API" "$MODEL_API_URL" "$LOG_DIR/model_api.log"
echo ""
echo -e "${GREEN}================================================${RESET}"
echo -e "${GREEN}  AI Virtual Try-On -- All Services Running     ${RESET}"
echo -e "${GREEN}================================================${RESET}"
echo -e "  Frontend  ->  ${CYAN}http://localhost:$FRONTEND_PORT${RESET}"
echo -e "  Backend   ->  ${CYAN}$BACKEND_URL${RESET}"
echo -e "  Model API ->  ${CYAN}$MODEL_API_URL${RESET}"
echo -e "  Logs      ->  ${CYAN}$LOG_DIR/${RESET}"
echo ""
echo -e "${YELLOW}Live output from all services shown below."
echo -e "Press Ctrl+C to stop everything.${RESET}"
echo ""

wait "${PIDS[@]}"
