const PUBLIC_URL = process.env.PUBLIC_URL || 'https://coderplay.kauverylabs.ai'
const FRONTEND_URL = process.env.FRONTEND_ORIGIN_URL || 'http://127.0.0.1:5175'
const BACKEND_URL = process.env.BACKEND_ORIGIN_URL || 'http://127.0.0.1:5002'
const OLLAMA_URL = process.env.OLLAMA_ORIGIN_URL || 'http://127.0.0.1:11435'

async function fetchText(url, timeoutMs = 5000) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
  const text = await res.text()
  return { res, text }
}

function statusLine(name, ok, detail) {
  console.log(`${ok ? '[OK]  ' : '[FAIL]'} ${name}${detail ? ` — ${detail}` : ''}`)
}

async function check(name, url, validate) {
  try {
    const result = await fetchText(url)
    const valid = validate(result)
    statusLine(name, valid.ok, valid.detail)
    return valid.ok
  } catch (err) {
    statusLine(name, false, `${url} (${err.message})`)
    return false
  }
}

async function main() {
  console.log('=== CoderPlay DGX Health Check ===\n')

  const frontendOk = await check('Frontend origin', `${FRONTEND_URL}/__coderplay_health`, ({ res, text }) => ({
    ok: res.ok && text.includes('CoderPlay Frontend'),
    detail: `${res.status} ${res.headers.get('content-type') || ''}`,
  }))

  const backendOk = await check('Backend origin', `${BACKEND_URL}/health`, ({ res, text }) => ({
    ok: res.ok && text.includes('"status":"ok"'),
    detail: `${res.status} ${res.headers.get('content-type') || ''}`,
  }))

  await check('Ollama origin', `${OLLAMA_URL}/api/tags`, ({ res, text }) => ({
    ok: res.ok && text.includes('models'),
    detail: `${res.status} ${res.headers.get('content-type') || ''}`,
  }))

  const publicOk = await check('Public Cloudflare URL', `${PUBLIC_URL}/`, ({ res, text }) => ({
    ok: res.ok && /text\/html/i.test(res.headers.get('content-type') || '') && text.includes('<!DOCTYPE html'),
    detail: `${res.status} ${res.headers.get('content-type') || ''}${text.includes('error code: 502') ? ' body=Cloudflare 502' : ''}`,
  }))

  console.log('\nDiagnosis:')
  if (!frontendOk) {
    console.log('- Frontend is not reachable on 5175. Run `npm run build && npm run frontend:ensure`.')
  }
  if (!backendOk) {
    console.log('- Backend is not reachable on 5002. Run `npm run backend:ensure` and inspect `backend/logs/launch-backend.log`.')
  }
  if (!publicOk) {
    console.log('- Public URL is failing through Cloudflare. Make sure cloudflared is running and the tunnel service points to `http://localhost:5175`.')
    console.log('- Start the full stack in tmux: `npm run dev:all`.')
    console.log('- If origins are OK but public is 502, restart cloudflared or check the tunnel token/public-hostname mapping in Cloudflare Zero Trust.')
  }
  if (frontendOk && backendOk && publicOk) {
    console.log('- Everything looks healthy.')
  }
}

main().catch((err) => {
  console.error('[healthcheck] failed:', err)
  process.exit(1)
})
