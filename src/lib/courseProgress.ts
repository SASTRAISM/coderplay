import type { UserProgress } from '@/types'

export function toValidDate(value: unknown): Date | null {
  if (!value) return null

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value === 'object' && value && 'toDate' in value && typeof value.toDate === 'function') {
    const converted = value.toDate()
    return converted instanceof Date && !Number.isNaN(converted.getTime()) ? converted : null
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  return null
}

export function getLatestDate(values: Array<unknown>): Date | null {
  return values.reduce<Date | null>((latest, value) => {
    const candidate = toValidDate(value)
    if (!candidate) return latest
    if (!latest || candidate.getTime() > latest.getTime()) return candidate
    return latest
  }, null)
}

export function hasCompletedAllStages(stages: number[] | undefined): boolean {
  return Boolean(stages?.includes(1) && stages?.includes(2) && stages?.includes(3))
}

export function isConceptComplete(progress: UserProgress | null | undefined, conceptId: string): boolean {
  return hasCompletedAllStages(progress?.completedStages?.[conceptId])
}

export function getConceptCompletionDate(progress: UserProgress | null | undefined, conceptId: string): Date | null {
  if (!progress) return null

  return getLatestDate([
    progress.conceptScores?.[conceptId]?.completedAt,
    progress.codingStats?.[conceptId]?.completedAt,
    progress.assessmentStats?.[conceptId]?.completedAt,
    progress.learningAnalytics?.[conceptId]?.completedAt,
  ])
}

export function getCompletedConceptCount(
  progress: UserProgress | null | undefined,
  conceptIds: string[],
): number {
  return conceptIds.filter((conceptId) => isConceptComplete(progress, conceptId)).length
}

export function getLanguageCompletionDate(
  progress: UserProgress | null | undefined,
  conceptIds: string[],
): Date | null {
  if (!progress || conceptIds.length === 0) return null
  if (!conceptIds.every((conceptId) => isConceptComplete(progress, conceptId))) return null

  return getLatestDate(conceptIds.map((conceptId) => getConceptCompletionDate(progress, conceptId)))
}
