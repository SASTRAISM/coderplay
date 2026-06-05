#!/usr/bin/env bash
# ── CoderPlay DGX One-Shot Setup ─────────────────────────────────────────────
# Just run:  bash scripts/setup-dgx.sh
# Everything is embedded — no manual file copying needed.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CF_DIR="$HOME/.cloudflared"
FRONTEND_URL="https://coderplay.kauverylabs.ai"
BACKEND_URL=""

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║      CoderPlay DGX Setup — One Shot          ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── 1. Check Node.js ──────────────────────────────────────────────────────────
echo "[1/6] Checking Node.js..."
if ! command -v node &>/dev/null; then
  echo "ERROR: node not found. Install Node.js 18+ first:"
  echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
  echo "  sudo apt-get install -y nodejs"
  exit 1
fi
echo "  ✓ Node $(node -v)"

# ── 2. Check / install cloudflared ───────────────────────────────────────────
echo ""
echo "[2/6] Checking cloudflared..."
if ! command -v cloudflared &>/dev/null; then
  echo "  cloudflared not found — installing..."
  curl -fsSL -o /tmp/cloudflared \
    https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
  chmod +x /tmp/cloudflared
  if [ -w /usr/local/bin ]; then
    mv /tmp/cloudflared /usr/local/bin/cloudflared
  else
    sudo mv /tmp/cloudflared /usr/local/bin/cloudflared
  fi
  echo "  ✓ cloudflared installed"
else
  echo "  ✓ cloudflared $(cloudflared --version 2>&1 | head -1)"
fi

# ── 3. Write Cloudflare tunnel credentials ───────────────────────────────────
echo ""
echo "[3/6] Writing Cloudflare tunnel credentials..."
mkdir -p "$CF_DIR"

# Frontend tunnel token (coderplay-tunnel → coderplay.kauverylabs.ai)
cat > "$CF_DIR/coderplay-token.txt" << 'FRONTENDTOKEN'
eyJhIjoiODQ5MjM4YjcxMGMwN2ZkMDZkMWYwMTNjMmQyYWNiNDEiLCJzIjoiNEM3bnVRaGtPRGtKUjNDZmFUS1loZ21XcTBPOTNqRVhzZXlZZmU2UXd5OD0iLCJ0IjoiYTFmZmNkODAtZTE4Mi00YWZiLWFhYWUtNDg0NWUzY2MxZDdmIn0=
FRONTENDTOKEN

# DGX backend tunnel credentials JSON (coderplay-dgx-backend → coderplay-backend.kauverylabs.ai)
cp "$REPO_ROOT/scripts/dgx-backend-tunnel-creds.json" \
   "$CF_DIR/d039aa2a-b8a7-4307-948a-48d286e12826.json"

# DGX backend tunnel config
cat > "$CF_DIR/coderplay-dgx-backend.yml" << CFGYML
tunnel: d039aa2a-b8a7-4307-948a-48d286e12826
credentials-file: $CF_DIR/d039aa2a-b8a7-4307-948a-48d286e12826.json
protocol: http2

ingress:
  - hostname: coderplay-backend.kauverylabs.ai
    service: http://localhost:5002
  - service: http_status:404
CFGYML

echo "  ✓ Frontend tunnel token written"
echo "  ✓ Backend tunnel credentials written"
echo "  ✓ Backend tunnel config written"

# ── 4. npm install ────────────────────────────────────────────────────────────
echo ""
echo "[4/6] Installing Node.js dependencies..."
cd "$REPO_ROOT"
npm install 2>&1 | tail -5
echo "  ✓ Dependencies installed"

# ── 5. Build frontend (bake in DGX backend URL) ───────────────────────────────
echo ""
echo "[5/6] Building frontend..."
echo "  Backend URL: $BACKEND_URL"
npm run build:dgx
if [ ! -f "$REPO_ROOT/dist/index.html" ]; then
  echo "ERROR: dist/index.html not found after build. Build may have failed."
  exit 1
fi
echo "  ✓ Frontend built → dist/index.html exists"

# ── 6. Update backend FRONTEND_URL ───────────────────────────────────────────
echo ""
echo "[6/6] Configuring backend..."
BACKEND_ENV="$REPO_ROOT/backend/.env"
if [ -f "$BACKEND_ENV" ]; then
  if grep -q "FRONTEND_URL=" "$BACKEND_ENV"; then
    sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=$FRONTEND_URL|" "$BACKEND_ENV"
  fi
  echo "  ✓ backend/.env FRONTEND_URL=$FRONTEND_URL"
else
  echo "  ⚠ backend/.env not found — backend will still work but CORS may differ"
fi

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║           Setup Complete!                    ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "  Now start everything with:"
echo ""
echo "    npm run dev:all"
echo ""
echo "  This starts:"
echo "    ① Frontend  → http://localhost:5175 → $FRONTEND_URL"
echo "    ② Backend   → http://localhost:5002 → $BACKEND_URL"
echo "    ③ Ollama    → http://localhost:11435"
echo "    ④ Two Cloudflare tunnels (frontend + backend)"
echo ""
echo "  To keep running after logout:"
echo "    tmux new-session -s coderplay 'npm run dev:all'"
echo ""