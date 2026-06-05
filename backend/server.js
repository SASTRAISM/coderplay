import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 5002
const HOST = process.env.HOST || '0.0.0.0'

// Middleware
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'CoderPlay AI Backend',
    status: 'running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
})

// AI Stats endpoint
app.get('/api/ai/stats', (req, res) => {
  res.json({
    ollama: {
      baseUrl: 'http://localhost:11435',
      model: 'neural-chat',
      queueStats: {
        running: 0,
        queued: 0,
        max: 5,
      },
      fallbackQueueDepth: 0,
    },
    chat: {
      primary: 'ollama',
      overflowFallback: false,
      fallbackQueueDepth: 0,
      queueTimeoutMs: 300000,
      ollamaQueue: {
        running: 0,
        queued: 0,
        max: 5,
      },
    },
    cache: {
      size: 0,
      max: 1000,
    },
  })
})

// AI Chat streaming endpoint
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { messages, context } = req.body

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Access-Control-Allow-Origin', '*')

    // Send mock streaming response
    const mockResponse = 'I am a mock AI assistant. Please set up a real backend with Ollama or your preferred LLM provider to get actual AI responses. For now, this is a placeholder response to allow development and testing of the frontend UI.'

    // Simulate streaming chunks
    for (const chunk of mockResponse) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`)
      await new Promise((resolve) => setTimeout(resolve, 10))
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (error) {
    console.error('Chat error:', error)
    res.write(`data: ${JSON.stringify('__ERR__:Backend error occurred')}\n\n`)
    res.write('data: [DONE]\n\n')
    res.end()
  }
})

// Code execution endpoint (placeholder)
app.post('/api/execute', async (req, res) => {
  try {
    const { language, code, testCases } = req.body

    // Mock execution response
    res.json({
      success: true,
      output: 'Mock execution output. Connect to a real code execution backend for actual results.',
      executionTime: Math.random() * 100,
      testsPassed: testCases ? Math.floor(Math.random() * testCases.length) : 0,
      testsFailed: 0,
    })
  } catch (error) {
    console.error('Execution error:', error)
    res.status(500).json({
      success: false,
      error: 'Execution failed',
    })
  }
})

// Error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  })
})

// Start server
app.listen(PORT, HOST, () => {
  console.log(`CoderPlay AI Backend listening on http://${HOST}:${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/`)
  console.log(`AI Chat: POST http://localhost:${PORT}/api/ai/chat`)
  console.log(`AI Stats: GET http://localhost:${PORT}/api/ai/stats`)
})
