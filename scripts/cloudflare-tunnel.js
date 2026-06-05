/**
 * Cloudflare tunnel launcher for CoderPlay.
 *
 * MODE=dgx  (default on DGX): starts TWO tunnels
 *   - Frontend: coderplay-token.txt   → http://localhost:5175  → coderplay.kauverylabs.ai
 *   - Backend:  coderplay-backend-token.txt → http://localhost:5002 → coderplay-backend.kauverylabs.ai
 *
 * MODE=mac: starts TWO tunnels
 *   - Backend:  coderplay-backend.yml (config-based) → http://localhost:5002 → coderplay-backend.jetsonsastra.xyz
 *   - Frontend: coderplay-chi.vercel.app is Vercel — no frontend tunnel needed on Mac
 *
 * Set MODE env var to control, or it auto-detects by hostname.
 */

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const CF_DIR = path.join(os.homedir(), '.cloudflared')

const FRONTEND_HEALTH_URL = 'http://127.0.0.1:5175/__coderplay_health'
const BACKEND_HEALTH_URL = 'http://127.0.0.1:5002/health'
const WAIT_TIMEOUT_MS = Number(process.env.CLOUDFLARE_WAIT_TIMEOUT_MS || 120000)

// Detect mode: 'dgx' runs frontend+backend tunnels; 'mac' runs backend tunnel only
const PLATFORM = process.env.TUNNEL_MODE ||
  (os.platform() === 'linux' ? 'dgx' : 'mac')

console.log(`[cloudflare] Platform mode: ${PLATFORM}`)

async function waitForService(url, label) {
  const started = Date.now()
  let lastError = ''
  while (Date.now() - started < WAIT_TIMEOUT_MS) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2500) })
      if (res.ok) {
        console.log(`[cloudflare] ${label} ready: ${url}`)
        return
      }
      lastError = `${res.status}`
    } catch (err) {
      lastError = err.message
    }
    await new Promise(r => setTimeout(r, 2500))
  }
  throw new Error(`${label} not ready at ${url}. Last: ${lastError}`)
}

function readToken(file) {
  const p = path.join(CF_DIR, file)
  if (!fs.existsSync(p)) throw new Error(`Token file not found: ${p}`)
  return fs.readFileSync(p, 'utf8').trim()
}

function spawnTunnel(args, label) {
  const child = spawn('cloudflared', args, { stdio: 'inherit', env: process.env })
  child.on('error', err => {
    console.error(`[cloudflare] ${label} failed to start:`, err.message)
  })
  child.on('exit', (code, sig) => {
    console.log(`[cloudflare] ${label} exited (code=${code} signal=${sig})`)
  })
  return child
}

function spawnTunnelByConfig(configFile, label) {
  return spawnTunnel(['tunnel', '--config', configFile, 'run'], label)
}

function spawnTunnelByToken(token, localUrl, label) {
  return spawnTunnel(['tunnel', 'run', '--token', token, '--url', localUrl], label)
}

async function runDgxMode() {
  // DGX: wait for both services, then start both tunnels
  console.log('[cloudflare] DGX mode — waiting for frontend + backend...')
  await Promise.all([
    waitForService(FRONTEND_HEALTH_URL, 'frontend'),
    waitForService(BACKEND_HEALTH_URL, 'backend'),
  ])

  const frontendToken = readToken('coderplay-token.txt')
  // DGX backend tunnel: use config file if available, otherwise token
  const dgxBackendConfig = path.join(CF_DIR, 'coderplay-dgx-backend.yml')

  console.log('[cloudflare] Starting frontend tunnel → coderplay.kauverylabs.ai')
  const fe = spawnTunnelByToken(frontendToken, 'http://127.0.0.1:5175', 'frontend-tunnel')

  let be
  if (fs.existsSync(dgxBackendConfig)) {
    console.log('[cloudflare] Starting backend tunnel via config → coderplay-backend.kauverylabs.ai')
    be = spawnTunnelByConfig(dgxBackendConfig, 'backend-tunnel')
  } else {
    // Fallback: use token file if config not present
    const beToken = readToken('coderplay-backend-token.txt')
    console.log('[cloudflare] Starting backend tunnel via token → coderplay-backend.kauverylabs.ai')
    be = spawnTunnelByToken(beToken, 'http://127.0.0.1:5002', 'backend-tunnel')
  }

  console.log('')
  console.log('  Frontend : https://coderplay.kauverylabs.ai')
  console.log('  Backend  : https://coderplay-backend.kauverylabs.ai')
  console.log('')

  const cleanup = (sig) => {
    if (!fe.killed) fe.kill(sig)
    if (!be.killed) be.kill(sig)
  }
  process.on('SIGINT', () => cleanup('SIGINT'))
  process.on('SIGTERM', () => cleanup('SIGTERM'))

  // Keep process alive
  await new Promise(() => {})
}

async function runMacMode() {
  // Mac: only need the backend tunnel (frontend is on Vercel)
  console.log('[cloudflare] Mac mode — waiting for backend...')
  await waitForService(BACKEND_HEALTH_URL, 'backend')

  const macBackendConfig = path.join(CF_DIR, 'coderplay-backend.yml')
  if (!fs.existsSync(macBackendConfig)) {
    throw new Error(`Mac backend config not found: ${macBackendConfig}`)
  }

  console.log('[cloudflare] Starting Mac backend tunnel → coderplay-backend.jetsonsastra.xyz')
  const be = spawnTunnelByConfig(macBackendConfig, 'mac-backend-tunnel')

  console.log('')
  console.log('  Backend  : https://coderplay-backend.jetsonsastra.xyz')
  console.log('  Frontend : https://coderplay-chi.vercel.app (Vercel)')
  console.log('')

  const cleanup = (sig) => { if (!be.killed) be.kill(sig) }
  process.on('SIGINT', () => cleanup('SIGINT'))
  process.on('SIGTERM', () => cleanup('SIGTERM'))

  await new Promise(() => {})
}

async function main() {
  if (PLATFORM === 'dgx') {
    await runDgxMode()
  } else {
    await runMacMode()
  }
}

main().catch(err => {
  console.error('[cloudflare] Fatal:', err.message)
  process.exit(1)
})
