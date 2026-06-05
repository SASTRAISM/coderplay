'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
  collection,
  onSnapshot,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  getDoc,
} from 'firebase/firestore'
import { School, Calendar, Star } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { db } from '@/lib/firebase/config'
import { getBackendUrl } from '@/lib/backendUrl'
import { CONCEPTS } from '@/data/concepts'
import { LANGUAGES } from '@/data/languages'
import { APTITUDE_SUBJECTS } from '@/data/aptitudeData'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'

// ---------------------------------------------------------------------------
// ProgressBar -- SVG-based so no CSS inline style is needed
// ---------------------------------------------------------------------------

function ProgressBar({ pct, color = 'yellow' }: { pct: number; color?: 'yellow' | 'purple' }) {
  const fill = color === 'purple' ? '#C084FC' : '#EAB308'
  const w = Math.min(100, Math.max(0, pct))
  return (
    <svg width="100%" height="8" aria-label={`${w}%`}>
      <rect x={0} y={1} width="100%" height={6} rx={3} fill="#F3F4F6" />
      {w > 0 && <rect x={0} y={1} width={`${w}%`} height={6} rx={3} fill={fill} />}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FirestoreTimestamp { seconds: number }

interface RawUser {
  uid?: string
  email?: string
  displayName?: string
  registrationNumber?: string
  branch?: string
  year?: string
  xp?: number
  level?: number
  lastSeen?: FirestoreTimestamp | string | null
  onlineSince?: FirestoreTimestamp | string | null
  createdAt?: FirestoreTimestamp | string | null
}

interface RawProgress {
  completedStages?: Record<string, number[]>
  timeSpent?: Record<string, number>
  assessmentScores?: Record<string, number>
  dailyActivity?: Record<string, number>
}

interface MockTestResult {
  id: string
  languageId: string
  score: number
  totalMarks: number
  passed: boolean
  completedAt: FirestoreTimestamp | string | null
}

interface PlacementTestResult {
  id: string
  testId: string
  studentName: string
  score: number
  totalMarks: number
  timeTaken?: number
  submittedAt: FirestoreTimestamp | string | null
  evaluation?: {
    percentage: number
    grade: string
    passed: boolean
    aiSummary?: string
  }
}

interface AptitudeResult {
  id: string
  subjectId: string
  conceptId: string
  score: number
  totalQuestions: number
  completedAt: FirestoreTimestamp | string | null
}

interface FinalExamResult {
  languageId: string
  internalMarks: number
  externalMarks: number
  combinedScore: number
  tier: string
  passed: boolean
  grade: string
  submittedAt: FirestoreTimestamp | string | null
}

interface StudentData {
  uid: string
  email: string
  name: string
  regNum: string
  branch: string
  year: string
  xp: number
  level: number
  isOnline: boolean
  lastSeenRaw: RawUser['lastSeen']
  onlineSinceRaw: RawUser['onlineSince']
  totalMinutes: number
  conceptsDone: number
  totalConcepts: number
  completionPct: number
  assessmentAvg: number
  completedStages: Record<string, number[]>
  timeSpent: Record<string, number>
  assessmentScores: Record<string, number>
  dailyActivity: Record<string, number>
  currentStreak?: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALL_CONCEPTS = Object.values(CONCEPTS).flat()
const TOTAL_CONCEPTS = ALL_CONCEPTS.length

function getMs(val: RawUser['lastSeen']): number {
  if (!val) return 0
  if (typeof val === 'object' && 'seconds' in val) return val.seconds * 1000
  if (typeof val === 'string') return new Date(val).getTime()
  return 0
}

// 3-minute window -- user is considered idle/offline after 3 min of no activity
function isOnline(val: RawUser['lastSeen'], nowMs = Date.now()): boolean {
  const ms = getMs(val)
  return ms > 0 && nowMs - ms < 180_000
}

function formatOnlineSince(onlineSinceRaw: RawUser['onlineSince'], nowMs = Date.now()): string {
  const ms = getMs(onlineSinceRaw)
  if (!ms) return 'online'
  const mins = Math.floor((nowMs - ms) / 60_000)
  if (mins < 1) return 'online just now'
  if (mins < 60) return `online ${mins}m`
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  return rem > 0 ? `online ${hrs}h ${rem}m` : `online ${hrs}h`
}

function formatLastSeen(val: RawUser['lastSeen'], nowMs = Date.now()): string {
  const ms = getMs(val)
  if (!ms) return 'Never'
  const diff = Math.floor((nowMs - ms) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(ms).toLocaleDateString()
}

function fmtDate(val: FirestoreTimestamp | string | null | undefined): string {
  if (!val) return '--'
  const ms = typeof val === 'object' && 'seconds' in val
    ? val.seconds * 1000
    : typeof val === 'string' ? new Date(val).getTime() : 0
  if (!ms) return '--'
  return new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtTime(mins: number): string {
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function buildStudent(docId: string, u: RawUser, p: RawProgress | undefined, nowMs = Date.now()): StudentData {
  const cs = p?.completedStages || {}
  const ts = p?.timeSpent || {}
  const as = p?.assessmentScores || {}
  const da = p?.dailyActivity || {}

  const done = Object.values(cs).filter(s => s.includes(1) && s.includes(2) && s.includes(3)).length
  const totalMin = Object.values(ts).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0)
  const scores = Object.values(as).filter(v => typeof v === 'number')
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  const uid = u.uid || docId

  return {
    uid,
    email: u.email || '',
    name: u.displayName || u.email || '--',
    regNum: u.registrationNumber || '--',
    branch: u.branch || '--',
    year: u.year || '--',
    xp: u.xp || 0,
    level: u.level || 1,
    isOnline: isOnline(u.lastSeen, nowMs),
    lastSeenRaw: u.lastSeen,
    onlineSinceRaw: u.onlineSince,
    totalMinutes: totalMin,
    conceptsDone: done,
    totalConcepts: TOTAL_CONCEPTS,
    completionPct: TOTAL_CONCEPTS > 0 ? Math.round((done / TOTAL_CONCEPTS) * 100) : 0,
    assessmentAvg: avg,
    completedStages: cs,
    timeSpent: ts,
    assessmentScores: as,
    dailyActivity: da,
  }
}

function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
}

function shortDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short' })
}

// CSV download -- all students summary
function downloadCSV(students: StudentData[], dateFilter?: string) {
  const headers = [
    'Name', 'RegNo', 'Email', 'Branch', 'Year', 'XP', 'Level',
    'StudyTime(min)', 'ConceptsDone', 'AvgScore(%)', 'LastSeen', 'OnlineStatus',
    ...(dateFilter ? ['MinutesOnDate'] : []),
  ]
  const rows = students.map(s => [
    s.name,
    s.regNum,
    s.email,
    s.branch,
    s.year,
    s.xp,
    s.level,
    s.totalMinutes,
    s.conceptsDone,
    s.assessmentAvg,
    formatLastSeen(s.lastSeenRaw),
    s.isOnline ? 'Online' : 'Offline',
    ...(dateFilter ? [s.dailyActivity[dateFilter] || 0] : []),
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = dateFilter
    ? `coderplay_report_${dateFilter}.csv`
    : `coderplay_class_report_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// PDF individual report
async function downloadPDF(s: StudentData, mockTests: MockTestResult[], placements: PlacementTestResult[]) {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  let y = 20

  const addLine = (text: string, x = 20, size = 10, bold = false, color: [number, number, number] = [30, 30, 30]) => {
    doc.setFontSize(size)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setTextColor(...color)
    doc.text(text, x, y)
    y += size * 0.5 + 3
  }

  const addSection = (title: string) => {
    y += 4
    doc.setFillColor(250, 220, 50)
    doc.roundedRect(15, y - 5, W - 30, 9, 2, 2, 'F')
    addLine(title, 18, 11, true, [30, 30, 30])
    y += 1
  }

  const addKV = (label: string, value: string, x = 20, xv = 80) => {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 100, 100)
    doc.text(label, x, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 30, 30)
    doc.text(value, xv, y)
    y += 6
  }

  // Header
  doc.setFillColor(30, 30, 30)
  doc.rect(0, 0, W, 36, 'F')
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('CoderPlay AI -- Student Report', 20, 16)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(200, 200, 200)
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, 20, 26)
  y = 48

  addSection('Student Information')
  addKV('Name:', s.name)
  addKV('Email:', s.email)
  addKV('Reg No.:', s.regNum)
  addKV('Branch:', s.branch)
  addKV('Year:', s.year)
  addKV('Level:', `${s.level}`)
  addKV('XP:', s.xp.toLocaleString())

  addSection('Learning Stats')
  addKV('Study Time:', fmtTime(s.totalMinutes))
  addKV('Concepts Done:', `${s.conceptsDone} / ${s.totalConcepts}`)
  addKV('Completion:', `${s.completionPct}%`)
  addKV('Avg Assessment:', `${s.assessmentAvg}%`)

  addSection('Language Progress')
  LANGUAGES.forEach(lang => {
    const concepts = CONCEPTS[lang.id] || []
    const done = concepts.filter(c => {
      const st = s.completedStages?.[c.id] || []
      return st.includes(1) && st.includes(2) && st.includes(3)
    }).length
    const pct = concepts.length > 0 ? Math.round((done / concepts.length) * 100) : 0
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    doc.text(`${lang.title}:`, 20, y)
    doc.text(`${done}/${concepts.length} (${pct}%)`, 80, y)
    // Bar
    doc.setFillColor(230, 230, 230)
    doc.roundedRect(110, y - 4, 60, 4, 1, 1, 'F')
    if (pct > 0) {
      doc.setFillColor(234, 179, 8)
      doc.roundedRect(110, y - 4, 60 * pct / 100, 4, 1, 1, 'F')
    }
    y += 7
    if (y > 270) { doc.addPage(); y = 20 }
  })

  if (mockTests.length > 0) {
    if (y > 240) { doc.addPage(); y = 20 }
    addSection('Mock Test Results')
    mockTests.forEach(m => {
      const lang = LANGUAGES.find(l => l.id === m.languageId)?.title || m.languageId
      addKV(`${lang}:`, `${m.score}/${m.totalMarks} -- ${m.passed ? 'PASS' : 'FAIL'} (${fmtDate(m.completedAt)})`)
      if (y > 270) { doc.addPage(); y = 20 }
    })
  }

  if (placements.length > 0) {
    if (y > 240) { doc.addPage(); y = 20 }
    addSection('Placement Test Submissions')
    placements.forEach(p => {
      addKV(`Test ${p.testId}:`, `${p.score}/${p.totalMarks} (${fmtDate(p.submittedAt)})`)
      if (y > 270) { doc.addPage(); y = 20 }
    })
  }

  doc.save(`${s.regNum}_${s.name.replace(/\s+/g, '_')}_report.pdf`)
}

// ---------------------------------------------------------------------------
// Drawer content
// ---------------------------------------------------------------------------

function StudentDrawer({
  student,
  onClose,
}: {
  student: StudentData
  onClose: () => void
}) {
  const s = student
  const [mockTests, setMockTests] = useState<MockTestResult[]>([])
  const [placements, setPlacements] = useState<PlacementTestResult[]>([])
  const [aptitude, setAptitude] = useState<AptitudeResult[]>([])
  const [finalExams, setFinalExams] = useState<FinalExamResult[]>([])
  const [testTitles, setTestTitles] = useState<Record<string, string>>({})
  const [loadingExtras, setLoadingExtras] = useState(true)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [liveProgress, setLiveProgress] = useState<RawProgress | undefined>(undefined)

  // Real-time listener for this student's progress document
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'progress', s.uid), (snap) => {
      if (snap.exists()) setLiveProgress(snap.data() as RawProgress)
    })
    return unsub
  }, [s.uid])

  // Use live progress if available, otherwise fall back to the snapshot data
  const effectiveStages = liveProgress?.completedStages ?? s.completedStages

  useEffect(() => {
    setLoadingExtras(true)
    const uid = s.uid
    // Fetch final exam results for all languages
    const finalExamPromises = LANGUAGES.map(lang =>
      getDoc(doc(db, 'finalExamResults', `${uid}_${lang.id}`))
        .then(snap => snap.exists() ? { languageId: lang.id, ...snap.data() } as FinalExamResult : null)
        .catch(() => null)
    )
    Promise.all([
      getDocs(query(collection(db, 'mockTestResults'), where('uid', '==', uid))),
      getDocs(query(collection(db, 'placementSubmissions'), where('uid', '==', uid))),
      getDocs(query(collection(db, 'aptitudeResults'), where('uid', '==', uid))),
      getDocs(collection(db, 'placementTests')),
      Promise.all(finalExamPromises),
    ]).then(([mSnap, pSnap, aSnap, tSnap, examResults]) => {
      setMockTests(mSnap.docs.map(d => ({ id: d.id, ...d.data() } as MockTestResult)))
      setPlacements(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as PlacementTestResult)))
      setAptitude(aSnap.docs.map(d => ({ id: d.id, ...d.data() } as AptitudeResult)))
      const titles: Record<string, string> = {}
      tSnap.docs.forEach(d => { titles[d.id] = (d.data() as { title?: string }).title || d.id })
      setTestTitles(titles)
      setFinalExams(examResults.filter((r): r is FinalExamResult => r !== null))
    }).catch(() => {
      // Collections may not exist yet -- ignore
    }).finally(() => setLoadingExtras(false))
  }, [s.uid])

  // Weekly activity chart data
  const last7 = getLast7Days()
  const weekData = last7.map(date => ({
    day: shortDay(date),
    minutes: s.dailyActivity[date] || 0,
  }))

  // Language progress chart -- uses live progress when available
  const langData = LANGUAGES.map(lang => {
    const concepts = CONCEPTS[lang.id] || []
    const done = concepts.filter(c => {
      const st = effectiveStages?.[c.id] || []
      return st.includes(1) && st.includes(2) && st.includes(3)
    }).length
    return {
      name: lang.title.length > 8 ? lang.title.slice(0, 8) : lang.title,
      pct: concepts.length > 0 ? Math.round((done / concepts.length) * 100) : 0,
      done,
      total: concepts.length,
    }
  })

  // Top 5 assessment scores
  const topScores = Object.entries(s.assessmentScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([conceptId, score]) => {
      const concept = ALL_CONCEPTS.find(c => c.id === conceptId)
      return {
        name: concept ? (concept.title.length > 12 ? concept.title.slice(0, 12) + '...' : concept.title) : conceptId,
        score,
      }
    })

  // Aptitude by subject
  const aptBySubject = APTITUDE_SUBJECTS.map(subj => {
    const results = aptitude.filter(a => a.subjectId === subj.id)
    const avg = results.length
      ? Math.round(results.reduce((acc, r) => acc + (r.score / r.totalQuestions) * 100, 0) / results.length)
      : 0
    return { title: subj.title, avg, count: results.length }
  })

  const initials = s.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const handlePDF = async () => {
    setPdfLoading(true)
    try {
      await downloadPDF(s, mockTests, placements)
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-96 z-50 bg-white shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 px-6 py-5 flex-shrink-0">
          <div className="flex items-start justify-between mb-4">
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              aria-label="Close panel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handlePDF}
              disabled={pdfLoading}
              className="flex items-center gap-2 px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-60 text-black font-bold text-xs rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {pdfLoading ? 'Generating...' : 'Download PDF'}
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-yellow-400 flex items-center justify-center font-black text-xl text-black flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-white font-black text-lg leading-tight truncate">{s.name}</h2>
                {s.isOnline && (
                  <span className="flex items-center gap-1 bg-green-500/20 border border-green-500/40 rounded-full px-2 py-0.5 text-xs text-green-300 font-semibold flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    {formatOnlineSince(s.onlineSinceRaw)}
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-xs truncate mt-0.5">{s.email}</p>
              <p className="text-gray-500 text-xs mt-0.5 font-mono">{s.regNum}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {([
              { label: s.branch,          Icon: School   as LucideIcon },
              { label: `Year ${s.year}`,  Icon: Calendar as LucideIcon },
              { label: `Level ${s.level}`,Icon: Star     as LucideIcon },
            ] as { label: string; Icon: LucideIcon }[]).map(chip => (
              <span key={chip.label} className="flex items-center gap-1 px-2.5 py-1 bg-white/10 rounded-lg text-xs text-gray-200 font-medium">
                <chip.Icon className="w-3 h-3" /> {chip.label}
              </span>
            ))}
          </div>
        </div>

        {/* Stat chips */}
        <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 border-b border-gray-100">
          {[
            { label: 'XP', value: s.xp.toLocaleString(), color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-100' },
            { label: 'Study Time', value: fmtTime(s.totalMinutes), color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
            { label: 'Avg Score', value: `${s.assessmentAvg}%`, color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
            { label: 'Completion', value: `${s.completionPct}%`, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100' },
          ].map(chip => (
            <div key={chip.label} className={`rounded-xl p-3 border ${chip.bg}`}>
              <div className={`text-xl font-black ${chip.color}`}>{chip.value}</div>
              <div className="text-xs text-gray-500 font-medium mt-0.5">{chip.label}</div>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 p-4 space-y-6">

          {/* Language Progress */}
          <section>
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Language Progress</h3>
            <div className="space-y-2.5">
              {LANGUAGES.map(lang => {
                const concepts = CONCEPTS[lang.id] || []
                const done = concepts.filter(c => {
                  const st = effectiveStages?.[c.id] || []
                  return st.includes(1) && st.includes(2) && st.includes(3)
                }).length
                const pct = concepts.length > 0 ? Math.round((done / concepts.length) * 100) : 0
                return (
                  <div key={lang.id}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold text-gray-700">{lang.title}</span>
                      <span className="text-xs text-gray-400">{done}/{concepts.length} ({pct}%)</span>
                    </div>
                    <ProgressBar pct={pct} color="yellow" />
                  </div>
                )
              })}
            </div>
          </section>

          {/* Language % bar chart */}
          <section>
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Language Completion Chart</h3>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={langData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 11 }}
                  formatter={(v) => [`${v as number}%`, "Complete"]}
                />
                <Bar dataKey="pct" fill="#EAB308" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </section>

          {/* Weekly Activity */}
          <section>
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Weekly Activity</h3>
            <ResponsiveContainer width="100%" height={110}>
              <AreaChart data={weekData} margin={{ top: 5, right: 0, left: -30, bottom: 0 }}>
                <defs>
                  <linearGradient id={`weekGrad_${s.uid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 11 }}
                  formatter={(v) => [`${v as number} min`, "Study"]}
                />
                <Area type="monotone" dataKey="minutes" stroke="#3B82F6" strokeWidth={2} fill={`url(#weekGrad_${s.uid})`} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </section>

          {/* Assessment Scores */}
          {topScores.length > 0 && (
            <section>
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Top Assessment Scores</h3>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={topScores} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#6B7280' }} tickLine={false} axisLine={false} width={72} />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 11 }}
                    formatter={(v) => [`${v as number}%`, "Score"]}
                  />
                  <Bar dataKey="score" fill="#10B981" radius={[0, 4, 4, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </section>
          )}

          {/* Aptitude */}
          {!loadingExtras && (
            <section>
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Aptitude Progress</h3>
              <div className="space-y-2.5">
                {aptBySubject.map(subj => (
                  <div key={subj.title}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold text-gray-700 truncate max-w-48">{subj.title}</span>
                      <span className="text-xs text-gray-400">{subj.count > 0 ? `${subj.avg}%` : 'Not started'}</span>
                    </div>
                    <ProgressBar pct={subj.avg} color="purple" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Final Exam Results */}
          {!loadingExtras && (
            <section>
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Final Exam Results</h3>
              {finalExams.length > 0 ? (
                <div className="space-y-2">
                  {finalExams.map(exam => {
                    const lang = LANGUAGES.find(l => l.id === exam.languageId)
                    const tierColor: Record<string, string> = {
                      Elite:   'bg-purple-100 text-purple-800 border-purple-300',
                      Diamond: 'bg-cyan-100 text-cyan-800 border-cyan-300',
                      Gold:    'bg-yellow-100 text-yellow-800 border-yellow-300',
                      Silver:  'bg-gray-100 text-gray-700 border-gray-300',
                      Bronze:  'bg-amber-100 text-amber-800 border-amber-300',
                    }
                    const tc = tierColor[exam.tier] || 'bg-red-100 text-red-700 border-red-300'
                    return (
                      <div key={exam.languageId} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xs font-bold text-gray-800">{lang?.title || exam.languageId}</span>
                          {exam.tier && exam.tier !== 'Failed' ? (
                            <span className={`px-2.5 py-0.5 rounded-full border text-xs font-black ${tc}`}>{exam.tier} Tier</span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full border border-red-200 bg-red-50 text-xs font-black text-red-700">Failed</span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center mb-2">
                          <div className="bg-white rounded-lg p-2 border border-gray-100">
                            <div className="text-sm font-black text-blue-700">{exam.internalMarks ?? 0}/25</div>
                            <div className="text-xs text-gray-400">Internal</div>
                          </div>
                          <div className="bg-white rounded-lg p-2 border border-gray-100">
                            <div className="text-sm font-black text-indigo-700">{exam.externalMarks ?? 0}/75</div>
                            <div className="text-xs text-gray-400">External</div>
                          </div>
                          <div className={`rounded-lg p-2 border ${exam.passed ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                            <div className={`text-sm font-black ${exam.passed ? 'text-green-700' : 'text-red-600'}`}>{exam.combinedScore ?? 0}/100</div>
                            <div className="text-xs text-gray-400">Combined</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">{fmtDate(exam.submittedAt)}</span>
                          {exam.passed && (
                            <a
                              href={`/language/${exam.languageId}/certificate`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-yellow-700 hover:text-yellow-600 underline"
                            >
                              View Certificate
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No final exams attempted yet</p>
              )}
            </section>
          )}

          {/* Mock Tests */}
          {!loadingExtras && (
            <section>
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Mock Tests</h3>
              {mockTests.length > 0 ? (
                <div className="rounded-xl overflow-hidden border border-gray-100">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left text-gray-500 font-bold">Language</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-bold">Score</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-bold">Result</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-bold">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {mockTests.map(m => (
                        <tr key={m.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-700">
                            {LANGUAGES.find(l => l.id === m.languageId)?.title || m.languageId}
                          </td>
                          <td className="px-3 py-2 text-gray-600">{m.score}/{m.totalMarks}</td>
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded-full font-bold text-xs ${m.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {m.passed ? 'Pass' : 'Fail'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-400">{fmtDate(m.completedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No mock tests taken yet</p>
              )}
            </section>
          )}

          {/* Placement Tests */}
          {!loadingExtras && (
            <section className="pb-6">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Placement Tests</h3>
              {placements.length > 0 ? (
                <div className="rounded-xl overflow-hidden border border-gray-100">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left text-gray-500 font-bold">Test</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-bold">Score</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-bold">%</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-bold">Grade</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-bold">Result</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-bold">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {placements.map(p => {
                        const pct = p.evaluation?.percentage ?? (p.totalMarks ? Math.round((p.score / p.totalMarks) * 100) : 0)
                        const grade = p.evaluation?.grade ?? '--'
                        const passed = p.evaluation?.passed ?? (pct >= 60)
                        return (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium text-gray-700">{testTitles[p.testId] || p.testId}</td>
                            <td className="px-3 py-2 text-gray-600">{p.score}/{p.totalMarks}</td>
                            <td className="px-3 py-2 text-gray-600">{pct}%</td>
                            <td className="px-3 py-2 font-bold text-gray-700">{grade}</td>
                            <td className="px-3 py-2">
                              <span className={`px-1.5 py-0.5 rounded-full font-bold text-xs ${passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {passed ? 'Pass' : 'Fail'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-400">{fmtDate(p.submittedAt)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No placement tests submitted yet</p>
              )}
            </section>
          )}

          {loadingExtras && (
            <div className="flex items-center gap-2 text-gray-400 text-xs py-4">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-yellow-400 rounded-full animate-spin" />
              Loading test history...
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Student card (used inside year groups)
// ---------------------------------------------------------------------------

function StudentCard({
  s,
  selectedUid,
  onSelectStudent,
  onDelete,
  deletingUid,
}: {
  s: StudentData
  selectedUid: string | null
  onSelectStudent: (s: StudentData) => void
  onDelete: (uid: string) => void
  deletingUid: string | null
}) {
  return (
    <div className="relative group">
      <button
        type="button"
        onClick={() => onSelectStudent(s)}
        className={`w-full text-left rounded-xl p-3 border transition-all hover:shadow-md ${
          selectedUid === s.uid
            ? 'border-yellow-400 bg-yellow-50 shadow-md'
            : 'border-gray-100 bg-white hover:border-gray-200'
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-black text-gray-600 text-xs flex-shrink-0">
              {s.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-gray-900 truncate">{s.name}</div>
              <div className="text-xs text-gray-400 font-mono truncate">{s.regNum}</div>
            </div>
          </div>
          {s.isOnline && (
            <span className="flex items-center gap-1 bg-green-50 border border-green-200 rounded-full px-1.5 py-0.5 text-xs text-green-700 font-semibold flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {formatOnlineSince(s.onlineSinceRaw)}
            </span>
          )}
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">
          {s.xp.toLocaleString()} XP
        </span>
        <div className="mt-2">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Done</span>
            <span>{s.completionPct}%</span>
          </div>
          <ProgressBar pct={s.completionPct} color="yellow" />
        </div>
      </button>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onDelete(s.uid) }}
        disabled={deletingUid === s.uid}
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
        title="Delete student"
      >
        {deletingUid === s.uid
          ? <span className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
          : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        }
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Year sub-accordion inside a branch
// ---------------------------------------------------------------------------

function YearGroup({
  year,
  students,
  onSelectStudent,
  selectedUid,
  onDelete,
  deletingUid,
}: {
  year: string
  students: StudentData[]
  onSelectStudent: (s: StudentData) => void
  selectedUid: string | null
  onDelete: (uid: string) => void
  deletingUid: string | null
}) {
  const [open, setOpen] = useState(false)
  const onlineCount = students.filter(s => s.isOnline).length

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-yellow-100 border border-yellow-200 flex items-center justify-center font-black text-yellow-700 text-xs">
            Y{year}
          </div>
          <div className="text-left">
            <div className="text-sm font-bold text-gray-800">Year {year}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-400">{students.length} students</span>
              {onlineCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  {onlineCount} online
                </span>
              )}
            </div>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-white">
          {students.map(s => (
            <StudentCard
              key={s.uid}
              s={s}
              selectedUid={selectedUid}
              onSelectStudent={onSelectStudent}
              onDelete={onDelete}
              deletingUid={deletingUid}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Branch accordion card
// ---------------------------------------------------------------------------

const YEAR_ORDER = ['1', '2', '3', '4']

function BranchCard({
  branch,
  students,
  onSelectStudent,
  selectedUid,
  onDelete,
  deletingUid,
}: {
  branch: string
  students: StudentData[]
  onSelectStudent: (s: StudentData) => void
  selectedUid: string | null
  onDelete: (uid: string) => void
  deletingUid: string | null
}) {
  const [expanded, setExpanded] = useState(false)

  const avgXP = students.length
    ? Math.round(students.reduce((a, s) => a + s.xp, 0) / students.length)
    : 0
  const avgCompletion = students.length
    ? Math.round(students.reduce((a, s) => a + s.completionPct, 0) / students.length)
    : 0
  const onlineCount = students.filter(s => s.isOnline).length

  // Group students by year; students without a year go into '--'
  const yearMap: Record<string, StudentData[]> = {}
  students.forEach(s => {
    const y = s.year && s.year !== '--' ? s.year : '--'
    if (!yearMap[y]) yearMap[y] = []
    yearMap[y].push(s)
  })
  // Sort: 1, 2, 3, 4, then anything else
  const years = [
    ...YEAR_ORDER.filter(y => yearMap[y]),
    ...Object.keys(yearMap).filter(y => !YEAR_ORDER.includes(y)).sort(),
  ]

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      {/* Branch header (always visible) */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-yellow-50 border border-yellow-100 flex items-center justify-center font-black text-yellow-700 text-sm">
            {branch.slice(0, 2).toUpperCase()}
          </div>
          <div className="text-left">
            <div className="font-bold text-gray-900">{branch}</div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-gray-400">{students.length} students</span>
              {onlineCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  {onlineCount} online
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-black text-yellow-600">{avgXP.toLocaleString()} XP</div>
            <div className="text-xs text-gray-400">avg XP</div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-sm font-black text-blue-600">{avgCompletion}%</div>
            <div className="text-xs text-gray-400">avg done</div>
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded: year sub-groups */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-3">
          {years.map(year => (
            <YearGroup
              key={year}
              year={year}
              students={yearMap[year]}
              onSelectStudent={onSelectStudent}
              selectedUid={selectedUid}
              onDelete={onDelete}
              deletingUid={deletingUid}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminStudentsPage() {
  const usersRef = useRef<Record<string, RawUser>>({})
  const progressRef = useRef<Record<string, RawProgress>>({})

  const [students, setStudents] = useState<StudentData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null)
  const [csvDate, setCsvDate] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [deletingUid, setDeletingUid] = useState<string | null>(null)

  const rebuild = useCallback((nowMs?: number) => {
    const ts = nowMs ?? Date.now()
    const rows = Object.entries(usersRef.current).map(([docId, u]) => {
      const p = progressRef.current[u.uid || docId] || progressRef.current[docId]
      return buildStudent(docId, u, p, ts)
    })
    setStudents(rows)
  }, [])

  const handleDeleteStudent = useCallback(async (uid: string) => {
    if (!window.confirm('Permanently delete this student and ALL their data including Firebase Auth account? This cannot be undone.')) return
    setDeletingUid(uid)
    try {
      // Delete core Firestore documents (client-side)
      await Promise.allSettled([
        deleteDoc(doc(db, 'users', uid)),
        deleteDoc(doc(db, 'progress', uid)),
        deleteDoc(doc(db, 'streaks', uid)),
        deleteDoc(doc(db, 'achievements', uid)),
      ])

      // Delete Firebase Auth user + sub-collections via backend (admin SDK)
      try {
        await fetch(`${getBackendUrl()}/api/admin/delete-user/${uid}`, {
          method: 'DELETE',
          headers: { 'X-Admin-Code': 'admin1115' },
        })
      } catch {
        // Non-fatal: backend may not have firebase-admin configured yet
        console.warn('[admin] Backend Auth deletion unavailable -- only Firestore docs deleted')
      }

      delete usersRef.current[uid]
      delete progressRef.current[uid]
      rebuild()
      setSelectedStudent(null)
    } catch {
      alert('Failed to delete student. Please try again.')
    } finally {
      setDeletingUid(null)
    }
  }, [rebuild])

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), snap => {
      snap.forEach(doc => { usersRef.current[doc.id] = doc.data() as RawUser })
      rebuild()
    })

    const unsubProgress = onSnapshot(collection(db, 'progress'), snap => {
      snap.forEach(doc => { progressRef.current[doc.id] = doc.data() as RawProgress })
      rebuild()
      setLoading(false)
    })

    const fallback = setTimeout(() => setLoading(false), 4000)

    return () => {
      unsubUsers()
      unsubProgress()
      clearTimeout(fallback)
    }
  }, [rebuild])

  // Refresh isOnline every 10s for near-immediate offline detection
  useEffect(() => {
    const t = setInterval(() => rebuild(Date.now()), 10_000)
    return () => clearInterval(t)
  }, [rebuild])

  const filtered = students.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.regNum.toLowerCase().includes(search.toLowerCase())
  )

  // Group by branch
  const branchMap: Record<string, StudentData[]> = {}
  filtered.forEach(s => {
    const b = s.branch || '--'
    if (!branchMap[b]) branchMap[b] = []
    branchMap[b].push(s)
  })
  const branches = Object.keys(branchMap).sort()

  const totalOnline = students.filter(s => s.isOnline).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-gray-500 text-sm">Loading students...</span>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Students</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {students.length} registered &middot;
            <span className="text-green-600 font-semibold"> {totalOnline} online now</span>
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search name / email / reg..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 w-64 bg-white"
            />
          </div>

          {/* Calendar date picker for per-day CSV */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDatePicker(v => !v)}
              className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors bg-white"
              title="Pick a date for per-day report"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {csvDate ? csvDate : 'By Date'}
            </button>
            {showDatePicker && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-64">
                <p className="text-xs font-bold text-gray-500 mb-2">Select date for CSV export</p>
                <input
                  type="date"
                  value={csvDate}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => setCsvDate(e.target.value)}
                  title="Select date for CSV report"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => { setCsvDate(''); setShowDatePicker(false) }}
                    className="flex-1 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"
                  >Clear</button>
                  <button
                    type="button"
                    onClick={() => { downloadCSV(students, csvDate || undefined); setShowDatePicker(false) }}
                    disabled={!csvDate}
                    className="flex-1 py-1.5 text-xs bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-black font-bold rounded-lg"
                  >Download</button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => downloadCSV(students)}
            className="flex items-center gap-2 px-4 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Class Report
          </button>
        </div>
      </div>

      {/* Branch accordion cards */}
      {branches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-sm">No students found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {branches.map(branch => (
            <BranchCard
              key={branch}
              branch={branch}
              students={branchMap[branch]}
              onSelectStudent={setSelectedStudent}
              selectedUid={selectedStudent?.uid || null}
              onDelete={handleDeleteStudent}
              deletingUid={deletingUid}
            />
          ))}
        </div>
      )}

      {/* Student detail drawer */}
      {selectedStudent && (
        <StudentDrawer
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  )
}
