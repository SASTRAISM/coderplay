'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Target, BookOpen, ClipboardList, Code2, Flame } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { AchievementBadge } from '@/components/dashboard/AchievementBadge'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { PageTransition } from '@/components/shared/PageTransition'
import { BackButton } from '@/components/shared/BackButton'
import { listenToProgress, listenToStreak, listenToAchievements, unlockAchievement } from '@/lib/firebase/firestore'
import { mergeAchievements, getAchievementsByCategory, ALL_ACHIEVEMENTS } from '@/services/userService'
import { calculateLevel, getLevelTitle, xpForNextLevel } from '@/services/progressService'
import { LANGUAGES } from '@/data/languages'
import { CONCEPTS } from '@/data/concepts'
import type { Achievement, UserProgress, Streak } from '@/types'

type Category = 'all' | 'learning' | 'assessment' | 'coding' | 'consistency'

const categories: { id: Category; label: string; Icon: LucideIcon }[] = [
  { id: 'all',         label: 'All',         Icon: Target        },
  { id: 'learning',    label: 'Learning',    Icon: BookOpen      },
  { id: 'assessment',  label: 'Assessment',  Icon: ClipboardList },
  { id: 'coding',      label: 'Coding',      Icon: Code2         },
  { id: 'consistency', label: 'Consistency', Icon: Flame         },
]

function isConceptDone(stages: number[]) {
  return stages.includes(1) && stages.includes(2) && stages.includes(3)
}

// Derive which achievements are earned from real data
function computeEarned(
  progress: UserProgress | null,
  streak: Streak | null,
  xp: number,
  existingEarned: Achievement[],
): Achievement[] {
  const earnedIds = new Set(existingEarned.map((a) => a.id))
  const completedStages = progress?.completedStages ?? {}
  const totalDone = Object.values(completedStages).filter((s) => isConceptDone(s)).length

  const langDone = LANGUAGES.some((lang) =>
    (CONCEPTS[lang.id] || []).every((c) => isConceptDone(completedStages[c.id] || []))
      && (CONCEPTS[lang.id] || []).length > 0
  )

  const currentStreak = streak?.currentStreak ?? 0

  const criteria: Record<string, boolean> = {
    first_concept:  totalDone >= 1,
    five_concepts:  totalDone >= 5,
    ten_concepts:   totalDone >= 10,
    first_language: langDone,
    xp_500:         xp >= 500,
    xp_2000:        xp >= 2000,
    streak_3:       currentStreak >= 3,
    streak_7:       currentStreak >= 7,
    streak_30:      currentStreak >= 30,
  }

  const result = [...existingEarned]
  for (const [id, met] of Object.entries(criteria)) {
    if (met && !earnedIds.has(id)) {
      const def = ALL_ACHIEVEMENTS.find((a) => a.id === id)
      if (def) result.push({ ...def, isEarned: true, earnedAt: new Date().toISOString() })
    }
  }
  return result
}

export default function AchievementsPage() {
  const { user, profile } = useAuth()
  const [activeCategory, setActiveCategory] = useState<Category>('all')
  const [earnedFromDB, setEarnedFromDB] = useState<Achievement[]>([])
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [streak, setStreak] = useState<Streak | null>(null)

  useEffect(() => {
    if (!user) return
    const u1 = listenToProgress(user.uid, setProgress)
    const u2 = listenToStreak(user.uid, setStreak)
    const u3 = listenToAchievements(user.uid, setEarnedFromDB)
    return () => { u1(); u2(); u3() }
  }, [user])

  const xp = profile?.xp ?? 0

  // Compute earned including auto-derived ones
  const computedEarned = computeEarned(progress, streak, xp, earnedFromDB)

  // Persist any newly computed achievements back to Firestore
  useEffect(() => {
    if (!user || computedEarned.length === 0) return
    const existingIds = new Set(earnedFromDB.map((a) => a.id))
    for (const ach of computedEarned) {
      if (!existingIds.has(ach.id)) {
        unlockAchievement(user.uid, ach).catch(() => {})
      }
    }
  }, [computedEarned.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const allMerged = mergeAchievements(computedEarned)
  const level = calculateLevel(xp)
  const levelTitle = getLevelTitle(level)
  const levelProg = xpForNextLevel(xp)
  const earnedCount = allMerged.filter((a) => a.isEarned).length
  const totalXPFromAchievements = computedEarned.reduce((sum, a) => sum + (a.xpReward ?? 0), 0)

  const filtered = activeCategory === 'all'
    ? allMerged
    : allMerged.filter((a) => a.category === activeCategory)

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <BackButton fallbackHref="/dashboard" label="Back to Dashboard" />

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-gray-900">Achievements</h1>
          <div className="text-right">
            <p className="text-xs text-gray-400">{earnedCount} / {allMerged.length} earned</p>
            <p className="text-sm font-bold text-yellow-600">+{totalXPFromAchievements} XP total</p>
          </div>
        </div>

        {/* Level + XP card */}
        <div className="bg-gray-950 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-yellow-500 text-xs font-bold uppercase tracking-widest">Level {level}</p>
              <p className="text-xl font-black mt-0.5">{levelTitle}</p>
            </div>
            <div className="text-right">
              <p className="text-yellow-500 font-black text-2xl">{xp.toLocaleString()}</p>
              <p className="text-gray-500 text-xs">Total XP</p>
            </div>
          </div>
          <ProgressBar value={levelProg.percentage} size="md" color="yellow" animate />
          <p className="text-gray-500 text-xs mt-2">{levelProg.current} / {levelProg.needed} XP to Level {level + 1}</p>
        </div>

        {/* Category summary */}
        <div className="grid grid-cols-4 gap-3">
          {categories.slice(1).map((cat) => {
            const catAchs = getAchievementsByCategory(allMerged, cat.id as Achievement['category'])
            const catEarned = catAchs.filter((a) => a.isEarned).length
            return (
              <div key={cat.id} className="bg-white border border-gray-100 rounded-xl p-3 text-center">
                <div className="flex justify-center mb-1"><cat.Icon className="w-5 h-5 text-gray-500" /></div>
                <p className="text-sm font-black text-gray-900">{catEarned}/{catAchs.length}</p>
                <p className="text-xs text-gray-400">{cat.label}</p>
              </div>
            )
          })}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button key={cat.id} type="button" onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat.id ? 'bg-yellow-500 text-black shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}>
              <cat.Icon className="w-4 h-4" />{cat.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filtered.map((ach, i) => (
            <motion.div key={ach.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className={`bg-white border rounded-2xl p-4 text-center transition-all ${ach.isEarned ? 'border-yellow-200 shadow-sm' : 'border-gray-100 opacity-60'}`}>
              <AchievementBadge achievement={ach} size="md" showLabel={false} />
              <p className={`text-xs font-semibold mt-2 ${ach.isEarned ? 'text-gray-900' : 'text-gray-400'}`}>{ach.title}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-tight line-clamp-2">{ach.description}</p>
              {ach.isEarned
                ? <p className="text-xs font-bold text-yellow-600 mt-1.5">+{ach.xpReward} XP</p>
                : <p className="text-xs text-gray-300 mt-1.5 italic">{ach.requirement}</p>}
              {ach.isEarned && ach.earnedAt && (
                <p className="text-xs text-gray-300 mt-0.5">
                  {new Date(ach.earnedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </PageTransition>
  )
}