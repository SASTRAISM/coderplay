'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Zap, Target, CheckCircle2, Flame } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { LANGUAGES } from '@/data/languages'
import { CONCEPTS } from '@/data/concepts'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { PageTransition } from '@/components/shared/PageTransition'
import { BackButton } from '@/components/shared/BackButton'
import { getLocalDateKey } from '@/lib/date'
import { listenToProgress, listenToStreak, restoreStreak, getStreakRestoreCost } from '@/lib/firebase/firestore'
import { getTodayTimeSpentMinutes, getTotalTimeSpentMinutes } from '@/lib/studyStats'
import { calculateLevel, getLevelTitle } from '@/services/progressService'
import type { UserProgress, Streak } from '@/types'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return getLocalDateKey(d)
  })
}

function getDayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  return DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1]
}

function isConceptDone(stages: number[]): boolean {
  return stages.includes(1) && stages.includes(2) && stages.includes(3)
}

export default function ProgressPage() {
  const { user, profile } = useAuth()
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [streak, setStreak] = useState<Streak | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const [restoreError, setRestoreError] = useState('')

  useEffect(() => {
    if (!user) return
    const unsub1 = listenToProgress(user.uid, setProgress)
    const unsub2 = listenToStreak(user.uid, setStreak)
    return () => { unsub1(); unsub2() }
  }, [user])

  const xp = profile?.xp ?? 0
  const level = calculateLevel(xp)
  const levelTitle = getLevelTitle(level)
  const completedStages = progress?.completedStages ?? {}
  const totalTimeMinutes = getTotalTimeSpentMinutes(progress)
  const todayTimeMinutes = getTodayTimeSpentMinutes(progress)
  const todayKey = getLocalDateKey()
  const canRestoreStreak =
    streak?.restoreAvailableOn === todayKey &&
    streak?.lastRestoredOn !== todayKey &&
    Boolean(streak?.restoreBaseStreak)

  // Total concepts done across all languages
  const totalConceptsDone = Object.values(completedStages).filter((s) => isConceptDone(s)).length

  // Per-language progress derived from real data
  const langProgress = LANGUAGES.map((lang) => {
    const concepts = CONCEPTS[lang.id] || []
    const completed = concepts.filter((c) => isConceptDone(completedStages[c.id] || [])).length
    const pct = concepts.length > 0 ? Math.round((completed / concepts.length) * 100) : 0
    return { lang, completed, pct, total: concepts.length }
  })

  // Weekly activity from dailyActivity field (minutes per day last 7 days)
  const last7 = getLast7Days()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dailyActivity = (progress as any)?.dailyActivity ?? {}
  const weekActivity = last7.map((d) => dailyActivity[d] ?? 0)
  const maxActivity = Math.max(...weekActivity, 1)

  // All-language concept detail
  const allConcepts = LANGUAGES.flatMap((l) => (CONCEPTS[l.id] || []).map((c) => ({ ...c, langTitle: l.title })))

  const handleRestoreStreak = async () => {
    if (!user || !canRestoreStreak || isRestoring) return
    setRestoreError('')
    setIsRestoring(true)
    try {
      await restoreStreak(user.uid)
    } catch (error) {
      setRestoreError(error instanceof Error ? error.message : 'Could not restore your streak right now.')
    } finally {
      setIsRestoring(false)
    }
  }

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <BackButton fallbackHref="/dashboard" label="Back to Dashboard" />

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-gray-900">My Progress</h1>
          <div className="text-right">
            <p className="text-xs text-gray-400">Current level</p>
            <p className="font-bold text-gray-900">{levelTitle}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total XP', value: xp.toLocaleString(), Icon: Zap,          highlight: true  },
            { label: 'Level',    value: level,                Icon: Target,        highlight: false },
            { label: 'Concepts Done', value: totalConceptsDone, Icon: CheckCircle2, highlight: false },
            { label: 'Day Streak', value: `${streak?.currentStreak ?? 0}`, Icon: Flame, highlight: false },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`p-4 rounded-2xl border ${s.highlight ? 'bg-yellow-500 border-yellow-500' : 'bg-white border-gray-100'}`}>
              <div className="mb-1"><s.Icon className={`w-6 h-6 ${s.highlight ? 'text-black' : 'text-gray-500'}`} /></div>
              <div className={`text-2xl font-black ${s.highlight ? 'text-black' : 'text-gray-900'}`}>{s.value}</div>
              <div className={`text-xs mt-0.5 ${s.highlight ? 'text-yellow-800' : 'text-gray-400'}`}>{s.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <p className="text-xs text-gray-400">Time spent today</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{todayTimeMinutes} min</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <p className="text-xs text-gray-400">Total learning time</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{totalTimeMinutes} min</p>
          </div>
        </div>

        {canRestoreStreak && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-amber-900">Restore your streak today</p>
              <p className="text-sm text-amber-800 mt-1">
                Spend <span className="font-bold">{getStreakRestoreCost(streak)} XP</span> to continue your {streak?.restoreBaseStreak}-day streak.
                {(streak?.consecutiveRestoreCount ?? 0) > 0 && (
                  <span className="ml-1 text-xs text-amber-700">(Day {(streak?.consecutiveRestoreCount ?? 0) + 1} in a row -- cost increases by 10 XP each consecutive restore)</span>
                )}
              </p>
              {restoreError && <p className="text-xs text-red-600 mt-2">{restoreError}</p>}
            </div>
            <button
              type="button"
              onClick={handleRestoreStreak}
              disabled={isRestoring}
              className="px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-colors disabled:opacity-50"
            >
              {isRestoring ? 'Restoring...' : `Restore for ${getStreakRestoreCost(streak)} XP`}
            </button>
          </div>
        )}

        {/* Weekly activity */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <h2 className="font-bold text-gray-900 mb-4">Weekly Activity</h2>
          <div className="flex items-end gap-2 h-28">
            {weekActivity.map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                {/* Tooltip */}
                {val > 0 && (
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-md px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {val} min
                  </div>
                )}
                <motion.div
                  className="w-full bg-yellow-500 rounded-t-md hover:bg-yellow-400 transition-colors cursor-default"
                  initial={{ height: 0 }}
                  animate={{ height: `${(val / maxActivity) * 88}px` }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  style={{ minHeight: val > 0 ? 4 : 0 }}
                />
                <span className="text-xs text-gray-400">{getDayLabel(last7[i])}</span>
              </div>
            ))}
          </div>
          {weekActivity.every((v) => v === 0) && (
            <p className="text-xs text-gray-400 text-center mt-2">No activity recorded yet -- start learning to see your chart!</p>
          )}
          {!weekActivity.every((v) => v === 0) && (
            <p className="text-xs text-gray-400 mt-2 text-center">Hover a bar to see minutes spent that day</p>
          )}
        </div>

        {/* Per-language breakdown */}
        <div className="space-y-4">
          <h2 className="font-bold text-gray-900">Language Breakdown</h2>
          {langProgress.map(({ lang, completed, pct, total }) => (
            <div key={lang.id} className="bg-white border border-gray-100 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{lang.icon}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-bold text-gray-900">{lang.title}</h3>
                    <span className="text-sm font-bold text-yellow-600">{pct}%</span>
                  </div>
                  <ProgressBar value={pct} size="sm" animate={false} />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{completed}/{total} concepts completed</span>
                <Link href={`/language/${lang.id}`} className="text-yellow-600 font-medium hover:text-yellow-700">View {'>'}</Link>
              </div>
            </div>
          ))}
        </div>

        {/* All-concept detail */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <h2 className="font-bold text-gray-900 mb-4">All Concepts</h2>
          <div className="space-y-2">
            {allConcepts.filter((c) => (completedStages[c.id] || []).length > 0).slice(0, 20).map((concept) => {
              const stages = completedStages[concept.id] || []
              const complete = isConceptDone(stages)
              return (
                <div key={concept.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${complete ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span className="flex-1 text-sm text-gray-700 font-medium">{concept.title}</span>
                  <span className="text-xs text-gray-400 shrink-0">{concept.langTitle}</span>
                  <div className="flex gap-1 shrink-0">
                    {[1, 2, 3].map((s) => (
                      <div key={s} className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${stages.includes(s) ? 'bg-yellow-500 text-black' : 'bg-gray-100 text-gray-400'}`}>{s}</div>
                    ))}
                  </div>
                  <Link href={`/concept/${concept.id}`} className="text-xs text-yellow-600 hover:text-yellow-700 shrink-0">
                    {complete ? 'Review' : 'Continue'}
                  </Link>
                </div>
              )
            })}
            {allConcepts.filter((c) => (completedStages[c.id] || []).length > 0).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No concepts started yet -- go to a language to begin!</p>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
