'use client'

import { useState, useEffect } from 'react'
import { Zap, Flame, CheckCircle2, Timer, MessageSquare, Lock, Send } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/firebase/config'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { getBackendUrl } from '@/lib/backendUrl'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { PageTransition } from '@/components/shared/PageTransition'
import { BackButton } from '@/components/shared/BackButton'
import { AchievementBadge } from '@/components/dashboard/AchievementBadge'
import { listenToProgress, listenToStreak } from '@/lib/firebase/firestore'
import { LANGUAGES } from '@/data/languages'
import { CONCEPTS } from '@/data/concepts'
import {
  calculateLevel,
  getLevelTitle,
  getLevelBadge,
  xpForNextLevel,
  checkAchievements,
} from '@/services/progressService'
import { getInitials } from '@/services/userService'
import type { UserProgress, Streak, Achievement } from '@/types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

function isConceptDone(stages: number[]) {
  return stages.includes(1) && stages.includes(2) && stages.includes(3)
}

function getLast7Days(): string[] {
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    days.push(key)
  }
  return days
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { weekday: 'short' })
}

const PIE_COLORS = ['#F59E0B', '#3B82F6', '#8B5CF6', '#EF4444', '#10B981', '#EC4899', '#6366F1']

const LANG_COLORS: Record<string, string> = {
  python:       'bg-blue-500',
  javascript:   'bg-yellow-400',
  c:            'bg-indigo-500',
  cpp:          'bg-purple-500',
  java:         'bg-red-500',
  html_css:     'bg-pink-500',
  data_analytics: 'bg-emerald-500',
}

export default function ProfilePage() {
  const { user, profile } = useAuth()
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [streak, setStreak] = useState<Streak | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSending, setFeedbackSending] = useState(false)
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [feedbackError, setFeedbackError] = useState('')

  useEffect(() => {
    if (!user) return
    const u1 = listenToProgress(user.uid, setProgress)
    const u2 = listenToStreak(user.uid, setStreak)
    return () => { u1(); u2() }
  }, [user])

  const xp = profile?.xp ?? 0
  const level = calculateLevel(xp)
  const levelTitle = getLevelTitle(level)
  const levelBadge = getLevelBadge(level)
  const levelProgress = xpForNextLevel(xp)
  const displayName = profile?.displayName || user?.displayName || 'Student'
  const initials = getInitials(displayName)
  // Prefer Firebase Auth metadata (always valid), fall back to Firestore profile field
  const joinDate = (() => {
    const metaTime = user?.metadata?.creationTime
    if (metaTime) {
      const d = new Date(metaTime)
      if (!isNaN(d.getTime())) return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    }
    if (profile?.createdAt) {
      const d = new Date(profile.createdAt as string)
      if (!isNaN(d.getTime())) return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    }
    return 'Recently'
  })()

  const completedStages = progress?.completedStages ?? {}
  const totalDone = Object.values(completedStages).filter((s) => isConceptDone(s)).length

  const langProgress = LANGUAGES.map((lang) => {
    const concepts = CONCEPTS[lang.id] || []
    const done = concepts.filter((c) => isConceptDone(completedStages[c.id] || [])).length
    const pct = concepts.length > 0 ? Math.round((done / concepts.length) * 100) : 0
    return { lang, done, pct }
  })

  // Daily activity chart data (last 7 days)
  const last7Days = getLast7Days()
  const dailyChartData = last7Days.map((dateKey) => ({
    day: formatDayLabel(dateKey),
    minutes: progress?.dailyActivity?.[dateKey] ?? 0,
  }))

  // Language pie chart data
  const pieData = langProgress
    .filter(({ lang }) => lang.totalConcepts > 0)
    .map(({ lang, pct }) => ({ name: lang.title, value: pct }))

  // Total study time (minutes)
  const totalMinutes = progress?.timeSpent
    ? (progress.timeSpent as Record<string, number>).total ?? 0
    : 0

  // Achievements
  const currentStreak = streak?.currentStreak ?? 0
  const allAchievements = checkAchievements(progress, xp, currentStreak, [])
  const earnedAchievements: Achievement[] = allAchievements
    .map((a) => ({ ...a, isEarned: true }))
  const lockedAchievements: Achievement[] = (() => {
    // Build the full list to show locked ones too
    const earnedIds = new Set(earnedAchievements.map((a) => a.id))
    const ALL_IDS = [
      'first_concept','five_concepts','streak_7','xp_500',
      'ten_concepts','all_concepts_lang','streak_3','streak_14','streak_30','streak_100',
      'xp_1000','xp_2500','xp_5000','xp_10000',
      'level_5','level_10','level_15',
      'speed_demon','night_owl','early_bird',
      'perfectionist','aptitude_starter','placement_warrior','comeback_kid',
    ]
    return ALL_IDS
      .filter((id) => !earnedIds.has(id))
      .map((id) => ({
        id,
        title: id.replace(/_/g, ' '),
        description: '',
        icon: '?',
        category: 'learning' as const,
        xpReward: 0,
        requirement: '',
        isEarned: false,
      }))
  })()

  // Tooltip formatter for recharts -- cast to any to avoid Formatter<ValueType> mismatch
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const barTooltipFormatter: any = (value: number | string) => [`${value} min`, 'Study Time']
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pieTooltipFormatter: any = (value: number | string) => [`${value}%`, 'Completion']

  const handleFeedback = async () => {
    if (!feedbackText.trim()) return
    setFeedbackSending(true)
    setFeedbackError('')
    const feedbackData = {
      name: profile?.displayName || user?.displayName || 'Student',
      regNo: profile?.registrationNumber || '',
      email: user?.email || '',
      message: feedbackText.trim(),
      uid: user?.uid || '',
    }
    try {
      // Save to Firestore
      const docId = `${user?.uid || 'anon'}_${Date.now()}`
      await setDoc(doc(db, 'feedback', docId), {
        ...feedbackData,
        createdAt: serverTimestamp(),
      })
      // Send to backend for email
      await fetch(`${getBackendUrl()}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackData),
      })
      setFeedbackSent(true)
      setFeedbackText('')
      setTimeout(() => setFeedbackSent(false), 5000)
    } catch {
      setFeedbackError('Failed to send feedback. Please try again.')
    } finally {
      setFeedbackSending(false)
    }
  }

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <BackButton fallbackHref="/dashboard" label="Back to Dashboard" />
        <h1 className="text-2xl font-black text-gray-900">My Profile</h1>

        {/* -- Header Card ------------------------------------------------ */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-full bg-yellow-400 flex items-center justify-center text-black text-3xl font-black shadow-md">
                {initials}
              </div>
              <div className={`absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full text-xs font-bold border-2 border-white shadow-sm ${levelBadge.color}`}>
                {levelBadge.icon} {level}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-gray-900">{displayName}</h2>
              </div>
              {profile?.registrationNumber && (
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-700">{profile.registrationNumber}</p>
                </div>
              )}
              {profile?.branch && (
                <p className="text-sm text-gray-500">
                  B.Tech {profile.branch}{profile.year ? ` * Year ${profile.year}` : ''}
                </p>
              )}
              <p className="text-sm text-gray-500">{user?.email}</p>
              <p className="text-xs text-gray-400">Member since {joinDate}</p>
              <div className={`inline-flex items-center gap-1.5 mt-1 px-3 py-1 rounded-full text-xs font-bold ${levelBadge.color}`}>
                <span>{levelBadge.icon}</span>
                <span>Level {level} -- {levelTitle}</span>
              </div>
            </div>
          </div>

          {/* Level Progress Bar */}
          <div className="mt-5 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-gray-500 font-medium">Level {level}</p>
                <p className="text-gray-900 font-bold text-sm">{levelTitle}</p>
              </div>
              <div className="text-right">
                <p className="text-yellow-600 font-black text-lg">{xp.toLocaleString()} XP</p>
                {level < 15 ? (
                  <p className="text-gray-400 text-xs">{levelProgress.current} / {levelProgress.needed} XP to next</p>
                ) : (
                  <p className="text-gray-400 text-xs">Max Level Reached!</p>
                )}
              </div>
            </div>
            <ProgressBar value={levelProgress.percentage} size="sm" color="yellow" animate={false} />
          </div>
        </div>

        {/* -- Stats Grid ------------------------------------------------- */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {([
            { label: 'Total XP',       value: xp.toLocaleString(),  Icon: Zap          as LucideIcon },
            { label: 'Level',          value: level,                 Icon: Zap          as LucideIcon },
            { label: 'Day Streak',     value: currentStreak,         Icon: Flame        as LucideIcon },
            { label: 'Concepts Done',  value: totalDone,             Icon: CheckCircle2 as LucideIcon },
            { label: 'Study Time',     value: `${totalMinutes}m`,    Icon: Timer        as LucideIcon },
          ] as { label: string; value: string | number; Icon: LucideIcon }[]).map((s) => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-center mb-1"><s.Icon className="w-6 h-6 text-gray-500" /></div>
              <div className="text-xl font-black text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* -- Charts Row ------------------------------------------------- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Daily Study Time Bar Chart */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-1">Daily Study Time</h3>
            <p className="text-xs text-gray-400 mb-4">Last 7 days (minutes)</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dailyChartData} barCategoryGap="30%">
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip
                  formatter={barTooltipFormatter}
                  contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }}
                  cursor={{ fill: '#FEF3C7' }}
                />
                <Bar dataKey="minutes" fill="#FBBF24" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Language Completion Pie Chart */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-1">Language Completion</h3>
            <p className="text-xs text-gray-400 mb-2">% of each language done</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={pieTooltipFormatter}
                  contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* -- Language Progress Bars -------------------------------------- */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4">Language Progress</h3>
          <div className="space-y-4">
            {langProgress.map(({ lang, done, pct }) => (
              <div key={lang.id} className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                  /* eslint-disable-next-line react/forbid-dom-props */
                  style={{ backgroundColor: lang.color }}
                >
                  {lang.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-800">{lang.title}</span>
                    <span className="text-xs font-medium text-gray-500">{done}/{lang.totalConcepts} concepts</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${LANG_COLORS[lang.id] ?? 'bg-yellow-400'}`}
                      /* eslint-disable-next-line react/forbid-dom-props */
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{pct}% complete</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* -- Feedback Form ---------------------------------------------- */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-gray-500" />
            <div>
              <h3 className="font-bold text-gray-900">Send Feedback</h3>
              <p className="text-xs text-gray-400">Share suggestions, report issues, or say anything -- we read every message.</p>
            </div>
          </div>

          {feedbackSent ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-green-700 font-bold text-sm">+ Feedback sent! Thank you, {profile?.displayName?.split(' ')[0] || 'friend'}.</p>
              <p className="text-green-600 text-xs mt-1">We'll get back to you soon.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 flex gap-4 text-xs text-gray-500">
                <span><span className="font-bold text-gray-700">Name:</span> {profile?.displayName || '--'}</span>
                {profile?.registrationNumber && (
                  <span><span className="font-bold text-gray-700">Reg NO:</span> {profile.registrationNumber}</span>
                )}
              </div>
              <textarea
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                placeholder="Type your feedback, suggestions, or questions here..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none placeholder:text-gray-300"
              />
              {feedbackError && (
                <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{feedbackError}</p>
              )}
              <button
                type="button"
                onClick={handleFeedback}
                disabled={feedbackSending || !feedbackText.trim()}
                className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black font-bold text-sm rounded-xl transition-colors"
              >
                {feedbackSending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : <span className="flex items-center justify-center gap-2"><Send className="w-4 h-4" /> Send Feedback</span>}
              </button>
            </div>
          )}
        </div>

        {/* -- Achievements ----------------------------------------------- */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Achievements</h3>
            <span className="text-xs bg-yellow-100 text-yellow-700 font-bold px-2 py-0.5 rounded-full">
              {earnedAchievements.length} earned
            </span>
          </div>

          {earnedAchievements.length > 0 ? (
            <>
              <p className="text-xs text-gray-400 mb-3 font-medium">Earned</p>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-4 mb-6">
                {earnedAchievements.map((a) => (
                  <AchievementBadge key={a.id} achievement={a} size="sm" showLabel={true} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="flex justify-center mb-2"><Lock className="w-10 h-10 text-gray-300" /></div>
              <p className="text-gray-500 text-sm font-medium">No achievements yet</p>
              <p className="text-gray-400 text-xs mt-1">Complete concepts and build streaks to earn badges</p>
            </div>
          )}

          {lockedAchievements.length > 0 && (
            <>
              <p className="text-xs text-gray-400 mb-3 font-medium">Locked ({lockedAchievements.length})</p>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
                {lockedAchievements.map((a) => (
                  <AchievementBadge key={a.id} achievement={a} size="sm" showLabel={false} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
