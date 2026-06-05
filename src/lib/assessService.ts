// Secure answer-checking service.
// Questions are tokenized on the backend (correctAnswer replaced with a signed token).
// Answers are verified server-side -- the correct answer string never reaches the browser.
import { getBackendUrl } from '@/lib/backendUrl'
import type { AssessmentQuestion } from '@/types'

export type SafeQuestion = Omit<AssessmentQuestion, 'correctAnswer'> & {
  answerToken: string
}

// Strip correctAnswer from a question array and return signed tokens from the backend.
// Call once when a question set is loaded.
export async function tokenizeQuestions(
  questions: AssessmentQuestion[],
): Promise<SafeQuestion[]> {
  try {
    const res = await fetch(`${getBackendUrl()}/api/assess/tokenize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) throw new Error(`tokenize ${res.status}`)
    const data = await res.json()
    return data.questions as SafeQuestion[]
  } catch {
    // Fallback: strip correctAnswer client-side without a token (no answer checking until backend is up)
    return questions.map(({ correctAnswer: _ca, ...rest }) => ({
      ...rest,
      answerToken: '',
    })) as SafeQuestion[]
  }
}

// Check a single answer against the signed token. Returns { correct, correctAnswer }.
export async function checkAnswer(
  token: string,
  answer: string | string[],
  questionId?: string,
): Promise<{ correct: boolean; correctAnswer?: string | string[] }> {
  if (!token) return { correct: false }
  try {
    const res = await fetch(`${getBackendUrl()}/api/assess/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, answer, questionId }),
      signal: AbortSignal.timeout(5_000),
    })
    if (!res.ok) return { correct: false }
    const data = await res.json()
    return { correct: Boolean(data.correct), correctAnswer: data.correctAnswer }
  } catch {
    return { correct: false }
  }
}

// Check all answers at once (at quiz completion).
export async function checkBatch(
  submissions: { questionId: string; token: string; answer: string | string[] }[],
): Promise<{ results: { questionId: string; correct: boolean }[]; score: number; total: number }> {
  try {
    const res = await fetch(`${getBackendUrl()}/api/assess/check-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissions }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) throw new Error(`check-batch ${res.status}`)
    return await res.json()
  } catch {
    return { results: [], score: 0, total: submissions.length }
  }
}
