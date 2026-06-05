#!/bin/bash
# Start the CoderPlay backend + Cloudflare tunnel on Mac for Vercel frontend
# Usage: ./scripts/start-mac-backend.sh
set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TUNNEL_CONFIG="$HOME/.cloudflared/coderplay-backend.yml"

# ── Kill any existing instances ───────────────────────────────────────────────
echo "Stopping any existing CoderPlay processes..."
pkill -f "start-mac-backend" 2>/dev/null || true
pkill -f "coderplay-backend.yml" 2>/dev/null || true
pkill -f "backend/server.js" 2>/dev/null || true
lsof -ti:5002 | xargs kill -9 2>/dev/null || true

# Wait until port 5002 is actually free (up to 5s)
for i in $(seq 1 5); do
  lsof -ti:5002 > /dev/null 2>&1 || break
  sleep 1
done
if lsof -ti:5002 > /dev/null 2>&1; then
  echo "ERROR: port 5002 is still in use. Run: lsof -ti:5002 | xargs kill -9"
  exit 1
fi

# ── Start backend ─────────────────────────────────────────────────────────────
echo "Starting CoderPlay backend..."
cd "$PROJECT_DIR"
node backend/server.js &
BACKEND_PID=$!

# Wait for backend to be healthy (up to 15s)
echo "Waiting for backend..."
for i in $(seq 1 15); do
  if curl -s --max-time 2 http://localhost:5002/health > /dev/null 2>&1; then
    echo "Backend is ready (PID $BACKEND_PID)"
    break
  fi
  if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "ERROR: Backend process died. Check backend logs."
    exit 1
  fi
  sleep 1
done

# ── Start tunnel ──────────────────────────────────────────────────────────────
echo "Starting Cloudflare tunnel → https://coderplay-backend.jetsonsastra.xyz"
cloudflared tunnel --config "$TUNNEL_CONFIG" run &
TUNNEL_PID=$!

cleanup() {
  echo ""
  echo "Shutting down..."
  kill $BACKEND_PID $TUNNEL_PID 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

echo ""
echo "✓ Backend:  http://localhost:5002"
echo "✓ Public:   https://coderplay-backend.jetsonsastra.xyz"
echo "✓ Frontend: https://coderplay-chi.vercel.app"
echo ""
echo "Press Ctrl+C to stop both"
wait
