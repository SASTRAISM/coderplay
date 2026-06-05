// AI Service -- calls the CoderPlay Ollama backend
// Backend must be running: cd backend && npm run dev
import { getBackendUrl } from '@/lib/backendUrl'
import type { CodingChallenge } from '@/types'

const FALLBACK = `Cody AI is offline right now. Your work is safe -- try again in a moment, or ask your instructor to check the local AI backend.`

export interface AIProviderStats {
  gemini?: {
    available: boolean
    model?: string
    running: number
    waiting: number
    maxConcurrent?: number
    max?: number
  }
  grok?: {
    placementKey: boolean
    studentKey: boolean
    model: string
    running: number
    waiting: number
    max: number
  }
  ollama?: {
    baseUrl: string
    model: string
    queueStats: {
      running: number
      queued: number
      max: number
    }
    fallbackQueueDepth: number
  }
  cache?: {
    size: number
    max: number
  }
  chat?: {
    primary: 'ollama' | 'gemini'
    overflowFallback: boolean
    fallbackQueueDepth: number
    queueTimeoutMs: number
    ollamaQueue: {
      running: number
      queued: number
      max: number
    }
  }
}

export async function getAIStatus(): Promise<AIProviderStats> {
  const res = await fetch(`${getBackendUrl()}/api/ai/stats`, {
    method: 'GET',
    cache: 'no-store',
    signal: AbortSignal.timeout(4_000),
  })
  if (!res.ok) throw new Error(`AI status failed: ${res.status}`)
  return res.json() as Promise<AIProviderStats>
}

// -- SSE streaming -- pipes tokens directly to onChunk callback ----------------
export async function streamChat(
  payload: Record<string, unknown>,
  onChunk: (text: string) => void,
): Promise<void> {
  try {
    const res = await fetch(`${getBackendUrl()}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(130_000),
    })

    if (!res.ok || !res.body) {
      onChunk(FALLBACK)
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6)
        if (raw === '[DONE]') return
        try {
          const chunk: string = JSON.parse(raw)
          if (chunk.startsWith('__ERR__:')) { onChunk(chunk.slice(8) || FALLBACK); return }
          onChunk(chunk)
        } catch { /* skip malformed chunk */ }
      }
    }
  } catch {
    onChunk(FALLBACK)
  }
}

// -- Buffered version for callers that need a full string ---------------------
async function callBackend(payload: Record<string, unknown>): Promise<string> {
  let result = ''
  await streamChat(payload, (chunk) => { result += chunk })
  return result || FALLBACK
}

function stripCodeFence(text: string): string {
  const fenced = text.match(/```[a-zA-Z0-9]*\n([\s\S]*?)```/)
  return (fenced?.[1] || text).trim()
}

// -- Public API ----------------------------------------------------------------

export async function explainConcept(
  conceptTitle: string,
  level: string,
  studentMessage?: string,
  conceptKeyPoints?: string[],
  language?: string,
): Promise<string> {
  return callBackend({
    type: studentMessage ? 'student-question' : 'explain',
    conceptTitle,
    conceptKeyPoints: conceptKeyPoints || [],
    language: language || 'python',
    message: studentMessage || `Explain ${conceptTitle}`,
  })
}

export async function explainAgain(
  conceptTitle: string,
  previousExplanation: string,
  conceptKeyPoints?: string[],
  language?: string,
): Promise<string> {
  return callBackend({
    type: 'explain-again',
    conceptTitle,
    conceptKeyPoints: conceptKeyPoints || [],
    language: language || 'python',
    previousExplanation,
  })
}

export async function giveHint(
  question: string,
  userCode?: string,
  conceptTitle?: string,
  language?: string,
): Promise<string> {
  return callBackend({
    type: 'hint',
    conceptTitle: conceptTitle || question,
    language: language || 'python',
    code: userCode,
  })
}

export async function generateAssessmentFeedback(
  score: number,
  totalQuestions: number,
  conceptTitle?: string,
): Promise<string> {
  return callBackend({
    type: 'feedback',
    conceptTitle: conceptTitle || 'Programming Concepts',
    score,
    totalQuestions,
  })
}

export async function debugHelp(
  code: string,
  error: string,
  language?: string,
): Promise<string> {
  return callBackend({
    type: 'debug',
    conceptTitle: 'Debugging',
    language: language || 'python',
    code,
    error,
  })
}

export async function explainWrongAnswer(
  question: string,
  userAnswer: string,
  correctAnswer: string,
): Promise<string> {
  return callBackend({
    type: 'wrong-answer',
    conceptTitle: 'Assessment',
    question,
    userAnswer,
    correctAnswer,
  })
}

export async function getLogicGuidance(
  problem: string,
  currentAttempt: string,
  language?: string,
): Promise<string> {
  return callBackend({
    type: 'guidance',
    conceptTitle: problem,
    language: language || 'python',
    question: problem,
    currentAttempt,
  })
}

export interface GeneratedQuestion {
  id: string
  type: 'mcq' | 'true_false' | 'code_output' | 'fill_blank'
  question: string
  options?: { id: string; text: string }[]
  code?: string
  correctAnswer: string
  explanation: string
  points: number
}

export async function generateQuestions(
  conceptId: string,
  conceptTitle: string,
  keyPoints: string[],
  language: string,
  learner?: { id?: string; name?: string; variationSeed?: string },
): Promise<GeneratedQuestion[]> {
  try {
    const res = await fetch(`${getBackendUrl()}/api/ai/generate-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conceptId,
        conceptTitle,
        keyPoints,
        language,
        learnerId: learner?.id,
        learnerName: learner?.name,
        variationSeed: learner?.variationSeed,
      }),
      signal: AbortSignal.timeout(95_000),
    })
    const data = await res.json()
    if (!res.ok || !data.questions) return []
    return data.questions as GeneratedQuestion[]
  } catch {
    return []
  }
}

export interface GeneratedChallenge {
  id: string
  conceptId: string
  difficulty: 'basic' | 'medium' | 'hard'
  title: string
  description: string
  problemStatement: string
  inputFormat: string
  outputFormat: string
  constraints: string[]
  examples: { input: string; output: string; explanation: string }[]
  starterCode: string
  visibleTestCases: { input: string; expectedOutput: string; explanation?: string }[]
  hiddenTestCases: { input: string; expectedOutput: string }[]
  hints: string[]
}

export async function generateChallenges(
  conceptId: string,
  conceptTitle: string,
  keyPoints: string[],
  language: string,
): Promise<GeneratedChallenge[]> {
  try {
    const res = await fetch(`${getBackendUrl()}/api/ai/generate-challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conceptId, conceptTitle, keyPoints, language }),
      signal: AbortSignal.timeout(125_000),
    })
    const data = await res.json()
    if (!res.ok || !data.challenges) return []
    return data.challenges as GeneratedChallenge[]
  } catch {
    return []
  }
}

export async function generateReferenceSolution(
  challenge: CodingChallenge,
  language: string,
): Promise<string> {
  const result = await callBackend({
    type: 'solution',
    language,
    challengeTitle: challenge.title,
    problemStatement: challenge.problemStatement,
    inputFormat: challenge.inputFormat,
    outputFormat: challenge.outputFormat,
    constraints: challenge.constraints,
    examples: challenge.examples,
    starterCode: challenge.starterCode,
    visibleTestCases: challenge.visibleTestCases,
  })

  if (!result || result === FALLBACK || result.startsWith("I'm having trouble connecting")) {
    return ''
  }

  return stripCodeFence(result)
}

export const aiService = {
  getAIStatus,
  streamChat,
  explainConcept,
  explainAgain,
  giveHint,
  generateAssessmentFeedback,
  debugHelp,
  explainWrongAnswer,
  getLogicGuidance,
  generateQuestions,
  generateChallenges,
  generateReferenceSolution,
}