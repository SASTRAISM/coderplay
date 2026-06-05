import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function getProgressColor(percentage: number): string {
  if (percentage < 30) return 'bg-red-500'
  if (percentage < 70) return 'bg-yellow-500'
  return 'bg-green-500'
}

export function getDifficultyColor(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case 'beginner': return 'text-green-600 bg-green-50 border-green-200'
    case 'intermediate': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'advanced': return 'text-red-600 bg-red-50 border-red-200'
    default: return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

export function generateXP(action: string): number {
  const xpMap: Record<string, number> = {
    completeStage1: 50,
    completeStage2: 100,
    completeStage3: 150,
    perfectScore: 50,
    dailyStreak: 25,
    firstConcept: 100,
  }
  return xpMap[action] || 10
}

export function getLevelFromXP(xp: number): number {
  if (xp < 500) return 1
  if (xp < 1500) return 2
  if (xp < 3000) return 3
  if (xp < 5000) return 4
  if (xp < 8000) return 5
  if (xp < 12000) return 6
  if (xp < 18000) return 7
  if (xp < 25000) return 8
  if (xp < 35000) return 9
  return 10
}

export function getXPForNextLevel(xp: number): number {
  const thresholds = [500, 1500, 3000, 5000, 8000, 12000, 18000, 25000, 35000, Infinity]
  const level = getLevelFromXP(xp)
  return thresholds[level - 1]
}

export function formatTimeAgo(date: Date | string): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return then.toLocaleDateString()
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
}
