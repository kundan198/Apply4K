#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

BACKEND_URL="http://127.0.0.1:8000"
FRONTEND_URL="http://127.0.0.1:5174"

cleanup() {
  echo
  echo "Stopping Apply4K..."
  if [[ -n "${BACKEND_PID:-}" ]]; then kill "$BACKEND_PID" 2>/dev/null || true; fi
  if [[ -n "${FRONTEND_PID:-}" ]]; then kill "$FRONTEND_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM

if [[ ! -x "$BACKEND_DIR/.venv/bin/python" ]]; then
  echo "Backend virtualenv not found at backend/.venv."
  echo "Run the backend setup in README.md first."
  exit 1
fi

if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  echo "Frontend dependencies not found. Installing..."
  (cd "$FRONTEND_DIR" && npm install)
fi

echo "Starting Apply4K locally..."
echo "Backend:  $BACKEND_URL"
echo "Frontend: $FRONTEND_URL"
echo

(cd "$BACKEND_DIR" && .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000) &
BACKEND_PID=$!

(cd "$FRONTEND_DIR" && npm run dev -- --host 127.0.0.1 --port 5174) &
FRONTEND_PID=$!

echo "Apply4K is starting."
echo "Open: $FRONTEND_URL/jobs"
echo
echo "Keep this window open while using the app."
echo "Press Ctrl+C here to stop both backend and frontend."

wait
