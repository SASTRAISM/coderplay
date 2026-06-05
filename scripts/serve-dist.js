const fs = require('fs')
const http = require('http')
const path = require('path')

const HOST = process.env.HOST || '0.0.0.0'
const PORT = Number(process.env.PORT || 5175)
const BACKEND_PORT = Number(process.env.BACKEND_PORT || 5002)
const DIST_DIR = path.join(__dirname, '..', 'dist')

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function sendHtml(res, statusCode, message) {
  const body = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>CoderPlay</title></head><body><p>${message}</p></body></html>`
  res.writeHead(statusCode, {
    'Cache-Control': 'no-cache',
    'Content-Type': 'text/html; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  })
  res.end(body)
}

function send(res, statusCode, body, contentType = 'text/html; charset=utf-8') {
  res.writeHead(statusCode, {
    'Cache-Control': 'no-cache',
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
  })
  res.end(body)
}

function resolvePathname(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split('?')[0])
  const normalized = path.posix.normalize(decodedPath)
  const cleanPath = normalized.startsWith('/') ? normalized : `/${normalized}`

  if (cleanPath === '/') return path.join(DIST_DIR, 'index.html')

  const filePath = path.join(DIST_DIR, cleanPath)
  const directoryIndexPath = path.join(DIST_DIR, cleanPath, 'index.html')
  const htmlPath = path.join(DIST_DIR, `${cleanPath}.html`)

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) return filePath
  if (fs.existsSync(directoryIndexPath)) return directoryIndexPath
  if (fs.existsSync(htmlPath)) return htmlPath

  return null
}

if (!fs.existsSync(DIST_DIR)) {
  console.error(`Missing build output: ${DIST_DIR}`)
  console.error('Run `npm run build` before starting the static site.')
  process.exit(1)
}

function proxyToBackend(req, res) {
  const proxyHeaders = { ...req.headers }
  proxyHeaders['host'] = `127.0.0.1:${BACKEND_PORT}`

  const options = {
    hostname: '127.0.0.1',
    port: BACKEND_PORT,
    path: req.url,
    method: req.method,
    headers: proxyHeaders,
  }

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers)
    proxyRes.pipe(res, { end: true })
  })

  proxyReq.on('error', (err) => {
    console.error('[proxy] backend error:', err.message)
    if (!res.headersSent) send(res, 502, JSON.stringify({ error: 'Backend unavailable' }), 'application/json; charset=utf-8')
    else res.end()
  })

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    req.pipe(proxyReq, { end: true })
  } else {
    proxyReq.end()
  }
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    sendHtml(res, 400, 'Bad Request')
    return
  }

  // Proxy all /api/* requests to the Express backend
  if (req.url === '/api' || req.url.startsWith('/api/')) {
    proxyToBackend(req, res)
    return
  }

  if (!['GET', 'HEAD'].includes(req.method || 'GET')) {
    sendHtml(res, 405, 'Method Not Allowed')
    return
  }

  if (req.url === '/__coderplay_health') {
    const body = JSON.stringify({
      name: 'CoderPlay Frontend',
      status: 'ok',
      mode: 'static',
    })
    res.writeHead(200, {
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/json; charset=utf-8',
    })
    if (req.method === 'HEAD') {
      res.end()
      return
    }
    res.end(body)
    return
  }

  if (req.url === '/.well-known/appspecific/com.chrome.devtools.json') {
    res.writeHead(204)
    res.end()
    return
  }

  const resolvedPath = resolvePathname(req.url)
  const targetPath = resolvedPath || path.join(DIST_DIR, '404.html')

  if (!targetPath.startsWith(DIST_DIR)) {
    sendHtml(res, 403, 'Forbidden')
    return
  }

  fs.readFile(targetPath, (err, data) => {
    if (err) {
      sendHtml(res, 500, 'Service temporarily unavailable. Please try again.')
      return
    }

    const ext = path.extname(targetPath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'
    const statusCode = resolvedPath ? 200 : 404

    const isHtml = ext === '.html'
    res.writeHead(statusCode, {
      'Cache-Control': isHtml ? 'no-store, no-cache, must-revalidate' : 'public, max-age=31536000, immutable',
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      ...(isHtml && {
        'Surrogate-Control': 'no-store',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Clear-Site-Data': '"cache"',
      }),
    })

    if (req.method === 'HEAD') {
      res.end()
      return
    }

    res.end(data)
  })
})

server.listen(PORT, HOST, () => {
  console.log(`Static frontend ready at http://${HOST}:${PORT}`)
})