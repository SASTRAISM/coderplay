import type { CodingConceptStats, LearningAnalytics, OverallConceptScore } from '@/types'

const OVERALL_WEIGHTS = {
  aiLearning: 0.25,
  assessment: 0.4,
  coding: 0.35,
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

export function isMeaningfulLearningMessage(text: string): boolean {
  const normalized = text.trim().toLowerCase()
  if (!normalized) return false

  const cannedReplies = [
    '? got it! i understand this part.',
    '? give me a hint',
    '? please explain that again in simpler terms',
  ]

  if (cannedReplies.includes(normalized)) return false

  const wordCount = normalized.split(/\s+/).filter(Boolean).length
  const hasReasoningCue = /because|means|so that|therefore|example|difference|why|how|when|if/i.test(text)

  return text.trim().length >= 24 && (wordCount >= 5 || hasReasoningCue)
}

export function computeLearningEffectivenessScore(analytics: Partial<LearningAnalytics>): number {
  const probePromptsSeen = Math.max(analytics.probePromptsSeen ?? 0, 1)
  const userMessages = Math.max(analytics.userMessages ?? 0, 1)
  const stepsCompleted = analytics.stepsCompleted?.length ?? 0
  const meaningfulResponses = analytics.meaningfulResponses ?? 0
  const probeResponses = analytics.probeResponses ?? 0
  const followUpQuestions = analytics.followUpQuestions ?? 0
  const explainAgainCount = analytics.explainAgainCount ?? 0
  const hintCount = analytics.hintCount ?? 0
  const shortcutAttempts = analytics.shortcutAttempts ?? 0

  const stepScore = (stepsCompleted / 5) * 18
  const meaningfulScore = (meaningfulResponses / probePromptsSeen) * 32
  const probeScore = (probeResponses / probePromptsSeen) * 24
  const curiosityScore = (followUpQuestions / userMessages) * 14
  const supportScore = Math.min(explainAgainCount + hintCount, 4) * 4
  const penalty = shortcutAttempts * 8

  return Math.round(clamp(stepScore + meaningfulScore + probeScore + curiosityScore + supportScore - penalty))
}

export function computeCodingPercentage(stats: CodingConceptStats | null | undefined): number {
  if (!stats) return 0
  if (stats.totalTests > 0) {
    return Math.round((stats.passedTests / stats.totalTests) * 100)
  }
  if (stats.totalChallenges > 0) {
    return Math.round((stats.completedChallenges / stats.totalChallenges) * 100)
  }
  return 0
}

export function computeOverallConceptScore(input: {
  conceptId: string
  aiLearningPercent: number
  assessmentPercent: number
  codingPercent: number
  completedAt?: string | Date
}): OverallConceptScore {
  const marksOutOf100 = Math.round(clamp(
    input.aiLearningPercent * OVERALL_WEIGHTS.aiLearning +
    input.assessmentPercent * OVERALL_WEIGHTS.assessment +
    input.codingPercent * OVERALL_WEIGHTS.coding,
  ))

  return {
    conceptId: input.conceptId,
    aiLearningPercent: Math.round(clamp(input.aiLearningPercent)),
    assessmentPercent: Math.round(clamp(input.assessmentPercent)),
    codingPercent: Math.round(clamp(input.codingPercent)),
    marksOutOf100,
    completedAt: input.completedAt ?? new Date(),
  }
}