'use client'

import { useCallback, useEffect, useState } from 'react'
import { aiService, type AIProviderStats } from '@/lib/ai/aiService'

type AIState = 'checking' | 'online' | 'busy' | 'offline'

interface AIStatusView {
  state: AIState
  label: string
  detail: string
  dotClassName: string
  badgeClassName: string
  stats: AIProviderStats | null
  refresh: () => Promise<void>
}

function buildView(stats: AIProviderStats | null, checking = false): Omit<AIStatusView, 'stats' | 'refresh'> {
  if (checking) {
    return {
      state: 'checking',
      label: 'Checking AI',
      detail: 'Checking local AI availability',
      dotClassName: 'bg-gray-300',
      badgeClassName: 'bg-gray-50 text-gray-500 border-gray-200',
    }
  }

  // Support both {chat: ...} and flat {ollama, gemini, grok} shapes
  const ollama = stats?.chat?.ollamaQueue ?? stats?.ollama?.queueStats
  const gemini = stats?.chat ?? stats?.gemini
  const hasBackend = !!(ollama || gemini)

  if (!hasBackend) {
    return {
      state: 'offline',
      label: 'AI offline',
      detail: 'Backend is unreachable',
      dotClassName: 'bg-red-500',
      badgeClassName: 'bg-red-50 text-red-700 border-red-200',
    }
  }

  const queue = ollama ?? { running: 0, queued: 0, max: 20 }
  const queueBusy = queue.running >= queue.max && queue.queued > 0

  if (queueBusy) {
    return {
      state: 'busy',
      label: 'Local AI queued',
      detail: `Ollama queue ${queue.queued}`,
      dotClassName: 'bg-amber-500',
      badgeClassName: 'bg-amber-50 text-amber-700 border-amber-200',
    }
  }

  return {
    state: 'online',
    label: 'AI ready',
    detail: `Ollama ${queue.running}/${queue.max} active`,
    dotClassName: 'bg-green-500',
    badgeClassName: 'bg-green-50 text-green-700 border-green-200',
  }
}

export function useAIStatus(enabled = true, pollMs = 20_000): AIStatusView {
  const [stats, setStats] = useState<AIProviderStats | null>(null)
  const [checking, setChecking] = useState(true)

  const refresh = useCallback(async () => {
    if (!enabled) return
    try {
      const next = await aiService.getAIStatus()
      setStats(next)
    } catch {
      setStats(null)
    } finally {
      setChecking(false)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      setChecking(false)
      return
    }

    let cancelled = false
    const run = async () => {
      if (cancelled) return
      try {
        const next = await aiService.getAIStatus()
        if (!cancelled) setStats(next)
      } catch {
        if (!cancelled) setStats(null)
      } finally {
        if (!cancelled) setChecking(false)
      }
    }

    setChecking(true)
    void run()
    const id = window.setInterval(run, pollMs)

    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [enabled, pollMs, refresh])

  const view = buildView(stats, checking)
  return { ...view, stats, refresh }
}