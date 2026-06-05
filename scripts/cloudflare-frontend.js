/**
 * Starts the Cloudflare tunnel for DGX.
 * coderplay.kauverylabs.ai → http://localhost:5175
 * serve-dist.js already proxies /api/* → localhost:5002, so no second tunnel needed.
 */

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const TOKEN_FILE = path.join(os.homedir(), '.cloudflared', 'coderplay-token.txt')
const FRONTEND_URL = 'http://127.0.0.1:5175'
const WAIT_TIMEOUT_MS = 180000

if (!fs.existsSync(TOKEN_FILE)) {
  console.error(`[cloudflare] Token not found: ${TOKEN_FILE}`)
  console.error('[cloudflare] Run: bash scripts/setup-dgx.sh')
  process.exit(1)
}

const token = fs.readFileSync(TOKEN_FILE, 'utf8').trim()
if (!token) {
  console.error('[cloudflare] Token file is empty')
  process.exit(1)
}

async function waitForFrontend() {
  const started = Date.now()
  console.log('[cloudflare] Waiting for frontend on port 5175...')
  while (Date.now() - started < WAIT_TIMEOUT_MS) {
    try {
      const res = await fetch(`${FRONTEND_URL}/__coderplay_health`, {
        signal: AbortSignal.timeout(2000),
      })
      if (res.ok) {
        console.log('[cloudflare] Frontend is ready')
        return
      }
    } catch {}
    await new Promise(r => setTimeout(r, 2000))
  }
  // Don't throw — start tunnel anyway, frontend may still be serving
  console.warn('[cloudflare] Frontend health check timed out — starting tunnel anyway')
}

async function main() {
  await waitForFrontend()

  console.log(`[cloudflare] Starting tunnel → https://coderplay.kauverylabs.ai`)

  const child = spawn(
    'cloudflared',
    ['tunnel', 'run', '--token', token, '--url', FRONTEND_URL],
    { stdio: 'inherit', env: process.env }
  )

  const stop = sig => { if (!child.killed) child.kill(sig) }
  process.on('SIGINT', () => stop('SIGINT'))
  process.on('SIGTERM', () => stop('SIGTERM'))

  child.on('exit', (code, sig) => {
    if (sig) { process.kill(process.pid, sig); return }
    process.exit(code ?? 0)
  })

  child.on('error', err => {
    console.error('[cloudflare] Failed to start cloudflared:', err.message)
    console.error('[cloudflare] Install: curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared')
    process.exit(1)
  })
}

main().catch(err => {
  console.error('[cloudflare]', err.message)
  process.exit(1)
})
