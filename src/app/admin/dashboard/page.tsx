'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { CONCEPTS } from '@/data/concepts'
import { LANGUAGES } from '@/data/languages'
import Link from 'next/link'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts'

// -- Types ----------------------------------------------------------------------
interface RawUser {
  uid?: string
  email?: string
  displayName?: string
  registrationNumber?: string
  branch?: string
  year?: string
  xp?: number
  level?: number
  lastSeen?: { seconds: number } | string | null
  createdAt?: { seconds: number } | string | null
}

interface RawProgress {
  completedStages?: Record<string, number[]>
  timeSpent?: Record<string, number>
  dailyActivity?: Record<string, number>
  assessmentScores?: Record<string, number>
}

// -- Helpers --------------------------------------------------------------------
const PIE_COLORS = ['#EAB308','#3B82F6','#10B981','#8B5CF6','#EF4444','#F97316','#EC4899','#06B6D4']

function getMs(val: RawUser['lastSeen']): number {
  if (!val) return 0
  if (typeof val === 'object' && 'seconds' in val) return val.seconds * 1000
  if (typeof val === 'string') return new Date(val).getTime()
  return 0
}

function getCreatedMs(val: RawUser['createdAt']): number {
  return getMs(val as RawUser['lastSeen'])
}

// 60-second window -> immediate offline detection
function isOnlineNow(val: RawUser['lastSeen'], nowMs: number): boolean {
  const ms = getMs(val)
  return ms > 0 && nowMs - ms < 60_000
}

function formatLastSeen(val: RawUser['lastSeen'], nowMs: number): string {
  const ms = getMs(val)
  if (!ms) return 'Never'
  const diff = Math.floor((nowMs - ms) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(ms).toLocaleDateString()
}

function getLast14Days(): string[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    return d.toISOString().split('T')[0]
  })
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function downloadCSV(
  users: RawUser[],
  progressMap: Record<string, RawProgress>,
  nowMs: number,
  selectedDate: string,
) {
  const today = new Date(nowMs).toISOString().split('T')[0]
  const headers = [
    'Name','Email','Reg No','Branch','Year','XP','Level',
    'Online Now','Last Seen','Joined','Study Minutes (total)',
    `Activity on ${selectedDate} (min)`,
  ]
  const rows = users.map(u => {
    const p = progressMap[u.uid || ''] || {}
    const studyMins = Object.values(p.timeSpent || {}).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0)
    const dateMins = p.dailyActivity?.[selectedDate] || 0
    return [
      u.displayName || '',
      u.email || '',
      u.registrationNumber || '',
      u.branch || '',
      u.year || '',
      u.xp || 0,
      u.level || 0,
      isOnlineNow(u.lastSeen, nowMs) ? 'Yes' : 'No',
      formatLastSeen(u.lastSeen, nowMs),
      getCreatedMs(u.createdAt) ? new Date(getCreatedMs(u.createdAt)).toLocaleDateString() : '',
      studyMins,
      dateMins,
    ]
  })
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `coderplay-students-${selectedDate}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// -- Main Component -------------------------------------------------------------
export default function AdminDashboardPage() {
  const usersRef = useRef<Record<string, RawUser>>({})
  const progressRef = useRef<Record<string, RawProgress>>({})

  // Derived display state -- rebuilt on every Firestore update OR every 10s tick
  const [users, setUsers] = useState<RawUser[]>([])
  const [progressMap, setProgressMap] = useState<Record<string, RawProgress>>({})
  const [now, setNow] = useState(Date.now())
  const [loading, setLoading] = useState(true)
  const [adminName, setAdminName] = useState('Admin')
  const [csvDate, setCsvDate] = useState(() => new Date().toISOString().split('T')[0])

  useEffect(() => {
    const n = localStorage.getItem('cp_admin_name')
    if (n) setAdminName(n)
  }, [])

  // Tick every 10s so online count re-evaluates even without a Firestore event
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), snap => {
      snap.forEach(doc => { usersRef.current[doc.id] = { uid: doc.id, ...doc.data() } as RawUser })
      setUsers(Object.values(usersRef.current))
      setNow(Date.now()) // force immediate re-derive on data change
    })
    const unsubProgress = onSnapshot(collection(db, 'progress'), snap => {
      snap.forEach(doc => { progressRef.current[doc.id] = doc.data() as RawProgress })
      setProgressMap({ ...progressRef.current })
      setLoading(false)
    })
    const fallback = setTimeout(() => setLoading(false), 4000)
    return () => { unsubUsers(); unsubProgress(); clearTimeout(fallback) }
  }, [])

  // -- Derived metrics (recalculated on every render) ----------------------------
  const allConcepts = Object.values(CONCEPTS).flat().length
  const today = new Date(now).toISOString().split('T')[0]

  const onlineUsers = users.filter(u => isOnlineNow(u.lastSeen, now))
  const onlineCount = onlineUsers.length

  const activeTodayCount = users.filter(u => {
    const p = progressMap[u.uid || '']
    return p?.dailyActivity?.[today] ? p.dailyActivity[today] > 0 : false
  }).length

  const totalStudyMins = Object.values(progressMap).reduce((sum, p) => {
    return sum + Object.values(p.timeSpent || {}).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0)
  }, 0)

  const avgXP = users.length
    ? Math.round(users.reduce((a, u) => a + (u.xp || 0), 0) / users.length)
    : 0

  // Branch distribution
  const branchCounts: Record<string, number> = {}
  users.forEach(u => { const b = u.branch || 'Unknown'; branchCounts[b] = (branchCounts[b] || 0) + 1 })
  const branchData = Object.entries(branchCounts).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))

  // Last 14 days activity + logins
  const last14 = getLast14Days()
  const activityData = last14.map(date => {
    let total = 0
    Object.values(progressMap).forEach(p => { total += p.dailyActivity?.[date] || 0 })
    return { date: shortDate(date), minutes: total }
  })
  const loginsByDay = last14.map(date => ({
    date: shortDate(date),
    logins: users.filter(u => {
      const ms = getMs(u.lastSeen)
      return ms > 0 && new Date(ms).toISOString().split('T')[0] === date
    }).length,
  }))

  // Top 10 by XP
  const topPerformers = [...users].sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 10)

  // Recent 5 signups
  const recentSignups = [...users].sort((a, b) => getCreatedMs(b.createdAt) - getCreatedMs(a.createdAt)).slice(0, 5)

  const handleExportCSV = useCallback(() => {
    downloadCSV(users, progressMap, now, csvDate)
  }, [users, progressMap, now, csvDate])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-gray-500 text-sm">Loading live data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Welcome back, {adminName}</h1>
          <p className="text-xs text-gray-400 mt-0.5">Live analytics . auto-refreshes every 10 s . last update {new Date(now).toLocaleTimeString()}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl shadow-sm px-3 py-1.5">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <input
              type="date"
              value={csvDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={e => setCsvDate(e.target.value)}
              className="text-sm text-gray-700 font-semibold bg-transparent focus:outline-none cursor-pointer"
              title="Select date for CSV export"
            />
          </div>
          <button type="button" onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-sm rounded-xl shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2">
            <span className={`w-2 h-2 rounded-full ${onlineCount > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
            <span className="text-sm font-bold text-green-700">{onlineCount} online now</span>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Students', value: users.length, sub: 'registered', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
          { label: 'Online Now', value: onlineCount, sub: 'active < 60 s ago', color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
          { label: 'Active Today', value: activeTodayCount, sub: 'studied today', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-100' },
          { label: 'Study Hours', value: Math.round(totalStudyMins / 60).toLocaleString(), sub: 'cumulative', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100' },
          { label: 'Avg XP', value: avgXP.toLocaleString(), sub: 'per student', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' },
        ].map(c => (
          <div key={c.label} className={`rounded-2xl p-5 border ${c.bg}`}>
            <div className={`text-2xl font-black ${c.color}`}>{c.value}</div>
            <div className="text-xs font-bold text-gray-700 mt-0.5">{c.label}</div>
            <div className="text-xs text-gray-400">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Online users list (only when someone is online) */}
      {onlineCount > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <p className="text-xs font-black text-green-700 uppercase tracking-wide mb-3">Currently Online ({onlineCount})</p>
          <div className="flex flex-wrap gap-2">
            {onlineUsers.map(u => (
              <div key={u.uid} className="flex items-center gap-2 bg-white border border-green-200 rounded-xl px-3 py-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                <span className="text-xs font-bold text-gray-800">{u.displayName || u.email || 'Student'}</span>
                <span className="text-xs text-gray-400">{formatLastSeen(u.lastSeen, now)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity area */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-1">Platform Activity</h2>
          <p className="text-xs text-gray-400 mb-4">Total study minutes across all students -- last 14 days</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={activityData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EAB308" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#EAB308" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, fontSize: 12 }} formatter={(v) => [`${v as number} min`, 'Activity']} />
              <Area type="monotone" dataKey="minutes" stroke="#EAB308" strokeWidth={2.5} fill="url(#actGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Branch pie */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-1">Branch Distribution</h2>
          <p className="text-xs text-gray-400 mb-4">Students per branch</p>
          {branchData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={branchData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                    {branchData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {branchData.slice(0, 5).map((b, i) => (
                  <div key={b.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg width="10" height="10" aria-hidden="true" className="flex-shrink-0">
                        <rect width="10" height="10" rx="2" fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      </svg>
                      <span className="text-xs text-gray-600 truncate max-w-28">{b.name}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-800">{b.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* Daily Logins */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-1">Daily Logins</h2>
        <p className="text-xs text-gray-400 mb-4">Distinct users seen per day (based on lastSeen) -- last 14 days</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={loginsByDay} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, fontSize: 12 }} formatter={(v) => [`${v as number} users`, 'Logins']} />
            <Bar dataKey="logins" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top performers + Recent signups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top performers */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Top Performers</h2>
              <p className="text-xs text-gray-400">Ranked by XP</p>
            </div>
            <Link href="/admin/students" className="text-xs text-yellow-600 font-bold hover:underline">View all &rarr;</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {topPerformers.map((u, i) => {
              const p = progressMap[u.uid || '']
              const done = Object.values(p?.completedStages || {}).filter(s => s.includes(1) && s.includes(2) && s.includes(3)).length
              const pct = allConcepts > 0 ? Math.round((done / allConcepts) * 100) : 0
              const online = isOnlineNow(u.lastSeen, now)
              const initials = (u.displayName || u.email || 'U').slice(0, 2).toUpperCase()
              return (
                <div key={u.uid} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${i === 0 ? 'bg-yellow-400 text-black' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {i + 1}
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-yellow-100 flex items-center justify-center font-black text-yellow-700 text-xs flex-shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-900 truncate">{u.displayName || u.email}</div>
                    <div className="text-xs text-gray-400 truncate">{u.branch || '--'} . {u.registrationNumber || '--'}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-black text-yellow-600">{(u.xp || 0).toLocaleString()} XP</div>
                    <div className="text-xs text-gray-400">{pct}% done</div>
                  </div>
                  {online && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />}
                </div>
              )
            })}
            {topPerformers.length === 0 && <div className="px-6 py-8 text-center text-gray-400 text-sm">No students yet</div>}
          </div>
        </div>

        {/* Recent signups */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Recent Signups</h2>
            <p className="text-xs text-gray-400">Last 5 registered students</p>
          </div>
          <div className="divide-y divide-gray-50">
            {recentSignups.map(u => (
              <div key={u.uid} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                <div className="w-9 h-9 rounded-xl bg-yellow-50 flex items-center justify-center font-black text-yellow-700 text-sm flex-shrink-0">
                  {(u.displayName || u.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-900 truncate">{u.displayName || u.email}</div>
                  <div className="text-xs text-gray-400 truncate">{u.email}</div>
                  <div className="text-xs text-gray-400">{u.branch || '--'} . Year {u.year || '--'}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-black text-yellow-600">{(u.xp || 0).toLocaleString()} XP</div>
                  <div className="text-xs text-gray-400">{formatLastSeen(u.lastSeen, now)}</div>
                </div>
              </div>
            ))}
            {recentSignups.length === 0 && <div className="px-6 py-8 text-center text-gray-400 text-sm">No students yet</div>}
          </div>
          <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
            <Link href="/admin/students" className="flex-1 px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm rounded-xl text-center">All Students</Link>
            <Link href="/admin/mock-tests" className="flex-1 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-sm rounded-xl text-center">Placement Tests</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
