'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, BarChart2, Timer, HelpCircle, Calendar, Lock, ClipboardList, Monitor } from 'lucide-react'
import { collection, getDocs, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { useAuth } from '@/hooks/useAuth'
import { useProctoring } from '@/hooks/useProctoring'
import { PageTransition } from '@/components/shared/PageTransition'
import { getBackendUrl } from '@/lib/backendUrl'

// --- Types --------------------------------------------------------------------

interface MCQOption {
  id: string
  text: string
}

interface PlacementQuestion {
  id: string
  type: 'mcq' | 'coding'
  question: string
  year?: number
  company?: string
  sourceLabel?: string
  difficulty?: string
  topic?: string
  options?: MCQOption[]
  correctAnswer?: string
  explanation?: string
  marks: number
  inputFormat?: string
  outputFormat?: string
  examples?: Array<{ input: string; output: string }>
  constraints?: string
  timeLimit?: number
}

interface PlacementSection {
  name: string
  marks: number
  questions: PlacementQuestion[]
}

type StoredDate = string | number | Date | { seconds?: number; toDate?: () => Date; toMillis?: () => number } | null | undefined

interface PlacementTest {
  id: string
  title: string
  company?: string
  prompt: string
  totalMarks: number
  duration: number
  scheduledAt: string | null
  activeFrom?: string | null
  activeTo?: string | null
  createdAt: StoredDate
  status: 'ready' | 'active' | 'closed' | 'generating'
  sections: PlacementSection[]
  yearsIncluded?: number[]
}

interface EvalQuestion {
  id: string
  question: string
  type: 'mcq' | 'coding'
  options?: MCQOption[]
  studentAnswer?: string | null
  studentCode?: string
  correctAnswer?: string
  isCorrect?: boolean
  marks: number
  marksEarned: number
  explanation?: string
  feedback?: string
  correctApproach?: string
  year?: number
  company?: string
  sourceLabel?: string
  difficulty?: string
  topic?: string
  examples?: Array<{ input: string; output: string }>
}

interface EvalSection {
  name: string
  score: number
  maxScore: number
  questions: EvalQuestion[]
}

interface Evaluation {
  totalScore: number
  maxScore: number
  percentage: number
  grade: string
  passed: boolean
  sections: EvalSection[]
  aiSummary: string
}

interface PlacementSubmission {
  uid: string
  testId: string
  studentName: string
  regNo: string
  score: number
  totalMarks: number
  timeTaken: number
  submittedAt: unknown
  status: string
  evaluation: Evaluation
}

type Phase = 'list' | 'confirm' | 'running' | 'submitting' | 'result'

// --- Helpers ------------------------------------------------------------------

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function gradeColor(grade: string): string {
  if (grade === 'A+' || grade === 'A') return 'text-green-700'
  if (grade === 'B+' || grade === 'B') return 'text-blue-700'
  if (grade === 'C') return 'text-yellow-700'
  return 'text-red-600'
}

function difficultyBg(d?: string): string {
  if (d === 'Easy') return 'bg-green-100 text-green-700'
  if (d === 'Hard') return 'bg-red-100 text-red-700'
  return 'bg-yellow-100 text-yellow-700'
}

function toMillis(value: StoredDate): number {
  if (!value) return 0
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'string' || typeof value === 'number') {
    const time = new Date(value).getTime()
    return Number.isNaN(time) ? 0 : time
  }
  if (typeof value.toMillis === 'function') return value.toMillis()
  if (typeof value.toDate === 'function') return value.toDate().getTime()
  if (typeof value.seconds === 'number') return value.seconds * 1000
  return 0
}

function questionSourceLabel(q: { company?: string; year?: number; sourceLabel?: string }): string {
  if (q.sourceLabel) return q.sourceLabel
  if (q.company && q.year) return `${q.company} ${q.year} Question`
  if (q.year) return `${q.year} Question`
  if (q.company) return `${q.company} Question`
  return ''
}

// Flatten questions from all sections into a flat array with section index
function flattenQuestions(sections: PlacementSection[]): Array<{ q: PlacementQuestion; sectionIdx: number; sectionName: string; localIdx: number }> {
  const flat: Array<{ q: PlacementQuestion; sectionIdx: number; sectionName: string; localIdx: number }> = []
  sections.forEach((sec, si) => {
    sec.questions.forEach((q, qi) => {
      flat.push({ q, sectionIdx: si, sectionName: sec.name, localIdx: qi })
    })
  })
  return flat
}

// --- Toast component ----------------------------------------------------------

function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500)
    return () => clearTimeout(t)
  }, [onDismiss])
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-orange-500 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-bold flex items-center gap-2"
    >
      <AlertTriangle className="w-4 h-4" /> {message}
    </motion.div>
  )
}

// --- Submit Confirm Modal -----------------------------------------------------

function SubmitModal({ onConfirm, onCancel, answered, total }: {
  onConfirm: () => void
  onCancel: () => void
  answered: number
  total: number
}) {
  const unanswered = total - answered
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full"
      >
        <h3 className="text-lg font-black text-gray-900 mb-2">Submit Exam?</h3>
        <p className="text-sm text-gray-500 mb-4">
          You have answered <span className="font-bold text-gray-800">{answered}/{total}</span> questions.
          {unanswered > 0 && (
            <span className="text-orange-600 font-semibold"> {unanswered} question{unanswered > 1 ? 's' : ''} left unanswered.</span>
          )}
        </p>
        <p className="text-xs text-gray-400 mb-5">Once submitted, you cannot modify your answers. AI will evaluate your responses.</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50"
          >
            Go Back
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-300 rounded-xl text-sm font-black text-black"
          >
            Submit Exam
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// --- Main component -----------------------------------------------------------

export default function PlacementTestsPage() {
  const { user, profile } = useAuth()

  // Phase management
  const [phase, setPhase] = useState<Phase>('list')
  const [tests, setTests] = useState<PlacementTest[]>([])
  const [submissions, setSubmissions] = useState<Record<string, PlacementSubmission>>({})
  const [loading, setLoading] = useState(true)

  // Exam state
  const [activeTest, setActiveTest] = useState<PlacementTest | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [codingAnswers, setCodingAnswers] = useState<Record<string, string>>({})
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set())
  const [currentQIdx, setCurrentQIdx] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [submittingStep, setSubmittingStep] = useState(0)
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]))
  const [toast, setToast] = useState<string | null>(null)
  const [navOpen, setNavOpen] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const reportRef = useRef<HTMLDivElement>(null)
  const submitRef = useRef<(() => void) | null>(null)

  const proctoring = useProctoring({
    enabled: phase === 'running',
    onAutoSubmit: () => submitRef.current?.(),
    requireFullscreen: true,
  })

  // -- Fetch data -------------------------------------------------------------

  useEffect(() => {
    async function fetchData() {
      try {
        const testsSnap = await getDocs(collection(db, 'placementTests'))
        const t: PlacementTest[] = []
        testsSnap.forEach(d => {
          const data = d.data() as Omit<PlacementTest, 'id'>
          if (data.status === 'ready' || data.status === 'active') {
            t.push({ id: d.id, ...data })
          }
        })
        t.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
        setTests(t)

        if (user) {
          const subs: Record<string, PlacementSubmission> = {}
          for (const test of t) {
            const subRef = doc(db, 'placementSubmissions', `${user.uid}_${test.id}`)
            const subSnap = await getDoc(subRef)
            if (subSnap.exists()) {
              subs[test.id] = subSnap.data() as PlacementSubmission
            }
          }
          setSubmissions(subs)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user])

  // -- Timer ------------------------------------------------------------------

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Wall-clock-driven timer (handles tab unfocus drift)
  const examEndAtRef = useRef<number>(0)
  const startTimer = useCallback((durationMinutes: number) => {
    stopTimer()
    const now = Date.now()
    startTimeRef.current = now
    examEndAtRef.current = now + durationMinutes * 60 * 1000
    setTimeLeft(durationMinutes * 60)
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((examEndAtRef.current - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining <= 0) {
        stopTimer()
        setShowSubmitModal(false)
        submitRef.current?.()
      }
    }, 500)
  }, [stopTimer])

  useEffect(() => {
    return () => stopTimer()
  }, [stopTimer])

  // Auto-save answers to sessionStorage every 5s during active exam (recovery on crash/refresh)
  useEffect(() => {
    if (phase !== 'running' || !activeTest || !user) return
    const id = setInterval(() => {
      try {
        sessionStorage.setItem(
          `placement_draft_${user.uid}_${activeTest.id}`,
          JSON.stringify({ answers, codingAnswers, currentQIdx, ts: Date.now() })
        )
      } catch { /* quota -- ignore */ }
    }, 5000)
    return () => clearInterval(id)
  }, [phase, activeTest, user, answers, codingAnswers, currentQIdx])

  // -- Exam actions -----------------------------------------------------------

  const handleStartExam = (test: PlacementTest) => {
    if (submissions[test.id]) return
    setActiveTest(test)
    setPhase('confirm')
    setAnswers({})
    setCodingAnswers({})
    setMarkedForReview(new Set())
    setCurrentQIdx(0)
    setEvaluation(null)

    if (user) {
      try {
        const raw = sessionStorage.getItem(`placement_draft_${user.uid}_${test.id}`)
        if (raw) {
          const draft = JSON.parse(raw) as {
            answers?: Record<string, string>
            codingAnswers?: Record<string, string>
            currentQIdx?: number
          }
          if (draft.answers && typeof draft.answers === 'object') setAnswers(draft.answers)
          if (draft.codingAnswers && typeof draft.codingAnswers === 'object') setCodingAnswers(draft.codingAnswers)
          if (typeof draft.currentQIdx === 'number') setCurrentQIdx(Math.max(0, draft.currentQIdx))
          setToast('Restored your saved answers from this tab.')
        }
      } catch { /* corrupt draft -- ignore */ }
    }
  }

  const handleBeginExam = async () => {
    if (!activeTest) return
    await proctoring.enterFullscreen()
    setPhase('running')
    startTimer(activeTest.duration)
  }

  const handleAnswerMCQ = (questionId: string, optionId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }))
  }

  const handleAnswerCoding = (questionId: string, code: string) => {
    setCodingAnswers(prev => ({ ...prev, [questionId]: code }))
  }

  const toggleMarkForReview = (questionId: string) => {
    setMarkedForReview(prev => {
      const next = new Set(prev)
      if (next.has(questionId)) next.delete(questionId)
      else next.add(questionId)
      return next
    })
  }


  // Double-submission guard -- exam can only submit once
  const submittingRef = useRef(false)

  // Keep submitRef current so auto-submit timer always calls the latest version
  const handleSubmitExam = useCallback(async () => {
    if (!activeTest || !user) return
    if (submittingRef.current) return
    submittingRef.current = true

    stopTimer()
    setShowSubmitModal(false)
    proctoring.exitFullscreen()
    setPhase('submitting')
    setSubmittingStep(0)

    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000)

    // Save answers to sessionStorage as a recovery copy in case server fails
    try {
      sessionStorage.setItem(
        `placement_recovery_${user.uid}_${activeTest.id}`,
        JSON.stringify({ answers, codingAnswers, timeTaken, ts: Date.now() })
      )
    } catch { /* quota -- ignore */ }

    setSubmittingStep(1)
    await new Promise(r => setTimeout(r, 600))

    try {
      setSubmittingStep(2)

      // Retry up to 3 times for transient network errors
      let lastErr: Error | null = null
      let data: { success: boolean; evaluation?: Evaluation; error?: string } | null = null
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 90_000)
          const res = await fetch(`${getBackendUrl()}/api/placement/evaluate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid: user.uid,
              testId: activeTest.id,
              sections: activeTest.sections,
              answers,
              codingAnswers,
              timeTaken,
              studentName: profile?.displayName || user.displayName || 'Student',
              regNo: profile?.registrationNumber || '',
            }),
            signal: controller.signal,
          })
          clearTimeout(timeoutId)
          data = await res.json()
          if (!res.ok) throw new Error(data?.error || `Server error ${res.status}`)
          if (!data?.success || !data.evaluation) throw new Error(data?.error || 'Evaluation failed')
          lastErr = null
          break
        } catch (e) {
          lastErr = e as Error
          if (attempt < 3) await new Promise(r => setTimeout(r, 1500 * attempt))
        }
      }
      if (lastErr || !data?.evaluation) throw lastErr || new Error('Evaluation failed')

      setSubmittingStep(3)
      await new Promise(r => setTimeout(r, 500))

      const submissionData: PlacementSubmission = {
        uid: user.uid,
        testId: activeTest.id,
        studentName: profile?.displayName || user.displayName || 'Student',
        regNo: profile?.registrationNumber || '',
        score: data.evaluation.totalScore,
        totalMarks: data.evaluation.maxScore,
        timeTaken,
        submittedAt: serverTimestamp(),
        status: 'evaluated',
        evaluation: data.evaluation,
      }

      await setDoc(
        doc(db, 'placementSubmissions', `${user.uid}_${activeTest.id}`),
        submissionData
      )

      // Clear recovery copy on success
      try { sessionStorage.removeItem(`placement_recovery_${user.uid}_${activeTest.id}`) } catch {}

      setEvaluation(data.evaluation)
      setSubmissions(prev => ({ ...prev, [activeTest.id]: submissionData }))
      setSubmittingStep(4)
      await new Promise(r => setTimeout(r, 800))
      setPhase('result')
    } catch (err) {
      console.error('Evaluation error:', err)
      submittingRef.current = false  // allow retry
      setToast('Evaluation failed. Your answers are saved -- try submitting again or contact your instructor.')
      setPhase('running')
    }
  }, [activeTest, user, answers, codingAnswers, profile, stopTimer, proctoring])

  useEffect(() => {
    submitRef.current = handleSubmitExam
  }, [handleSubmitExam])

  // -- PDF download -----------------------------------------------------------

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return
    const { downloadElementAsPdf } = await import('@/lib/pdf/downloadElementAsPdf')
    await downloadElementAsPdf({
      element: reportRef.current,
      filename: `${activeTest?.title || 'placement-test'}-report.pdf`,
      orientation: 'portrait',
      scale: 1.5,
    })
  }

  // -- Derived data -----------------------------------------------------------

  const flatQuestions = activeTest ? flattenQuestions(activeTest.sections) : []
  const totalQuestions = flatQuestions.length
  const answeredCount = flatQuestions.filter(({ q }) =>
    q.type === 'coding' ? Boolean(codingAnswers[q.id]?.trim()) : Boolean(answers[q.id])
  ).length

  const currentItem = flatQuestions[currentQIdx]

  // -------------------------------------------------------------------------
  // PHASE: loading
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <PageTransition>
        <div className="p-8 flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </PageTransition>
    )
  }

  // -------------------------------------------------------------------------
  // PHASE: list
  // -------------------------------------------------------------------------

  if (phase === 'list') {
    return (
      <PageTransition>
        <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Placement Mock Tests</h1>
            <p className="text-sm text-gray-500 mt-1">AI-generated previous-year style tests for TCS, Infosys, Wipro, and more.</p>
          </div>

          {tests.length === 0 ? (
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-12 text-center">
              <div className="flex justify-center mb-3"><Calendar className="w-10 h-10 text-gray-400" /></div>
              <h3 className="text-lg font-bold text-gray-700 mb-2">No tests scheduled yet</h3>
              <p className="text-sm text-gray-400">Your instructor will schedule placement tests here. Check back later!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tests.map((test, i) => {
                const sub = submissions[test.id]
                const totalQ = test.sections?.reduce((a, s) => a + s.questions.length, 0) || 0
                return (
                  <motion.div
                    key={test.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white border border-gray-100 rounded-2xl p-6 hover:border-yellow-200 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-black text-gray-900">{test.title}</h3>
                          {test.company && (
                            <span className="text-xs font-bold bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                              {test.company}
                            </span>
                          )}
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            test.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {test.status === 'active' ? 'Active' : 'Available'}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-4 text-xs text-gray-400 mb-3">
                          <span className="flex items-center gap-1"><BarChart2 className="w-3 h-3" /> {test.totalMarks} marks</span>
                          <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> {test.duration} min</span>
                          <span className="flex items-center gap-1"><HelpCircle className="w-3 h-3" /> {totalQ} questions</span>
                          {test.scheduledAt && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(test.scheduledAt).toLocaleDateString()}</span>}
                          <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Proctored</span>
                        </div>

                        {(test.activeFrom || test.activeTo) && (
                          <div className="flex flex-wrap gap-3 text-xs mb-3">
                            {test.activeFrom && (
                              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                From: {new Date(test.activeFrom).toLocaleString()}
                              </span>
                            )}
                            {test.activeTo && (
                              <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                                Until: {new Date(test.activeTo).toLocaleString()}
                              </span>
                            )}
                          </div>
                        )}

                        {test.sections && (
                          <div className="flex flex-wrap gap-2">
                            {test.sections.map(sec => (
                              <span key={sec.name} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                {sec.name} ({sec.questions.length}Q, {sec.marks}M)
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 text-right">
                        {sub ? (
                          <div className="space-y-1">
                            <div className={`text-xl font-black ${sub.evaluation?.passed ? 'text-green-600' : 'text-red-500'}`}>
                              {sub.score}/{sub.totalMarks}
                            </div>
                            <div className="text-xs text-gray-400">{sub.evaluation?.percentage?.toFixed(1)}%</div>
                            <div className={`text-xs font-bold ${gradeColor(sub.evaluation?.grade || 'F')}`}>
                              Grade {sub.evaluation?.grade || 'F'}
                            </div>
                            <div className={`text-xs font-bold ${sub.evaluation?.passed ? 'text-green-600' : 'text-red-500'}`}>
                              {sub.evaluation?.passed ? '+ Passed' : 'x Failed'}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTest(test)
                                setEvaluation(sub.evaluation)
                                setPhase('result')
                              }}
                              className="mt-1 text-xs font-bold text-yellow-700 hover:text-yellow-600 underline"
                            >
                              View Report
                            </button>
                          </div>
                        ) : (() => {
                          const now = Date.now()
                          const fromOk = !test.activeFrom || now >= new Date(test.activeFrom).getTime()
                          const toOk = !test.activeTo || now <= new Date(test.activeTo).getTime()
                          const windowOpen = fromOk && toOk
                          return windowOpen ? (
                            <button
                              type="button"
                              onClick={() => handleStartExam(test)}
                              className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm rounded-xl transition-colors shadow-sm"
                            >
                              Start Exam {'>'}
                            </button>
                          ) : (
                            <div className="text-center">
                              <div className="text-xs font-bold text-gray-400 bg-gray-100 px-4 py-2 rounded-xl">
                                {!fromOk ? `Opens ${new Date(test.activeFrom!).toLocaleString()}` : 'Exam window closed'}
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </PageTransition>
    )
  }

  // -------------------------------------------------------------------------
  // PHASE: confirm
  // -------------------------------------------------------------------------

  if (phase === 'confirm' && activeTest) {
    const totalQ = flatQuestions.length
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-gray-50 flex items-center justify-center p-6 overflow-auto">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full space-y-5"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-black text-gray-900">{activeTest.title}</h2>
              {activeTest.company && (
                <span className="text-xs font-bold bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">{activeTest.company}</span>
              )}
            </div>
            <p className="text-sm text-gray-500">Read the instructions carefully before starting.</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-lg font-black text-gray-900">{activeTest.duration}</div>
              <div className="text-xs text-gray-400">Minutes</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-lg font-black text-gray-900">{activeTest.totalMarks}</div>
              <div className="text-xs text-gray-400">Total Marks</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-lg font-black text-gray-900">{totalQ}</div>
              <div className="text-xs text-gray-400">Questions</div>
            </div>
          </div>

          {activeTest.sections && (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Sections</p>
              </div>
              {activeTest.sections.map(sec => (
                <div key={sec.name} className="flex justify-between items-center px-4 py-2.5 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-700 font-medium">{sec.name}</span>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{sec.questions.length} questions</span>
                    <span className="font-bold text-gray-600">{sec.marks} marks</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
            <p className="text-xs font-black text-amber-800 uppercase tracking-wide flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Strict Proctoring Rules</p>
            <ul className="text-xs text-amber-700 space-y-1.5">
              <li>Exam opens in <strong>fullscreen mode</strong> -- exiting fullscreen triggers violation</li>
              <li>Tab switching: <strong>1 warning, 2nd auto-submits your exam immediately</strong></li>
              <li>All keyboard shortcuts are <strong>disabled</strong> (Esc, F-keys, Ctrl+C/V/P, PrintScreen)</li>
              <li>Copy, paste, right-click and drag are <strong>blocked</strong></li>
              <li>Timer is strict -- exam <strong>auto-submits</strong> when time runs out</li>
              <li>Browser back button is <strong>disabled</strong> during the exam</li>
              <li>Submit only when ready -- <strong>no re-attempts</strong> allowed</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setPhase('list')}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBeginExam}
              className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-sm rounded-xl"
            >
              Begin Exam {'>'}
            </button>
          </div>
        </motion.div>
      </div>,
      document.body
    )
  }

  // -------------------------------------------------------------------------
  // PHASE: running
  // -------------------------------------------------------------------------

  if (phase === 'running' && activeTest && currentItem) {
    const { q, sectionName } = currentItem
    const isLowTime = timeLeft < 300

    const getNavColor = (idx: number) => {
      const item = flatQuestions[idx]
      if (!item) return 'bg-gray-100'
      const qId = item.q.id
      if (markedForReview.has(qId)) return 'bg-orange-200 text-orange-800'
      const hasAnswer = item.q.type === 'coding'
        ? Boolean(codingAnswers[qId]?.trim())
        : Boolean(answers[qId])
      if (hasAnswer) return 'bg-yellow-400 text-black'
      return 'bg-white border border-gray-200 text-gray-600'
    }

    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-gray-50 flex flex-col">
        <AnimatePresence>
          {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
        </AnimatePresence>

        {showSubmitModal && (
          <SubmitModal
            onConfirm={handleSubmitExam}
            onCancel={() => setShowSubmitModal(false)}
            answered={answeredCount}
            total={totalQuestions}
          />
        )}

        {/* Header */}
        <div className={`sticky top-0 z-30 border-b ${isLowTime ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'} shadow-sm`}>
          {/* Proctoring status bar */}
          <div className={`px-4 py-1 flex items-center justify-between text-xs font-bold ${proctoring.violations > 0 ? 'bg-orange-500 text-white' : 'bg-gray-900 text-gray-300'}`}>
            <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> PROCTORED EXAM -- {activeTest.title}</span>
            <span className="flex items-center gap-3">
              {proctoring.violations > 0 && <span className="text-yellow-200 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {proctoring.violations}/2 violations</span>}
              <span className="flex items-center gap-1">{proctoring.isFullscreen ? <><Monitor className="w-3 h-3" /> Fullscreen</> : <><AlertTriangle className="w-3 h-3" /> Not fullscreen</>}</span>
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setNavOpen(v => !v)}
                className="lg:hidden p-1.5 rounded-lg bg-gray-100 text-gray-600 text-sm font-bold"
              >
                *
              </button>
              <div>
                <p className="text-xs text-gray-400 font-medium hidden sm:block">{activeTest.title}</p>
                <p className="text-xs text-gray-500">Q{currentQIdx + 1}/{totalQuestions} . {answeredCount} answered</p>
              </div>
            </div>

            <div className={`text-xl font-black tabular-nums tracking-tight ${isLowTime ? 'text-red-600 animate-pulse' : 'text-gray-900'}`}>
              {formatTime(timeLeft)}
            </div>

            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-sm rounded-xl"
            >
              Submit Exam
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-gray-100 overflow-hidden">
            <motion.div
              className="h-full bg-yellow-400"
              animate={{ width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <div className="flex flex-1 max-w-7xl mx-auto w-full">
          {/* Question Navigator Sidebar */}
          <div className={`${navOpen ? 'fixed inset-0 z-20 bg-black/40' : 'hidden'} lg:hidden`} onClick={() => setNavOpen(false)} />
          <aside className={`
            ${navOpen ? 'fixed left-0 top-0 z-30 h-full' : 'hidden'}
            lg:relative lg:block
            w-64 bg-white border-r border-gray-100 p-4 overflow-y-auto flex-shrink-0
          `}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Navigator</p>
              <button type="button" className="lg:hidden text-gray-400 text-sm" onClick={() => setNavOpen(false)}>x</button>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="flex items-center gap-1 text-xs text-gray-400"><span className="w-3 h-3 rounded bg-white border border-gray-200 inline-block" />Unanswered</span>
              <span className="flex items-center gap-1 text-xs text-gray-400"><span className="w-3 h-3 rounded bg-yellow-400 inline-block" />Answered</span>
              <span className="flex items-center gap-1 text-xs text-gray-400"><span className="w-3 h-3 rounded bg-orange-200 inline-block" />Marked</span>
            </div>

            {activeTest.sections.map((sec, si) => {
              let offset = 0
              for (let x = 0; x < si; x++) offset += activeTest.sections[x].questions.length
              return (
                <div key={si} className="mb-3">
                  <p className="text-xs font-bold text-gray-600 mb-1.5">{sec.name}</p>
                  <div className="grid grid-cols-5 gap-1">
                    {sec.questions.map((_, qi) => {
                      const globalIdx = offset + qi
                      return (
                        <button
                          key={qi}
                          type="button"
                          onClick={() => { setCurrentQIdx(globalIdx); setNavOpen(false) }}
                          className={`h-8 w-full text-xs font-bold rounded-lg transition-all ${getNavColor(globalIdx)} ${currentQIdx === globalIdx ? 'ring-2 ring-yellow-500 ring-offset-1' : ''}`}
                        >
                          {globalIdx + 1}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </aside>

          {/* Main Question Area */}
          <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
            <div className="max-w-2xl mx-auto">
              {/* Section + question meta */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{sectionName}</span>
                {q.difficulty && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${difficultyBg(q.difficulty)}`}>{q.difficulty}</span>
                )}
                {q.topic && <span className="text-xs text-gray-400">{q.topic}</span>}
                {questionSourceLabel(q) && (
                  <span className="text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
                    {questionSourceLabel(q)}
                  </span>
                )}
                <span className="text-xs font-bold text-gray-400 ml-auto">{q.marks} {q.marks === 1 ? 'mark' : 'marks'}</span>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 select-none">
                <p className="text-sm font-bold text-gray-500 mb-1">Question {currentQIdx + 1}</p>
                <p className="text-base text-gray-900 mb-5 leading-relaxed font-medium">{q.question}</p>

                {q.type === 'mcq' && q.options && (
                  <div className="space-y-2">
                    {q.options.map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleAnswerMCQ(q.id, opt.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all ${
                          answers[q.id] === opt.id
                            ? 'border-yellow-400 bg-yellow-50 font-bold text-gray-900'
                            : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-yellow-200 hover:bg-yellow-50/40'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-xs font-black ${
                          answers[q.id] === opt.id ? 'border-yellow-500 bg-yellow-400' : 'border-gray-300'
                        }`}>
                          {answers[q.id] === opt.id && '+'}
                        </span>
                        <span className="font-bold text-gray-500 mr-1">{opt.id.toUpperCase()}.</span>
                        {opt.text}
                      </button>
                    ))}
                  </div>
                )}

                {q.type === 'coding' && (
                  <div className="space-y-4">
                    {q.inputFormat && (
                      <div className="text-xs text-gray-500">
                        <span className="font-bold">Input: </span>{q.inputFormat}
                      </div>
                    )}
                    {q.outputFormat && (
                      <div className="text-xs text-gray-500">
                        <span className="font-bold">Output: </span>{q.outputFormat}
                      </div>
                    )}
                    {q.examples && q.examples.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-gray-500">Examples:</p>
                        {q.examples.map((ex, ei) => (
                          <div key={ei} className="bg-gray-50 rounded-xl p-3 font-mono text-xs space-y-1">
                            <div><span className="text-gray-400">Input: </span>{ex.input}</div>
                            <div><span className="text-gray-400">Output: </span>{ex.output}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {q.constraints && (
                      <div className="text-xs text-gray-500">
                        <span className="font-bold">Constraints: </span>{q.constraints}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-1.5">Your Solution:</p>
                      <textarea
                        value={codingAnswers[q.id] || ''}
                        onChange={e => handleAnswerCoding(q.id, e.target.value)}
                        placeholder="Write your code here..."
                        className="w-full h-48 px-4 py-3 bg-gray-900 text-green-400 font-mono text-sm rounded-xl border border-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
                        spellCheck={false}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation controls */}
              <div className="flex items-center justify-between mt-4">
                <button
                  type="button"
                  onClick={() => setCurrentQIdx(v => Math.max(0, v - 1))}
                  disabled={currentQIdx === 0}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  {'<-'} Previous
                </button>

                <button
                  type="button"
                  onClick={() => toggleMarkForReview(q.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
                    markedForReview.has(q.id)
                      ? 'border-orange-300 bg-orange-50 text-orange-700'
                      : 'border-gray-200 text-gray-500 hover:border-orange-200'
                  }`}
                >
                  {markedForReview.has(q.id) ? '* Marked' : '* Mark for Review'}
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentQIdx(v => Math.min(totalQuestions - 1, v + 1))}
                  disabled={currentQIdx === totalQuestions - 1}
                  className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 rounded-xl text-sm font-bold text-black disabled:opacity-40"
                >
                  Next {'>'}
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>,
      document.body
    )
  }

  // -------------------------------------------------------------------------
  // PHASE: submitting
  // -------------------------------------------------------------------------

  if (phase === 'submitting') {
    const messages = [
      'Grading your MCQ answers...',
      'AI is reviewing your code submissions...',
      'Generating per-question explanations...',
      'Saving your results...',
    ]
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-gray-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full space-y-6 text-center"
        >
          <div className="w-16 h-16 mx-auto border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          <div>
            <h3 className="text-xl font-black text-gray-900 mb-1">Evaluating Your Exam</h3>
            <p className="text-sm text-gray-500">AI is grading your answers. Results will appear shortly.</p>
          </div>
          <div className="space-y-2 text-left">
            {messages.map((msg, i) => (
              <div key={i} className={`flex items-center gap-3 text-sm ${i < submittingStep ? 'text-green-600' : i === submittingStep ? 'text-gray-800 font-semibold' : 'text-gray-300'}`}>
                <span className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-xs font-black ${i < submittingStep ? 'bg-green-500 text-white' : i === submittingStep ? 'border-2 border-yellow-400 animate-pulse text-yellow-500' : 'border-2 border-gray-200 text-gray-300'}`}>
                  {i < submittingStep ? '+' : i + 1}
                </span>
                {msg}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 italic">Do not close this window.</p>
        </motion.div>
      </div>,
      document.body
    )
  }

  // -------------------------------------------------------------------------
  // PHASE: result
  // -------------------------------------------------------------------------

  if (phase === 'result' && activeTest && evaluation) {
    const { totalScore, maxScore, percentage, grade, passed, sections: evalSections, aiSummary } = evaluation

    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-gray-50 overflow-auto">
        <div className="max-w-4xl mx-auto p-4 lg:p-8 space-y-6" ref={reportRef}>
          {/* Score card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
          >
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="text-center">
                <div className={`text-5xl font-black ${passed ? 'text-green-600' : 'text-red-500'}`}>
                  {totalScore}<span className="text-2xl text-gray-400">/{maxScore}</span>
                </div>
                <div className="mt-1 text-sm text-gray-500">{activeTest.title}</div>
              </div>

              <div className="flex-1 w-full">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-gray-600">{percentage.toFixed(1)}%</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xl font-black ${gradeColor(grade)}`}>Grade {grade}</span>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={`h-full rounded-full ${passed ? 'bg-green-500' : 'bg-red-400'}`}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0</span>
                  <span className="font-bold text-orange-600">50% pass mark</span>
                  <span>{maxScore}</span>
                </div>
              </div>
            </div>

            {/* Section scores row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
              {evalSections.map(sec => (
                <div key={sec.name} className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="text-base font-black text-gray-900">{sec.score}/{sec.maxScore}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{sec.name}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* AI Summary */}
          {aiSummary && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5"
            >
              <p className="text-xs font-black text-yellow-700 uppercase tracking-wide mb-2">AI Performance Summary</p>
              <p className="text-sm text-gray-700 italic leading-relaxed">{aiSummary}</p>
            </motion.div>
          )}

          {/* Section-by-section accordion */}
          <div className="space-y-4">
            {evalSections.map((sec, si) => (
              <motion.div
                key={si}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + si * 0.05 }}
                className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedSections(prev => {
                    const next = new Set(prev)
                    if (next.has(si)) next.delete(si)
                    else next.add(si)
                    return next
                  })}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-black text-gray-900">{sec.name}</span>
                    <span className="text-sm font-bold text-gray-500">{sec.score}/{sec.maxScore}</span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {sec.maxScore > 0 ? ((sec.score / sec.maxScore) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                  <span className="text-gray-400 text-sm">{expandedSections.has(si) ? '^' : 'v'}</span>
                </button>

                <AnimatePresence>
                  {expandedSections.has(si) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-gray-100"
                    >
                      <div className="divide-y divide-gray-50">
                        {sec.questions.map((eq, qi) => (
                          <div key={qi} className="p-5 space-y-3">
                            <div className="flex flex-wrap items-start gap-2">
                              <span className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-black ${eq.type === 'coding' ? (eq.marksEarned > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600') : (eq.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600')}`}>
                                {eq.type === 'coding' ? (eq.marksEarned > 0 ? '~' : 'x') : (eq.isCorrect ? '+' : 'x')}
                              </span>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-800 leading-relaxed">{eq.question}</p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {eq.difficulty && <span className={`text-xs px-1.5 py-0.5 rounded ${difficultyBg(eq.difficulty)}`}>{eq.difficulty}</span>}
                                  {eq.topic && <span className="text-xs text-gray-400">{eq.topic}</span>}
                                  {questionSourceLabel(eq) && (
                                    <span className="text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded">
                                      {questionSourceLabel(eq)}
                                    </span>
                                  )}
                                  <span className="text-xs font-bold text-gray-500 ml-auto">{eq.marksEarned}/{eq.marks} marks</span>
                                </div>
                              </div>
                            </div>

                            {eq.type === 'mcq' && (
                              <div className="ml-7 space-y-1">
                                {eq.options?.map(opt => (
                                  <div key={opt.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                                    opt.id === eq.correctAnswer
                                      ? 'bg-green-50 border border-green-200 font-bold text-green-800'
                                      : opt.id === eq.studentAnswer && !eq.isCorrect
                                      ? 'bg-red-50 border border-red-200 text-red-700'
                                      : 'text-gray-500'
                                  }`}>
                                    <span className="font-bold">{opt.id.toUpperCase()}.</span>
                                    {opt.text}
                                    {opt.id === eq.correctAnswer && <span className="ml-auto text-xs font-bold text-green-600">+ Correct</span>}
                                    {opt.id === eq.studentAnswer && !eq.isCorrect && <span className="ml-auto text-xs font-bold text-red-500">Your answer</span>}
                                  </div>
                                ))}
                                {!eq.studentAnswer && (
                                  <p className="text-xs text-gray-400 italic px-3">Not answered</p>
                                )}
                                {eq.explanation && (
                                  <div className="mt-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                                    <p className="text-xs font-bold text-blue-700 mb-0.5">Explanation</p>
                                    <p className="text-xs text-blue-800 leading-relaxed">{eq.explanation}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {eq.type === 'coding' && (
                              <div className="ml-7 space-y-3">
                                {eq.studentCode ? (
                                  <div>
                                    <p className="text-xs font-bold text-gray-500 mb-1">Your Code:</p>
                                    <pre className="bg-gray-900 text-green-400 text-xs p-3 rounded-xl overflow-x-auto leading-relaxed max-h-48 overflow-y-auto">{eq.studentCode}</pre>
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-400 italic">No code submitted</p>
                                )}
                                {eq.feedback && (
                                  <div className="px-3 py-2 bg-orange-50 border border-orange-100 rounded-lg">
                                    <p className="text-xs font-bold text-orange-700 mb-0.5">AI Feedback</p>
                                    <p className="text-xs text-orange-800 leading-relaxed">{eq.feedback}</p>
                                  </div>
                                )}
                                {eq.correctApproach && (
                                  <div className="px-3 py-2 bg-green-50 border border-green-100 rounded-lg">
                                    <p className="text-xs font-bold text-green-700 mb-0.5">Correct Approach</p>
                                    <p className="text-xs text-green-800 leading-relaxed">{eq.correctApproach}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Sticky action bar */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-3 flex gap-3">
            <button
              type="button"
              onClick={() => { setPhase('list'); setActiveTest(null); setEvaluation(null) }}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50"
            >
              {'<-'} Back to Tests
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-sm rounded-xl"
            >
              Download PDF Report
            </button>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  return null
}
