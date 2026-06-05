export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseStoredDate(value: string | Date | undefined | null): Date | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00`)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function getCalendarDayDiff(from: Date, to: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.floor((startOfLocalDay(to).getTime() - startOfLocalDay(from).getTime()) / msPerDay)
}
