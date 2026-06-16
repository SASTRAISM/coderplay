'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Zap, Flame, CheckCircle2, Timer, Target, Trophy, Rocket, BookOpen } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { LANGUAGES } from '@/data/languages'
import { CONCEPTS } from '@/data/concepts'
import { APTITUDE_SUBJECTS, APTITUDE_CONCEPTS } from '@/data/aptitudeData'
import { LanguageCard } from '@/components/dashboard/LanguageCard'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { AchievementBadge } from '@/components/dashboard/AchievementBadge'
import { PageTransition } from '@/components/shared/PageTransition'
import { getLocalDateKey } from '@/lib/date'
import { getDailyThought } from '@/lib/dailyThought'
import { mergeAchievements } from '@/services/userService'
import { xpForNextLevel, getLevelTitle, calculateLevel } from '@/services/progressService'
import { listenToProgress, listenToStreak, listenToUserProfile, restoreStreak, getStreakRestoreCost } from '@/lib/firebase/firestore'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { getTodayTimeSpentMinutes, getTotalTimeSpentMinutes } from '@/lib/studyStats'
import type { UserProgress, Streak, UserProfile, ActivityItem } from '@/types'

function getGreeting(name: string) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  return `${greeting}, ${name.split(' ')[0]}!`
}

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function buildActivities(progress: UserProgress | null): ActivityItem[] {
  if (!progress?.completedStages) return []
  const items: ActivityItem[] = []
  Object.entries(progress.completedStages).forEach(([conceptId, stages]) => {
    if ((stages as number[]).includes(3)) {
      items.push({ id: `${conceptId}-complete`, type: 'stage_complete', title: `Completed ${conceptId.replace(/_/g, ' ')}`, description: 'All 3 stages done', xpEarned: 250, timestamp: new Date(Date.now() - 3600000), conceptId })
    } else if ((stages as number[]).includes(2)) {
      items.push({ id: `${conceptId}-s2`, type: 'stage_complete', title: `Passed Assessment -- ${conceptId.replace(/_/g, ' ')}`, description: 'Stage 2 done', xpEarned: 100, timestamp: new Date(Date.now() - 7200000), conceptId })
    } else if ((stages as number[]).includes(1)) {
      items.push({ id: `${conceptId}-s1`, type: 'stage_complete', title: `Completed Learning -- ${conceptId.replace(/_/g, ' ')}`, description: 'Stage 1 done', xpEarned: 50, timestamp: new Date(Date.now() - 10800000), conceptId })
    }
  })
  return items.slice(0, 6)
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [featuredAchievements] = useState(mergeAchievements([]).slice(0, 4))
  const [isRestoring, setIsRestoring] = useState(false)
  const [restoreError, setRestoreError] = useState('')
  const [aptitudePct, setAptitudePct] = useState<number>(0)

  // Real-time Firestore state
  const [liveProfile, setLiveProfile] = useState<UserProfile | null>(null)
  const [liveProgress, setLiveProgress] = useState<UserProgress | null>(null)
  const [liveStreak, setLiveStreak] = useState<Streak | null>(null)
  const dailyThought = getDailyThought()

  // Load overall aptitude progress (MCQ completions across all subjects)
  useEffect(() => {
    if (!user) return
    let mounted = true
    const allConcepts = APTITUDE_SUBJECTS.flatMap(s =>
      (APTITUDE_CONCEPTS[s.id] || []).map(c => ({ sid: s.id, cid: c.id }))
    )
    if (allConcepts.length === 0) return
    Promise.all(
      allConcepts.map(({ sid, cid }) =>
        getDoc(doc(db, 'aptitudeMCQResults', `${user.uid}_${sid}_${cid}`))
          .then(snap => snap.exists() ? 1 : 0)
          .catch(() => 0)
      )
    ).then(results => {
      if (!mounted) return
      const done = results.reduce((a: number, b: number) => a + b, 0)
      setAptitudePct(Math.round((done / allConcepts.length) * 100))
    })
    return () => { mounted = false }
  }, [user?.uid])

  useEffect(() => {
    if (!user) return

    // Real-time listeners
    const unsubProfile = listenToUserProfile(user.uid, setLiveProfile)
    const unsubProgress = listenToProgress(user.uid, setLiveProgress)
    const unsubStreak = listenToStreak(user.uid, setLiveStreak)

    return () => {
      unsubProfile()
      unsubProgress()
      unsubStreak()
    }
  }, [user])

  // Derived stats
  const xp = liveProfile?.xp ?? 0
  const level = calculateLevel(xp)
  const displayName = liveProfile?.displayName || user?.displayName || 'Student'

  const conceptsDone = Object.entries(liveProgress?.completedStages || {}).filter(([, stages]) => {
    const s = stages as number[]
    return s.includes(1) && s.includes(2) && s.includes(3)
  }).length

  const totalTimeMinutes = getTotalTimeSpentMinutes(liveProgress)
  const todayTimeMinutes = getTodayTimeSpentMinutes(liveProgress)

  const dayStreak = liveStreak?.currentStreak ?? 0
  const todayKey = getLocalDateKey()
  const canRestoreStreak =
    liveStreak?.restoreAvailableOn === todayKey &&
    liveStreak?.lastRestoredOn !== todayKey &&
    Boolean(liveStreak.restoreBaseStreak)

  // Progress per language
  const getLanguageProgress = (langId: string) => {
    const concepts = CONCEPTS[langId] || []
    const done = concepts.filter(c => {
      const stages = liveProgress?.completedStages?.[c.id] as number[] || []
      return stages.includes(1) && stages.includes(2) && stages.includes(3)
    }).length
    return { completed: done, pct: concepts.length > 0 ? Math.round((done / concepts.length) * 100) : 0 }
  }

  const activities = buildActivities(liveProgress)

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
      <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-black text-gray-900">{getGreeting(displayName)}</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {dayStreak > 0
                ? `You're on a ${dayStreak}-day streak! Keep it going!`
                : 'Start learning today to build your streak!'}
            </p>
          </div>
          <Link
            href="/language/python"
            className="self-start sm:self-auto px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm rounded-full transition-colors"
          >
            Continue Learning {'>'}
          </Link>
        </motion.div>

        {/* Live Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard label="Total XP" value={xp.toLocaleString()} icon={<Zap className="w-6 h-6 text-black" />} subtitle={`Level ${level} Coder`} highlight delay={0} />
          <StatsCard
            label="Day Streak"
            value={String(dayStreak)}
            icon={<Flame className="w-6 h-6 text-orange-500" />}
            subtitle={dayStreak > 0 ? 'Days in a row' : 'Log in daily!'}
            delay={0.05}
          />
          <StatsCard
            label="Concepts Done"
            value={String(conceptsDone)}
            icon={<CheckCircle2 className="w-6 h-6 text-green-600" />}
            subtitle="All 3 stages complete"
            delay={0.1}
          />
          <StatsCard
            label="Time Spent"
            value={formatTime(totalTimeMinutes)}
            icon={<Timer className="w-6 h-6 text-emerald-600" />}
            subtitle={`Today ${formatTime(todayTimeMinutes)}`}
            delay={0.15}
          />
        </div>

        {canRestoreStreak && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold text-amber-900">Your streak can still be restored today</p>
              <p className="text-sm text-amber-800 mt-1">
                Use {getStreakRestoreCost(liveStreak)} XP to continue your {liveStreak?.restoreBaseStreak}-day streak with no break.
              </p>
              {restoreError && <p className="text-xs text-red-600 mt-2">{restoreError}</p>}
            </div>
            <button
              type="button"
              onClick={handleRestoreStreak}
              disabled={isRestoring}
              className="shrink-0 px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-colors disabled:opacity-50"
            >
              {isRestoring ? 'Restoring...' : `Restore Streak for ${getStreakRestoreCost(liveStreak)} XP`}
            </button>
          </div>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Languages -- spans 2 cols */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Your Learning Tracks</h2>
              <span className="text-xs text-gray-400">{LANGUAGES.length} languages</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {LANGUAGES.map((lang) => {
                const prog = getLanguageProgress(lang.id)
                return (
                  <LanguageCard
                    key={lang.id}
                    language={lang}
                    completedConcepts={prog.completed}
                    progressPercent={prog.pct}
                  />
                )
              })}

              {/* Aptitude Card */}
              <Link href="/aptitude">
                <motion.div
                  whileHover={{ y: -3, boxShadow: '0 12px 40px rgba(0,0,0,0.10)' }}
                  transition={{ duration: 0.2 }}
                  className="group bg-gradient-to-br from-indigo-50 to-purple-50 dark:bg-gray-100 border border-indigo-100/30 rounded-2xl p-6 hover:border-indigo-300 transition-colors cursor-pointer h-full flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center"><Target className="w-6 h-6 text-indigo-600" /></div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-base leading-tight">Aptitude Prep</h3>
                        <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">Placement Ready</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200 flex items-center gap-1"><Flame className="w-3 h-3" /> New</span>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed mb-4 flex-1">Quants, Verbal, Logical & Technical Aptitude with AI teaching and proctored MCQ exams.</p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {['Quants', 'Verbal', 'Logical', 'DI', 'Technical'].map(tag => (
                      <span key={tag} className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-md border border-gray-100">{tag}</span>
                    ))}
                  </div>
                  {/* Aptitude overall progress */}
                  <div className="mb-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{aptitudePct === 0 ? 'Not started' : aptitudePct === 100 ? 'All done!' : 'In progress'}</span>
                      <span className={`text-xs font-bold ${aptitudePct === 100 ? 'text-green-600' : aptitudePct > 0 ? 'text-indigo-600' : 'text-gray-300'}`}>{aptitudePct}%</span>
                    </div>
                    <div className="h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${aptitudePct === 100 ? 'bg-green-400' : 'bg-indigo-400'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${aptitudePct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                  <div className="block w-full text-center text-sm font-semibold py-2.5 rounded-xl border-2 border-indigo-200 text-white group-hover:border-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                    {aptitudePct > 0 ? 'Continue Aptitude Prep ->' : 'Start Aptitude Prep ->'}
                  </div>
                </motion.div>
              </Link>

              {/* Placement Tests Card */}
              <Link href="/placement-tests">
                <motion.div
                  whileHover={{ y: -3, boxShadow: '0 12px 40px rgba(0,0,0,0.10)' }}
                  transition={{ duration: 0.2 }}
                  className="group bg-gradient-to-br from-green-50 to-emerald-50 dark:bg-gray-100 border border-green-100 rounded-2xl p-6 hover:border-green-300 transition-colors cursor-pointer h-full flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center"><Trophy className="w-6 h-6 text-green-600" /></div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-base leading-tight">Placement Tests</h3>
                        <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">Instructor Scheduled</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed mb-4 flex-1">TCS, Infosys, Wipro, Amazon-style mocks scheduled by your instructor. Proctored exam mode.</p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {['TCS', 'Infosys', 'Wipro', 'Amazon'].map(tag => (
                      <span key={tag} className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-md border border-gray-100">{tag}</span>
                    ))}
                  </div>
                  <div className="block w-full text-center text-sm font-semibold py-2.5 rounded-xl border-2 border-green-200 text-white group-hover:border-green-500 group-hover:bg-green-500 group-hover:text-white transition-all">
                    View Placement Tests {'>'}
                  </div>
                </motion.div>
              </Link>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Level card */}
            <div className="bg-gray-950 rounded-2xl p-5 text-white">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-yellow-500 text-xs font-semibold uppercase tracking-wide">Level {level}</p>
                  <p className="text-lg font-black mt-0.5">{getLevelTitle(level)}</p>
                </div>
                <div className="w-12 h-12 rounded-full border-2 border-yellow-500/50 flex items-center justify-center"><Rocket className="w-6 h-6 text-yellow-500" /></div>
              </div>
              {(() => {
                const lvlProg = xpForNextLevel(xp)
                return (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{xp} XP</span>
                      <span>{lvlProg.needed - lvlProg.current} XP to Level {level + 1}</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-yellow-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${lvlProg.percentage}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                )
              })()}
              <div className="mt-3 pt-3 border-t border-gray-800 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-gray-400">Today: <span className="text-green-400 font-semibold">{formatTime(todayTimeMinutes)}</span></span>
              </div>
            </div>

            {/* Recent activity -- real data */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3">Recent Activity</h3>
              {activities.length > 0 ? (
                <RecentActivity activities={activities} />
              ) : (
                <div className="bg-white border border-gray-100 rounded-xl p-5 text-center">
                  <div className="flex justify-center mb-2"><BookOpen className="w-8 h-8 text-gray-400" /></div>
                  <p className="text-xs text-gray-500">Start a concept to see your activity here.</p>
                  <Link href="/language/python" className="text-xs text-yellow-600 font-semibold hover:text-yellow-700 mt-2 inline-block">
                    Start Python {'>'}
                  </Link>
                </div>
              )}
            </div>

            {/* Achievements */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900">Achievements</h3>
                <Link href="/achievements" className="text-xs text-yellow-600 font-medium hover:text-yellow-700">See all {'>'}</Link>
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="grid grid-cols-4 gap-3">
                  {featuredAchievements.map((ach) => (
                    <AchievementBadge key={ach.id} achievement={ach} size="sm" showLabel={false} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
