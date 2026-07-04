'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, GraduationCap, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { useAuth } from '@/hooks/useAuth'
import { useProctoring } from '@/hooks/useProctoring'
import { useExamMode } from '@/context/ExamModeContext'
import { getBackendUrl } from '@/lib/backendUrl'
import { getLanguageById } from '@/data/languages'
import { CONCEPTS } from '@/data/concepts'
import { listenToProgress } from '@/lib/firebase/firestore'
import { getCompletedConceptCount } from '@/lib/courseProgress'
import type { UserProgress } from '@/types'

// -- Types -----------------------------------------------------------------------

interface MCQOption { id: string; text: string }

interface ExamQuestion {
  id: string
  type: 'mcq' | 'coding'
  topic: string
  difficulty: string
  question: string
  options?: MCQOption[]
  correctAnswer?: string
  explanation?: string
  inputFormat?: string
  outputFormat?: string
  constraints?: string
  examples?: { input: string; output: string }[]
  testCases?: { input: string; output: string }[]
  marks: number
}

interface ExamSection {
  name: string
  marks: number
  questions: ExamQuestion[]
}

interface ExamTest {
  title: string
  totalMarks: number
  duration: number
  sections: ExamSection[]
}

interface EvalQuestion {
  id: string
  question: string
  type: string
  options?: MCQOption[]
  studentAnswer?: string | null
  correctAnswer?: string
  isCorrect?: boolean
  marks: number
  marksEarned: number
  explanation?: string
  topic?: string
  difficulty?: string
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

interface FinalExamResult {
  uid: string
  languageId: string
  score: number
  totalMarks: number
  percentage: number
  grade: string
  passed: boolean
  internalMarks: number
  externalMarks: number
  combinedScore: number
  tier: string
  evaluation: Evaluation
  submittedAt: unknown
}

interface PastAttempt {
  attemptNumber: number
  combinedScore: number
  internalMarks: number
  externalMarks: number
  tier: string
  passed: boolean
  grade: string
  submittedAt: string
}

// Phase flow: loading -> locked
//                     -> intro -> generating (questions load in background, rules shown)
//                              -> ready (questions ready, "Start Exam" button)
//                              -> running (proctoring active)
//                              -> submitting
//                              -> result
type Phase = 'loading' | 'locked' | 'intro' | 'generating' | 'ready' | 'running' | 'submitting' | 'result'

// -- Helpers ---------------------------------------------------------------------

function formatTime(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function gradeColor(g: string) {
  if (g === 'A+' || g === 'A') return 'text-green-700'
  if (g === 'B+' || g === 'B') return 'text-blue-700'
  if (g === 'C') return 'text-yellow-700'
  return 'text-red-600'
}

function diffBg(d: string) {
  if (d === 'Easy') return 'bg-green-100 text-green-700'
  if (d === 'Hard') return 'bg-red-100 text-red-700'
  return 'bg-yellow-100 text-yellow-700'
}

function computeTier(combined: number): string {
  if (combined >= 90) return 'Diamond'
  if (combined >= 80) return 'Gold'
  if (combined >= 60) return 'Silver'
  if (combined >= 40) return 'Pass'
  return 'Failed'
}

function tierStyle(tier: string): { bg: string; text: string; border: string } {
  switch (tier) {
    case 'Diamond': return { bg: 'bg-cyan-100',   text: 'text-cyan-800',   border: 'border-cyan-300' }
    case 'Gold':    return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' }
    case 'Silver':  return { bg: 'bg-gray-100',   text: 'text-gray-700',   border: 'border-gray-300' }
    case 'Pass':    return { bg: 'bg-amber-100',  text: 'text-amber-800',  border: 'border-amber-300' }
    default:        return { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-300' }
  }
}

function computeInternalMarks(userProgress: UserProgress | null): number {
  if (!userProgress?.assessmentScores) return 0
  const scores = Object.values(userProgress.assessmentScores as Record<string, number>).filter(s => typeof s === 'number')
  if (scores.length === 0) return 0
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  return Math.round((avg / 100) * 25 * 10) / 10
}

// -- Main Component --------------------------------------------------------------

export default function FinalExamClient({ params }: { params: { id: string } }) {
  const language = getLanguageById(params.id)
  const concepts = useMemo(() => CONCEPTS[params.id] || [], [params.id])
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const { enterExamMode, exitExamMode } = useExamMode()

  // Core phase
  const [phase, setPhase] = useState<Phase>('loading')
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null)
  const [examTest, setExamTest] = useState<ExamTest | null>(null)
  const [existingResult, setExistingResult] = useState<FinalExamResult | null>(null)
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [pastAttempts, setPastAttempts] = useState<PastAttempt[]>([])
  const [generateError, setGenerateError] = useState<string | null>(null)

  // Exam state
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [codeAnswers, setCodeAnswers] = useState<Record<string, string>>({})
  const [runResults, setRunResults] = useState<Record<string, { passed: number; total: number; output?: string }>>({})
  const [runningCode, setRunningCode] = useState<string | null>(null)
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set())
  const [currentQIdx, setCurrentQIdx] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [submittingStep, setSubmittingStep] = useState(0)
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]))

  // Result state
  const [resultInternalMarks, setResultInternalMarks] = useState(0)
  const [resultCombinedScore, setResultCombinedScore] = useState(0)
  const [resultTier, setResultTier] = useState('')

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)
  const submitRef = useRef<(() => void) | null>(null)
  const examEndAtRef = useRef<number>(0)
  const submittingRef = useRef(false)
  const phaseInitializedRef = useRef(false)
  const draftKey = user ? `final_exam_draft_${user.uid}_${params.id}` : ''

  // Fullscreen + exam mode: only active while running
  useEffect(() => {
    if (phase === 'running') {
      enterExamMode()
    } else {
      exitExamMode()
      if (phase !== 'generating' && phase !== 'ready') {
        try { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}) } catch {}
      }
    }
  }, [phase, enterExamMode, exitExamMode])

  useEffect(() => {
    return () => {
      exitExamMode()
      try { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}) } catch {}
    }
  }, [exitExamMode])

  const handleViolationAutoSubmit = useCallback(() => {
    if (submitRef.current) submitRef.current()
    const go = () => {
      try { router.replace('/dashboard') } catch { /* ignore */ }
      window.setTimeout(() => window.location.replace('/dashboard'), 1500)
    }
    window.setTimeout(go, 2000)
  }, [router])

  const proctoring = useProctoring({
    enabled: phase === 'running',
    onAutoSubmit: handleViolationAutoSubmit,
  })

  // Progress listener
  const [progressLoaded, setProgressLoaded] = useState(false)
  useEffect(() => {
    if (!user) return
    const unsub = listenToProgress(user.uid, (p) => {
      setUserProgress(p)
      setProgressLoaded(true)
    })
    return unsub
  }, [user])

  // One-time initialization: decide locked vs intro, load past attempts
  useEffect(() => {
    if (authLoading || !user || !progressLoaded) return
    if (phaseInitializedRef.current) return
    phaseInitializedRef.current = true

    const isTestAccount = user.email === 'sastraism@gmail.com'
    const completed = getCompletedConceptCount(userProgress, concepts.map(c => c.id))
    if (!isTestAccount && completed < concepts.length) {
      setPhase('locked')
      return
    }

    const attemptsRef = collection(db, 'finalExamAttempts', `${user.uid}_${params.id}`, 'attempts')
    const attemptsQuery = query(attemptsRef, orderBy('submittedAt', 'desc'))

    Promise.all([
      getDoc(doc(db, 'finalExamResults', `${user.uid}_${params.id}`)),
      getDocs(attemptsQuery),
    ]).then(([snap, attSnap]) => {
      if (snap.exists()) {
        const data = snap.data() as FinalExamResult
        setExistingResult(data)
        if (typeof data.combinedScore === 'number') {
          setResultCombinedScore(data.combinedScore)
          // Derived from combinedScore rather than the stored tier field, so a record written
          // under an older threshold scheme can never show a stale tier.
          setResultTier(computeTier(data.combinedScore))
        }
        if (typeof data.internalMarks === 'number') setResultInternalMarks(data.internalMarks)
      }
      if (!attSnap.empty) {
        const attempts: PastAttempt[] = attSnap.docs.map((d, idx) => {
          const a = d.data()
          const combinedScore = a.combinedScore ?? 0
          return {
            attemptNumber: a.attemptNumber ?? (attSnap.size - idx),
            combinedScore,
            internalMarks: a.internalMarks ?? 0,
            externalMarks: a.externalMarks ?? 0,
            tier: computeTier(combinedScore),
            passed: combinedScore >= 40,
            grade: a.grade ?? '-',
            submittedAt: a.submittedAt?.toDate?.()?.toLocaleDateString('en-IN') ?? '',
          }
        })
        setPastAttempts(attempts)
      }
      setPhase('intro')
    }).catch(() => setPhase('intro'))
  }, [authLoading, user, userProgress, progressLoaded, concepts, params.id])

  // Anti-cheat
  useEffect(() => {
    if (phase !== 'running') return
    const onCopy = (e: ClipboardEvent) => { e.preventDefault(); setToast('Copy is disabled during the exam.') }
    const onPaste = (e: ClipboardEvent) => { e.preventDefault(); setToast('Paste is disabled during the exam.') }
    const onContext = (e: MouseEvent) => e.preventDefault()
    document.addEventListener('copy', onCopy)
    document.addEventListener('paste', onPaste)
    document.addEventListener('contextmenu', onContext)
    return () => {
      document.removeEventListener('copy', onCopy)
      document.removeEventListener('paste', onPaste)
      document.removeEventListener('contextmenu', onContext)
    }
  }, [phase])

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  const startTimer = useCallback((mins: number) => {
    stopTimer()
    const now = Date.now()
    startTimeRef.current = now
    examEndAtRef.current = now + mins * 60 * 1000
    setTimeLeft(mins * 60)
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((examEndAtRef.current - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining <= 0) { stopTimer(); submitRef.current?.() }
    }, 500)
  }, [stopTimer])

  useEffect(() => () => stopTimer(), [stopTimer])

  // Step 1: user clicks "Begin Exam" -> enter fullscreen, start generating in background
  const handleBeginExam = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
    } catch { /* fullscreen optional */ }
    setGenerateError(null)
    setPhase('generating')
    // generate runs in the background while rules are shown
    generateExam()
  }

  const generateExam = useCallback(async () => {
    try {
      const res = await fetch(`${getBackendUrl()}/api/ai/generate-final-exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          languageId: params.id,
          languageTitle: language?.title || params.id,
          concepts: concepts.map(c => ({ id: c.id, title: c.title })),
        }),
        signal: AbortSignal.timeout(300_000),
      })
      const data = await res.json() as { success?: boolean; error?: string; test?: ExamTest }
      if (!data.success || !data.test) throw new Error(data.error || 'Generation failed')

      // Restore draft if any
      if (draftKey) {
        try {
          const raw = localStorage.getItem(draftKey)
          if (raw) {
            const draft = JSON.parse(raw) as { answers?: Record<string, string>; codeAnswers?: Record<string, string>; currentQIdx?: number; markedForReview?: string[] }
            const questions = data.test.sections.flatMap(s => s.questions)
            if (draft.answers && typeof draft.answers === 'object') setAnswers(draft.answers)
            if (draft.codeAnswers && typeof draft.codeAnswers === 'object') setCodeAnswers(draft.codeAnswers)
            if (Array.isArray(draft.markedForReview)) setMarkedForReview(new Set(draft.markedForReview))
            if (typeof draft.currentQIdx === 'number') setCurrentQIdx(Math.min(Math.max(0, draft.currentQIdx), questions.length - 1))
          }
        } catch { /* corrupt draft */ }
      }

      setExamTest(data.test)
      setPhase('ready')  // questions ready -- show "Start Exam" button
    } catch (err) {
      const msg = err instanceof Error && err.name === 'TimeoutError'
        ? 'Exam generation timed out. The AI is busy -- please try again.'
        : 'Failed to generate exam questions. Please try again.'
      setGenerateError(msg)
      setPhase('generating')  // stay on generating screen but show error + retry
    }
  }, [params.id, language?.title, concepts, draftKey])

  // Step 2: user clicks "Start Exam" after questions are ready
  const handleStartExam = useCallback(() => {
    if (!examTest) return
    setPhase('running')
    startTimer(examTest.duration || 90)
  }, [examTest, startTimer])

  const handleRunCode = useCallback(async (q: ExamQuestion) => {
    const code = codeAnswers[q.id] || ''
    if (!code.trim()) { setToast('Write some code first.'); return }
    setRunningCode(q.id)
    try {
      const visibleCases = (q.examples || q.testCases || []).slice(0, 3)
      const res = await fetch(`${getBackendUrl()}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: (language?.id || 'python').toLowerCase(), testCases: visibleCases }),
      })
      const data = await res.json() as { passed?: number; total?: number; output?: string; error?: string }
      setRunResults(prev => ({
        ...prev,
        [q.id]: { passed: data.passed ?? 0, total: data.total ?? visibleCases.length, output: data.output || data.error || '' },
      }))
    } catch {
      setRunResults(prev => ({ ...prev, [q.id]: { passed: 0, total: 0, output: 'Run failed.' } }))
    } finally {
      setRunningCode(null)
    }
  }, [codeAnswers, language?.id])

  const handleSubmitExam = useCallback(async () => {
    if (!examTest || !user) return
    if (submittingRef.current) return
    submittingRef.current = true

    stopTimer()
    setShowSubmitModal(false)
    setPhase('submitting')
    setSubmittingStep(1)
    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000)
    const internalMarks = computeInternalMarks(userProgress)

    try {
      sessionStorage.setItem(
        `final_exam_recovery_${user.uid}_${params.id}`,
        JSON.stringify({ answers, codeAnswers, timeTaken, ts: Date.now() })
      )
    } catch { /* quota */ }

    await new Promise(r => setTimeout(r, 600))
    setSubmittingStep(2)

    try {
      let lastErr: Error | null = null
      let data: { success?: boolean; evaluation?: Evaluation; error?: string } | null = null
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const controller = new AbortController()
          const timeoutId = window.setTimeout(() => controller.abort(), 90_000)
          const res = await fetch(`${getBackendUrl()}/api/placement/evaluate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid: user.uid,
              testId: `final_${params.id}`,
              sections: examTest.sections,
              answers,
              codingAnswers: codeAnswers,
              timeTaken,
              studentName: profile?.displayName || user.displayName || 'Student',
            }),
            signal: controller.signal,
          })
          window.clearTimeout(timeoutId)
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
      await new Promise(r => setTimeout(r, 400))

      const externalScore = data.evaluation.totalScore
      const combinedScore = Math.round((internalMarks + externalScore) * 10) / 10
      const tier = computeTier(combinedScore)
      const passed = combinedScore >= 40

      const result: FinalExamResult = {
        uid: user.uid,
        languageId: params.id,
        score: externalScore,
        totalMarks: data.evaluation.maxScore,
        percentage: data.evaluation.percentage,
        grade: data.evaluation.grade,
        passed,
        internalMarks,
        externalMarks: externalScore,
        combinedScore,
        tier,
        evaluation: data.evaluation,
        submittedAt: serverTimestamp(),
      }

      // Write/overwrite main result doc (certificate page reads this)
      await setDoc(doc(db, 'finalExamResults', `${user.uid}_${params.id}`), result)

      // Append to attempts subcollection
      const attemptNumber = pastAttempts.length + 1
      await addDoc(collection(db, 'finalExamAttempts', `${user.uid}_${params.id}`, 'attempts'), {
        attemptNumber,
        uid: user.uid,
        languageId: params.id,
        score: externalScore,
        totalMarks: data.evaluation.maxScore,
        percentage: data.evaluation.percentage,
        grade: data.evaluation.grade,
        passed,
        internalMarks,
        externalMarks: externalScore,
        combinedScore,
        tier,
        submittedAt: serverTimestamp(),
      })

      // Update local attempts list immediately
      const newAttempt: PastAttempt = {
        attemptNumber,
        combinedScore,
        internalMarks,
        externalMarks: externalScore,
        tier,
        passed,
        grade: data.evaluation.grade,
        submittedAt: new Date().toLocaleDateString('en-IN'),
      }
      setPastAttempts(prev => [newAttempt, ...prev])

      try {
        sessionStorage.removeItem(`final_exam_recovery_${user.uid}_${params.id}`)
        if (draftKey) localStorage.removeItem(draftKey)
      } catch {}

      setResultInternalMarks(internalMarks)
      setResultCombinedScore(combinedScore)
      setResultTier(tier)
      setEvaluation(data.evaluation)
      setExistingResult(result)
      setSubmittingStep(4)
      await new Promise(r => setTimeout(r, 400))
      setPhase('result')
    } catch (err) {
      console.error('Final exam evaluation error:', err)
      submittingRef.current = false
      setToast('Evaluation failed. Your answers are saved -- try submitting again.')
      setPhase('running')
    }
  }, [examTest, user, answers, codeAnswers, profile, params.id, stopTimer, draftKey, userProgress, pastAttempts.length])

  useEffect(() => { submitRef.current = handleSubmitExam }, [handleSubmitExam])

  // Draft autosave
  useEffect(() => {
    if (phase !== 'running' || !draftKey || !examTest) return
    const id = window.setInterval(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({
          answers, codeAnswers, currentQIdx,
          markedForReview: Array.from(markedForReview),
          ts: Date.now(),
        }))
      } catch { /* quota */ }
    }, 5000)
    return () => window.clearInterval(id)
  }, [phase, draftKey, examTest, answers, codeAnswers, currentQIdx, markedForReview])

  const allQuestions = examTest?.sections.flatMap(s => s.questions) || []
  const totalQ = allQuestions.length
  const answeredCount = allQuestions.filter(q =>
    q.type === 'coding' ? Boolean(codeAnswers[q.id]?.trim()) : Boolean(answers[q.id])
  ).length
  // Clamp index so currentQ is never undefined when running
  const safeQIdx = totalQ > 0 ? Math.min(currentQIdx, totalQ - 1) : 0
  const currentQ = allQuestions[safeQIdx]

  const getNavColor = (idx: number) => {
    const q = allQuestions[idx]
    if (!q) return 'bg-gray-100'
    if (markedForReview.has(q.id)) return 'bg-orange-200 text-orange-800'
    const answered = q.type === 'coding' ? Boolean(codeAnswers[q.id]?.trim()) : Boolean(answers[q.id])
    if (answered) return 'bg-yellow-400 text-black'
    return 'bg-white border border-gray-200 text-gray-600'
  }

  if (!language) return <div className="p-8 text-center text-gray-400">Language not found.</div>

  // -- LOADING ------------------------------------------------------------------
  if (phase === 'loading' || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500">Loading exam...</p>
        </div>
      </div>
    )
  }

  // -- LOCKED -------------------------------------------------------------------
  if (phase === 'locked') {
    const done = userProgress ? getCompletedConceptCount(userProgress, concepts.map(c => c.id)) : 0
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
          <div className="flex justify-center"><Lock className="w-14 h-14 text-gray-400" /></div>
          <h2 className="text-xl font-black text-gray-900">Final Exam Locked</h2>
          <p className="text-sm text-gray-500">Complete all {concepts.length} concepts in {language.title} to unlock the final exam.</p>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-2xl font-black text-gray-900 mb-1">{done}/{concepts.length}</div>
            <div className="text-xs text-gray-400">concepts completed</div>
            <div className="mt-3">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                {done > 0 && <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${(done / concepts.length) * 100}%` }} />}
              </div>
            </div>
          </div>
          <Link href={`/language/${params.id}`} className="block w-full py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-sm rounded-xl">
            Continue Learning &rarr;
          </Link>
        </motion.div>
      </div>
    )
  }

  // -- INTRO --------------------------------------------------------------------
  if (phase === 'intro') {
    const internalMarks = computeInternalMarks(userProgress)
    const isTestAccount = user?.email === 'sastraism@gmail.com'
    const bestAttempt = pastAttempts.length > 0
      ? pastAttempts.reduce((best, a) => a.combinedScore > best.combinedScore ? a : best, pastAttempts[0])
      : null
    const hasPassed = pastAttempts.some(a => a.passed) || (existingResult?.combinedScore ?? 0) >= 40

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full space-y-5">

          {/* Header */}
          <div className="flex items-center gap-3">
            <span className="text-3xl">{language.icon}</span>
            <div>
              <h2 className="text-xl font-black text-gray-900">{language.title} Final Exam</h2>
              <p className="text-sm text-gray-500">Comprehensive assessment of all {concepts.length} concepts</p>
            </div>
          </div>

          {/* Test account banner */}
          {isTestAccount && (
            <div className="bg-purple-50 border border-purple-300 rounded-xl p-3 space-y-2">
              <p className="text-xs font-black uppercase tracking-wider text-purple-700">Test Account Mode</p>
              <p className="text-xs text-purple-600">Exam unlocked regardless of completion. Certificate tier previews:</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {['Pass', 'Silver', 'Gold', 'Diamond'].map(t => (
                  <Link key={t} href={`/language/${params.id}/certificate?demo=1&tier=${t}`}
                    className="px-3 py-1 rounded-full border border-purple-300 text-xs font-bold text-purple-700 hover:bg-purple-100 transition-colors">
                    {t} Cert
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Certificate earned banner */}
          {hasPassed && bestAttempt && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-green-700 uppercase tracking-wide">Certificate Earned</p>
                  <p className="text-sm text-green-800 font-semibold mt-0.5">
                    Best score: {bestAttempt.combinedScore}/100 - {bestAttempt.tier} Tier
                  </p>
                </div>
                <GraduationCap className="w-8 h-8 text-green-600 shrink-0" />
              </div>
              <Link href={`/language/${params.id}/certificate`}
                className="block w-full py-2 bg-green-600 hover:bg-green-500 text-white font-black text-sm rounded-xl text-center">
                View Certificate &rarr;
              </Link>
              <p className="text-xs text-green-600 text-center">Retake anytime to improve your tier</p>
            </div>
          )}

          {/* Previous attempts */}
          {pastAttempts.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                <p className="text-xs font-black text-gray-600 uppercase tracking-wide">
                  Previous Attempts ({pastAttempts.length})
                </p>
              </div>
              <div className="divide-y divide-gray-100 max-h-44 overflow-y-auto">
                {pastAttempts.map((a, idx) => {
                  const ts = tierStyle(a.tier)
                  return (
                    <div key={idx} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-gray-400 w-6">#{a.attemptNumber}</span>
                        <div>
                          <span className="font-bold text-gray-900">{a.combinedScore}/100</span>
                          <span className="text-gray-400 text-xs ml-2">{a.internalMarks}/25 + {a.externalMarks}/75</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${ts.bg} ${ts.text} ${ts.border}`}>{a.tier}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {a.passed ? 'Pass' : 'Fail'}
                        </span>
                        {a.submittedAt && <span className="text-xs text-gray-400 hidden sm:block">{a.submittedAt}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Scoring */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-black text-blue-800 uppercase tracking-wide mb-3">Scoring Breakdown</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white rounded-xl p-3 border border-blue-100">
                <div className="text-xl font-black text-blue-700">{computeInternalMarks(userProgress)}/25</div>
                <div className="text-xs text-blue-500 mt-0.5">Internal</div>
                <div className="text-xs text-gray-400 mt-0.5">from concept scores</div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-blue-100">
                <div className="text-xl font-black text-indigo-700">75</div>
                <div className="text-xs text-indigo-500 mt-0.5">External Exam</div>
                <div className="text-xs text-gray-400 mt-0.5">today</div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-blue-100">
                <div className="text-xl font-black text-gray-900">100</div>
                <div className="text-xs text-gray-500 mt-0.5">Total</div>
                <div className="text-xs text-gray-400 mt-0.5">Pass: 40/100</div>
              </div>
            </div>
          </div>

          {/* Tier ranges */}
          <div className="border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-black text-gray-700 uppercase tracking-wide mb-3">Certificate Tiers</p>
            <div className="grid grid-cols-4 gap-1.5 text-center">
              {[
                { tier: 'Pass', range: '40-59', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800' },
                { tier: 'Silver', range: '60-79', bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700' },
                { tier: 'Gold', range: '80-89', bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-800' },
                { tier: 'Diamond', range: '90-100', bg: 'bg-cyan-50', border: 'border-cyan-300', text: 'text-cyan-800' },
              ].map(t => (
                <div key={t.tier} className={`rounded-xl border p-2 ${t.bg} ${t.border}`}>
                  <div className={`text-xs font-black ${t.text}`}>{t.tier}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{t.range}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Action */}
          <div className="flex gap-3">
            <Link href={`/language/${params.id}`} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 text-center hover:bg-gray-50">
              Cancel
            </Link>
            <button type="button" onClick={handleBeginExam}
              className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-sm rounded-xl">
              Begin Exam &rarr;
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // -- GENERATING (questions loading in background, rules shown) ----------------
  if (phase === 'generating') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl w-full space-y-6">

          {/* Header */}
          <div className="text-center space-y-2">
            {!generateError ? (
              <>
                <div className="w-12 h-12 mx-auto border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                <h2 className="text-2xl font-black text-white mt-4">{language.title} Final Exam</h2>
                <p className="text-gray-400 text-sm">AI is preparing your questions -- read the rules while you wait</p>
              </>
            ) : (
              <>
                <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
                <h2 className="text-xl font-black text-white mt-2">Generation Failed</h2>
                <p className="text-red-400 text-sm">{generateError}</p>
                <div className="flex gap-3 justify-center mt-4">
                  <button type="button" onClick={() => { setGenerateError(null); generateExam() }}
                    className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-sm rounded-xl">
                    Retry &rarr;
                  </button>
                  <button type="button" onClick={() => setPhase('intro')}
                    className="px-6 py-2.5 border border-gray-600 text-gray-300 font-bold text-sm rounded-xl hover:bg-gray-800">
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Exam details */}
          {!generateError && (
            <>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Duration', value: '90 min' },
                  { label: 'Questions', value: '27' },
                  { label: 'Pass Mark', value: '40/100' },
                ].map(item => (
                  <div key={item.label} className="bg-white/10 rounded-xl p-4 text-center">
                    <div className="text-xl font-black text-white">{item.value}</div>
                    <div className="text-xs text-gray-400 mt-1">{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Rules */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                <p className="text-xs font-black text-yellow-400 uppercase tracking-widest">Exam Rules -- Read Carefully</p>
                <div className="space-y-2.5">
                  {[
                    'This exam runs in full-screen mode. Do not exit full screen.',
                    'Switching tabs or windows counts as a violation.',
                    'First violation: warning. Second violation: exam auto-submits immediately.',
                    'Copy and paste are disabled for the entire duration.',
                    'Timer is strict -- the exam auto-submits when it reaches 0:00.',
                    'You need 40/100 combined (internal + external) to pass.',
                    'Section A: 2 coding problems (25 marks each).',
                    'Section B: 25 MCQ questions (1 mark each).',
                    `Questions cover all ${concepts.length} Python concepts equally.`,
                    'You may retake the exam as many times as you wish.',
                  ].map((rule, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="w-5 h-5 shrink-0 rounded-full bg-yellow-400/20 border border-yellow-400/40 flex items-center justify-center text-xs font-black text-yellow-300 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-sm text-gray-300 leading-snug">{rule}</p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-center text-xs text-gray-500 animate-pulse">
                Preparing questions... the Start Exam button will appear automatically once ready.
              </p>
            </>
          )}
        </motion.div>
      </div>
    )
  }

  // -- READY (questions loaded, user clicks Start Exam) -------------------------
  if (phase === 'ready') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center space-y-5">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">Questions Ready!</h2>
              <p className="text-sm text-gray-500 mt-1">
                {examTest?.sections.reduce((a, s) => a + s.questions.length, 0)} questions loaded across {examTest?.sections.length} sections.
                90-minute timer starts when you click Start Exam.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left space-y-1">
              <p className="text-xs font-black text-amber-800">Before you start:</p>
              <p className="text-xs text-amber-700">- Stay in full screen at all times</p>
              <p className="text-xs text-amber-700">- Do not switch tabs -- 2nd violation auto-submits</p>
              <p className="text-xs text-amber-700">- Timer is strict and cannot be paused</p>
            </div>
            <button type="button" onClick={handleStartExam}
              className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-base rounded-xl transition-colors">
              Start Exam &rarr;
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // -- RUNNING ------------------------------------------------------------------
  if (phase === 'running' && examTest) {
    if (!currentQ) {
      // Questions not yet populated -- should not normally happen
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-500">Loading questions...</p>
          </div>
        </div>
      )
    }
    const isLowTime = timeLeft < 600
    const isCoding = currentQ.type === 'coding'

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <AnimatePresence>
          {toast && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-orange-500 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-bold cursor-pointer"
              onClick={() => setToast(null)}>
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

        {showSubmitModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
              <h3 className="text-lg font-black text-gray-900 mb-2">Submit Final Exam?</h3>
              <p className="text-sm text-gray-500 mb-4">
                You have answered <strong>{answeredCount}/{totalQ}</strong> questions.
                {answeredCount < totalQ && <span className="text-orange-600"> {totalQ - answeredCount} unanswered.</span>}
              </p>
              <p className="text-xs text-gray-400 mb-5">Need 40/100 combined to pass and unlock your certificate.</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowSubmitModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="button" onClick={handleSubmitExam} className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-300 rounded-xl text-sm font-black text-black">Submit</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Header */}
        <div className={`sticky top-0 z-30 border-b shadow-sm ${isLowTime ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setNavOpen(v => !v)} className="lg:hidden p-1.5 rounded-lg bg-gray-100 text-gray-600 text-sm">=</button>
              <div>
                <p className="text-xs font-bold text-gray-500 hidden sm:block">{language.title} Final Exam</p>
                <p className="text-xs text-gray-400">
                  Q{safeQIdx + 1}/{totalQ} . {answeredCount} answered
                  {proctoring.violations > 0 ? ` . (!) ${proctoring.violations}/2 violations` : ''}
                </p>
              </div>
            </div>
            <div className={`text-xl font-black tabular-nums ${isLowTime ? 'text-red-600 animate-pulse' : 'text-gray-900'}`}>{formatTime(timeLeft)}</div>
            <button type="button" onClick={() => setShowSubmitModal(true)} className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-sm rounded-xl">Submit</button>
          </div>
          <div className="h-1">
            <div className="h-full bg-yellow-400 transition-all" style={{ width: `${totalQ > 0 ? (answeredCount / totalQ) * 100 : 0}%` }} />
          </div>
        </div>

        <div className="flex flex-1 max-w-7xl mx-auto w-full">
          {/* Navigator overlay (mobile) */}
          <div className={`${navOpen ? 'fixed inset-0 z-20 bg-black/40' : 'hidden'} lg:hidden`} onClick={() => setNavOpen(false)} />
          <aside className={`${navOpen ? 'fixed left-0 top-0 z-30 h-full' : 'hidden'} lg:relative lg:block w-60 bg-white border-r border-gray-100 p-4 overflow-y-auto flex-shrink-0`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-500 uppercase">Navigator</p>
              <button type="button" className="lg:hidden text-gray-400" onClick={() => setNavOpen(false)}>x</button>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-white border border-gray-200 inline-block" />Empty</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400 inline-block" />Done</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-200 inline-block" />Marked</span>
            </div>
            {examTest.sections.map((sec, si) => {
              const offset = examTest.sections.slice(0, si).reduce((a, s) => a + s.questions.length, 0)
              return (
                <div key={si} className="mb-3">
                  <p className="text-xs font-bold text-gray-400 mb-1.5 truncate">{sec.name}</p>
                  <div className="grid grid-cols-5 gap-1">
                    {sec.questions.map((_, qi) => {
                      const idx = offset + qi
                      return (
                        <button key={idx} type="button" onClick={() => { setCurrentQIdx(idx); setNavOpen(false) }}
                          className={`h-8 text-xs font-bold rounded-lg transition-all ${getNavColor(idx)} ${safeQIdx === idx ? 'ring-2 ring-yellow-500 ring-offset-1' : ''}`}>
                          {idx + 1}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </aside>

          {/* Main question area */}
          <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
            <div className="max-w-2xl mx-auto">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{currentQ.topic}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${diffBg(currentQ.difficulty)}`}>{currentQ.difficulty}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isCoding ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                  {isCoding ? 'Coding' : 'MCQ'}
                </span>
                <span className="text-xs text-gray-400 ml-auto">{currentQ.marks} marks</span>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <p className="text-xs font-bold text-gray-400 mb-1">Question {currentQIdx + 1}</p>
                <p className="text-base text-gray-900 mb-4 leading-relaxed font-medium">{currentQ.question}</p>

                {isCoding ? (
                  <div className="space-y-4">
                    {currentQ.inputFormat && (
                      <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600">
                        <p className="font-bold text-gray-700 mb-1">Input Format</p>
                        <p>{currentQ.inputFormat}</p>
                      </div>
                    )}
                    {currentQ.outputFormat && (
                      <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600">
                        <p className="font-bold text-gray-700 mb-1">Output Format</p>
                        <p>{currentQ.outputFormat}</p>
                      </div>
                    )}
                    {currentQ.constraints && (
                      <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600">
                        <p className="font-bold text-gray-700 mb-1">Constraints</p>
                        <p>{currentQ.constraints}</p>
                      </div>
                    )}
                    {(currentQ.examples || []).length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-gray-700">Examples</p>
                        {(currentQ.examples || []).slice(0, 3).map((ex, ei) => (
                          <div key={ei} className="bg-gray-900 rounded-xl p-3 font-mono text-xs">
                            <div className="text-gray-400 mb-1">Input:</div>
                            <div className="text-green-300 whitespace-pre">{ex.input}</div>
                            <div className="text-gray-400 mt-2 mb-1">Output:</div>
                            <div className="text-yellow-300 whitespace-pre">{ex.output}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-gray-700 mb-2">Your Solution ({language.title})</p>
                      <textarea
                        className="w-full min-h-48 bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-xl border border-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-y"
                        placeholder={`# Write your ${language.title} solution here...`}
                        value={codeAnswers[currentQ.id] || ''}
                        onChange={e => setCodeAnswers(prev => ({ ...prev, [currentQ.id]: e.target.value }))}
                        spellCheck={false}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => handleRunCode(currentQ)} disabled={runningCode === currentQ.id}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-green-400 font-bold text-xs rounded-xl transition-colors disabled:opacity-60 flex items-center gap-2">
                        {runningCode === currentQ.id
                          ? <><span className="w-3 h-3 border border-green-400 border-t-transparent rounded-full animate-spin" />Running...</>
                          : 'Run Code (visible tests)'}
                      </button>
                      {runResults[currentQ.id] && (
                        <span className={`text-xs font-bold ${runResults[currentQ.id].passed === runResults[currentQ.id].total ? 'text-green-600' : 'text-orange-600'}`}>
                          {runResults[currentQ.id].passed}/{runResults[currentQ.id].total} tests passed
                        </span>
                      )}
                    </div>
                    {runResults[currentQ.id]?.output && (
                      <div className="bg-gray-900 rounded-xl p-3 font-mono text-xs text-gray-300 max-h-32 overflow-y-auto">
                        <p className="text-gray-500 mb-1">Output:</p>
                        <p className="whitespace-pre-wrap">{runResults[currentQ.id].output}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(currentQ.options || []).map(opt => (
                      <button key={opt.id} type="button" onClick={() => setAnswers(prev => ({ ...prev, [currentQ.id]: opt.id }))}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all ${answers[currentQ.id] === opt.id ? 'border-yellow-400 bg-yellow-50 font-bold' : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-yellow-200'}`}>
                        <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-xs font-black ${answers[currentQ.id] === opt.id ? 'border-yellow-500 bg-yellow-400' : 'border-gray-300'}`}>
                          {answers[currentQ.id] === opt.id && '+'}
                        </span>
                        <span className="font-bold text-gray-400 mr-1">{opt.id.toUpperCase()}.</span>
                        {opt.text}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-4">
                <button type="button" onClick={() => setCurrentQIdx(v => Math.max(0, v - 1))} disabled={safeQIdx === 0}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                  &larr; Prev
                </button>
                <button type="button"
                  onClick={() => setMarkedForReview(prev => { const n = new Set(prev); if (n.has(currentQ.id)) n.delete(currentQ.id); else n.add(currentQ.id); return n })}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${markedForReview.has(currentQ.id) ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500'}`}>
                  {markedForReview.has(currentQ.id) ? '* Marked' : '* Mark'}
                </button>
                <button type="button" onClick={() => setCurrentQIdx(v => Math.min(totalQ - 1, v + 1))} disabled={safeQIdx === totalQ - 1}
                  className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 rounded-xl text-sm font-bold text-black disabled:opacity-40">
                  Next &rarr;
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // -- SUBMITTING ---------------------------------------------------------------
  if (phase === 'submitting') {
    const steps = ['Preparing submission...', 'Grading your answers...', 'Generating explanations...', 'Saving results...']
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center space-y-5">
          <div className="w-14 h-14 mx-auto border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          <div>
            <h3 className="text-lg font-black text-gray-900">Evaluating Exam</h3>
            <p className="text-sm text-gray-500 mt-1">Please wait -- do not close this window.</p>
          </div>
          <div className="space-y-2 text-left">
            {steps.map((step, i) => (
              <div key={i} className={`flex items-center gap-3 text-sm ${i < submittingStep ? 'text-green-600' : i === submittingStep ? 'text-gray-900 font-bold' : 'text-gray-300'}`}>
                <span className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-xs font-black ${i < submittingStep ? 'bg-green-500 text-white' : i === submittingStep ? 'border-2 border-yellow-400 animate-pulse' : 'border-2 border-gray-200'}`}>
                  {i < submittingStep ? '+' : i + 1}
                </span>
                {step}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    )
  }

  // -- RESULT -------------------------------------------------------------------
  if (phase === 'result' && evaluation) {
    const { totalScore, percentage, grade, sections: evalSections, aiSummary } = evaluation
    const internalMarks = resultInternalMarks
    const combinedScore = resultCombinedScore || Math.round((internalMarks + totalScore) * 10) / 10
    const tier = resultTier || computeTier(combinedScore)
    const ts = tierStyle(tier)
    const combinedPassed = combinedScore >= 40

    const handleRetake = () => {
      setPhase('intro')
      setEvaluation(null)
      setExamTest(null)
      setAnswers({})
      setCodeAnswers({})
      setRunResults({})
      setMarkedForReview(new Set())
      setCurrentQIdx(0)
      submittingRef.current = false
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto p-4 lg:p-8 space-y-5">

          {/* Score card */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-black text-gray-900 text-center">{language.title} Final Exam -- Result</h2>

            {/* Score breakdown */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-blue-50 rounded-xl p-3">
                <div className="text-2xl font-black text-blue-700">{internalMarks}/25</div>
                <div className="text-xs text-blue-500 mt-0.5">Internal</div>
              </div>
              <div className="bg-indigo-50 rounded-xl p-3">
                <div className="text-2xl font-black text-indigo-700">{totalScore}/75</div>
                <div className="text-xs text-indigo-500 mt-0.5">External</div>
              </div>
              <div className={`rounded-xl p-3 ${combinedPassed ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className={`text-2xl font-black ${combinedPassed ? 'text-green-700' : 'text-red-600'}`}>{combinedScore}/100</div>
                <div className={`text-xs mt-0.5 ${combinedPassed ? 'text-green-500' : 'text-red-400'}`}>Combined</div>
              </div>
            </div>

            {/* Tier */}
            {tier !== 'Failed' && (
              <div className="flex justify-center">
                <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full border font-black text-base ${ts.bg} ${ts.text} ${ts.border}`}>
                  {tier} Tier
                </div>
              </div>
            )}

            {/* Pass/fail bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span className={`font-bold ${gradeColor(grade)}`}>Grade {grade} -- {percentage.toFixed(1)}% external</span>
                <span className={`font-black px-2 py-0.5 rounded-full text-xs ${combinedPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {combinedPassed ? 'PASSED' : 'FAILED'}
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden relative">
                <motion.div initial={{ width: 0 }} animate={{ width: `${combinedScore}%` }} transition={{ duration: 1 }}
                  className={`h-full rounded-full ${combinedPassed ? 'bg-green-500' : 'bg-red-400'}`} />
                <div className="absolute top-0 bottom-0 border-l-2 border-orange-500 left-[55%]" />
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>0</span><span className="font-bold text-orange-600">55 pass mark</span><span>100</span>
              </div>
            </div>

            {/* Certificate unlock */}
            {combinedPassed && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center space-y-2">
                <p className="text-green-700 font-bold text-sm flex items-center justify-center gap-2">
                  <GraduationCap className="w-4 h-4" /> Certificate Unlocked!
                </p>
                <Link href={`/language/${params.id}/certificate`}
                  className="inline-block px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-sm rounded-xl">
                  View Certificate &rarr;
                </Link>
              </div>
            )}
          </motion.div>

          {/* AI Summary */}
          {aiSummary && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
              <p className="text-xs font-black text-yellow-700 uppercase mb-2">AI Performance Summary</p>
              <p className="text-sm text-gray-700 italic leading-relaxed">{aiSummary}</p>
            </motion.div>
          )}

          {/* All attempts history */}
          {pastAttempts.length > 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
                <p className="text-xs font-black text-gray-600 uppercase tracking-wide">All Attempts ({pastAttempts.length})</p>
              </div>
              <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
                {pastAttempts.map((a, idx) => {
                  const ats = tierStyle(a.tier)
                  return (
                    <div key={idx} className="px-5 py-3 flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-gray-400 w-6">#{a.attemptNumber}</span>
                        <div>
                          <span className="font-bold text-gray-900">{a.combinedScore}/100</span>
                          <span className="text-gray-400 text-xs ml-2">{a.internalMarks}/25 + {a.externalMarks}/75</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${ats.bg} ${ats.text} ${ats.border}`}>{a.tier}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {a.passed ? 'Pass' : 'Fail'}
                        </span>
                        {a.submittedAt && <span className="text-xs text-gray-400 hidden sm:block">{a.submittedAt}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Section accordion */}
          <div className="space-y-3">
            {evalSections.map((sec, si) => (
              <motion.div key={si} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + si * 0.05 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button type="button"
                  onClick={() => setExpandedSections(prev => { const n = new Set(prev); if (n.has(si)) n.delete(si); else n.add(si); return n })}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="font-black text-gray-900">{sec.name}</span>
                    <span className="text-sm font-bold text-gray-500">{sec.score}/{sec.maxScore}</span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {sec.maxScore > 0 ? ((sec.score / sec.maxScore) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                  {expandedSections.has(si) ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                <AnimatePresence>
                  {expandedSections.has(si) && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="border-t border-gray-100 overflow-hidden">
                      <div className="divide-y divide-gray-50">
                        {sec.questions.map((eq, qi) => (
                          <div key={qi} className="p-4 space-y-2">
                            <div className="flex items-start gap-2">
                              <span className={`mt-0.5 w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-xs font-black ${eq.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                {eq.isCorrect ? '+' : 'x'}
                              </span>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-800">{eq.question}</p>
                                <div className="flex gap-2 mt-1">
                                  {eq.topic && <span className="text-xs text-gray-400">{eq.topic}</span>}
                                  {eq.difficulty && <span className={`text-xs px-1.5 rounded ${diffBg(eq.difficulty)}`}>{eq.difficulty}</span>}
                                  <span className="text-xs font-bold text-gray-500 ml-auto">{eq.marksEarned}/{eq.marks}m</span>
                                </div>
                              </div>
                            </div>
                            {eq.type === 'mcq' && eq.options && (
                              <div className="ml-7 space-y-1">
                                {(eq.options as MCQOption[]).map(opt => (
                                  <div key={opt.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${opt.id === eq.correctAnswer ? 'bg-green-50 border border-green-200 font-bold text-green-800' : opt.id === eq.studentAnswer && !eq.isCorrect ? 'bg-red-50 border border-red-200 text-red-700' : 'text-gray-500'}`}>
                                    <span className="font-bold">{opt.id.toUpperCase()}.</span> {opt.text}
                                    {opt.id === eq.correctAnswer && <span className="ml-auto font-bold text-green-600">Correct</span>}
                                    {opt.id === eq.studentAnswer && !eq.isCorrect && <span className="ml-auto font-bold text-red-500">Your answer</span>}
                                  </div>
                                ))}
                                {!eq.studentAnswer && <p className="text-xs text-gray-400 italic px-3">Not answered</p>}
                                {eq.explanation && (
                                  <div className="mt-1.5 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                                    <p className="text-xs font-bold text-blue-700 mb-0.5">Explanation</p>
                                    <p className="text-xs text-blue-800">{eq.explanation}</p>
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

        {/* Sticky bottom bar */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 shadow-lg">
          <div className="max-w-3xl mx-auto px-4 py-3 flex gap-3">
            <Link href={`/language/${params.id}`}
              className="py-2.5 px-4 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 text-center hover:bg-gray-50 shrink-0">
              &larr; Back
            </Link>
            {combinedPassed && (
              <Link href={`/language/${params.id}/certificate`}
                className="flex-1 py-2.5 bg-green-500 hover:bg-green-400 text-white font-black text-sm rounded-xl text-center flex items-center justify-center gap-2">
                <GraduationCap className="w-4 h-4" /> View Certificate
              </Link>
            )}
            <button type="button" onClick={handleRetake}
              className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-sm rounded-xl">
              Attempt Again &rarr;
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
