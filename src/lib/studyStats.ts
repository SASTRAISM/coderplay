import { getLocalDateKey } from '@/lib/date'
import type { UserProgress } from '@/types'

export function getTotalTimeSpentMinutes(progress: UserProgress | null | undefined): number {
  return progress?.timeSpent?.total ?? 0
}

export function getTodayTimeSpentMinutes(progress: UserProgress | null | undefined, date = new Date()): number {
  const today = getLocalDateKey(date)
  return progress?.dailyActivity?.[today] ?? 0
}
