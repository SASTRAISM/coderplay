const net = require('net')
const path = require('path')
const { spawn } = require('child_process')

const ROOT = path.join(__dirname, '..')
const IDLE_INTERVAL_MS = 60 * 60 * 1000
const HEALTH_POLL_MS = 2500

const SERVICES = {
  frontend: {
    name: 'frontend',
    port: 5175,
    command: process.execPath,
    staticArgs: [path.join(ROOT, 'scripts', 'serve-dist.js')],
    devArgs: [path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev', '-p', '5175', '-H', '0.0.0.0'],
    healthUrl: 'http://127.0.0.1:5175/',
    isHealthy: async (response) => {
      if (!response.ok) return false
      const html = await response.text()
      return html.includes('<title>CoderPlay AI')
    },
  },
  backend: {
    name: 'backend',
    port: 5002,
    command: process.execPath,
    args: ['server.js'],
    cwd: path.join(ROOT, 'backend'),
    healthUrl: 'http://127.0.0.1:5002/',
    isHealthy: async (response) => {
      if (!response.ok) return false
      const data = await response.json()
      return data?.name === 'CoderPlay AI Backend' && data?.status === 'running'
    },
  },
  ollama: {
    name: 'ollama',
    port: 11435,
    command: 'ollama',
    args: ['serve'],
    env: { ...process.env, OLLAMA_HOST: '0.0.0.0:11435' },
    healthUrl: 'http://127.0.0.1:11435/api/tags',
    isHealthy: async (response) => {
      if (!response.ok) return false
      const data = await response.json()
      return Array.isArray(data?.models)
    },
  },
}

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port })

    socket.setTimeout(800)

    socket.on('connect', () => {
      socket.destroy()
      resolve(true)
    })

    socket.on('timeout', () => {
      socket.destroy()
      resolve(false)
    })

    socket.on('error', () => {
      resolve(false)
    })
  })
}

async function hasExpectedService(config, mode) {
  if (typeof config.check === 'function') {
    return config.check(mode)
  }

  try {
    const response = await fetch(config.healthUrl, { signal: AbortSignal.timeout(1500) })
    return await config.isHealthy(response)
  } catch {
    return false
  }
}

function idleWithExistingService(config, mode) {
  console.log(`Reusing existing ${config.name} on port ${config.port}`)

  const interval = setInterval(async () => {
    const portInUse = await isPortOpen(config.port)
    if (!portInUse) {
      console.log(`${config.name} on port ${config.port} stopped; starting it now...`)
      clearInterval(interval)
      spawnService(config, mode)
      return
    }

    const healthy = await hasExpectedService(config, mode)
    if (!healthy) {
      console.error(`${config.name} on port ${config.port} is no longer healthy.`)
      process.exit(1)
    }
  }, HEALTH_POLL_MS)
  setInterval(() => {}, IDLE_INTERVAL_MS)

  const stop = () => process.exit(0)
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)
}

function spawnService(config, mode) {
  const args = mode === 'dev' && typeof config.devArgs !== 'undefined' ? config.devArgs : config.staticArgs || config.args
  const child = spawn(config.command, args, {
    cwd: config.cwd || ROOT,
    env: config.env || process.env,
    stdio: 'inherit',
  })

  const forwardSignal = (signal) => {
    if (!child.killed) child.kill(signal)
  }

  process.on('SIGINT', () => forwardSignal('SIGINT'))
  process.on('SIGTERM', () => forwardSignal('SIGTERM'))

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal)
      return
    }
    process.exit(code ?? 0)
  })

  child.on('error', (error) => {
    console.error(`Failed to start ${config.name}: ${error.message}`)
    process.exit(1)
  })
}

async function main() {
  const serviceKey = process.argv[2]
  const mode = process.argv[3] === 'dev' ? 'dev' : 'static'
  const config = SERVICES[serviceKey]

  if (!config) {
    console.error(`Unknown service: ${serviceKey}`)
    process.exit(1)
  }

  const portInUse = await isPortOpen(config.port)
  if (!portInUse) {
    spawnService(config, mode)
    return
  }

  const healthy = await hasExpectedService(config, mode)
  if (!healthy) {
    console.error(`Port ${config.port} is already in use by another process.`)
    process.exit(1)
  }

  idleWithExistingService(config, mode)
}

main()
