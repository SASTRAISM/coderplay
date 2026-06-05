'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, GraduationCap, AlertTriangle, Monitor } from 'lucide-react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { useAuth } from '@/hooks/useAuth'
import { useProctoring } from '@/hooks/useProctoring'
import { getBackendUrl } from '@/lib/backendUrl'
import { APTITUDE_SUBJECTS, APTITUDE_CONCEPTS } from '@/data/aptitudeData'
import { notFound } from 'next/navigation'

// -- Types ----------------------------------------------------------------------

interface MCQOption { id: string; text: string }

interface ExamQuestion {
  id: string
  type: 'mcq'
  question: string
  options: MCQOption[]
  correctAnswer: string
  marks: number
  explanation: string
  topic?: string
  difficulty?: string
}

interface AptitudeExamResult {
  uid: string
  subjectId: string
  score: number
  totalMarks: number
  percentage: number
  passed: boolean
  evaluation: Evaluation
  submittedAt: unknown
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

type Phase = 'loading' | 'locked' | 'already-passed' | 'intro' | 'generating' | 'running' | 'submitting' | 'result'

// -- Helpers --------------------------------------------------------------------

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

// -- Main Component -------------------------------------------------------------

export default function AptitudeExamClient({ params }: { params: { subjectId: string } }) {
  const subject = APTITUDE_SUBJECTS.find(s => s.id === params.subjectId)
  if (!subject) notFound()

  const concepts = APTITUDE_CONCEPTS[params.subjectId] || []
  const { user, profile, loading: authLoading } = useAuth()

  const [phase, setPhase] = useState<Phase>('loading')
  const [questions, setQuestions] = useState<ExamQuestion[]>([])
  const [existingResult, setExistingResult] = useState<AptitudeExamResult | null>(null)
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)

  // Exam state
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentQIdx, setCurrentQIdx] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [submittingStep, setSubmittingStep] = useState(0)
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]))

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)
  const submitRef = useRef<(() => void) | null>(null)
  const draftKey = user ? `apt_draft_${user.uid}_${params.subjectId}` : ''

  const proctoring = useProctoring({
    enabled: phase === 'running',
    onAutoSubmit: () => submitRef.current?.(),
    requireFullscreen: true,
  })

  // Check stage1 completion and existing result
  useEffect(() => {
    if (authLoading) return
    if (!user) return

    async function checkAccess() {
      // Check if all concepts have stage1 done
      const results = await Promise.all(
        concepts.map(async (c) => {
          try {
            const snap = await getDoc(doc(db, 'aptitudeProgress', `${user!.uid}_${params.subjectId}_${c.id}`))
            if (snap.exists() && (snap.data().stepsCompleted ?? 0) >= 5) return true
          } catch { /* ignore */ }
          return false
        })
      )
      const allDone = results.every(Boolean) && concepts.length > 0

      if (!allDone) {
        setPhase('locked')
        return
      }

      // Check existing exam result
      try {
        const snap = await getDoc(doc(db, 'aptitudeExamResults', `${user!.uid}_${params.subjectId}`))
        if (snap.exists()) {
          const data = snap.data() as AptitudeExamResult
          setExistingResult(data)
          setEvaluation(data.evaluation)
          setPhase(data.passed ? 'already-passed' : 'intro')
        } else {
          setPhase('intro')
        }
      } catch {
        setPhase('intro')
      }
    }

    checkAccess()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.uid, params.subjectId])

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  // Wall-clock-driven timer (immune to tab-unfocus throttling)
  const examEndAtRef = useRef<number>(0)
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

  const handleGenerate = async () => {
    setPhase('generating')
    try {
      const res = await fetch(`${getBackendUrl()}/api/ai/generate-aptitude-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: params.subjectId,
          subjectTitle: subject!.title,
          topic: 'Comprehensive Exam',
          count: 30,
          variationSeed: `${user?.uid || 'anon'}_${params.subjectId}_exam`,
        }),
      })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data = await res.json()
      if (!data.questions?.length) throw new Error('No questions returned')

      // Convert AssessmentQuestion format to ExamQuestion format
      const examQs: ExamQuestion[] = data.questions.map((q: {
        id?: string;
        question: string;
        options?: MCQOption[];
        correctAnswer: string | string[];
        explanation: string;
        points?: number;
        marks?: number;
        topic?: string;
        difficulty?: string;
      }, i: number) => ({
        id: q.id || `q_${i}`,
        type: 'mcq' as const,
        question: q.question,
        options: (q.options || []).map((o: MCQOption) => ({ id: o.id, text: o.text })),
        correctAnswer: Array.isArray(q.correctAnswer) ? String(q.correctAnswer[0]) : String(q.correctAnswer),
        marks: q.marks || q.points || 2,
        explanation: q.explanation || '',
        topic: q.topic,
        difficulty: q.difficulty,
      }))

      if (draftKey) {
        try {
          const raw = localStorage.getItem(draftKey)
          if (raw) {
            const draft = JSON.parse(raw) as { answers?: Record<string, string>; currentQIdx?: number }
            if (draft.answers && typeof draft.answers === 'object') setAnswers(draft.answers)
            if (typeof draft.currentQIdx === 'number') setCurrentQIdx(Math.min(Math.max(0, draft.currentQIdx), examQs.length - 1))
            setToast('Restored your saved answers from this device.')
          }
        } catch { /* corrupt draft -- ignore */ }
      }

      setQuestions(examQs)
      setPhase('running')
      startTimer(60)
    } catch {
      setToast('Failed to generate exam. Please try again.')
      setPhase('intro')
    }
  }

  const handleBeginExam = async () => {
    await proctoring.enterFullscreen()
    handleGenerate()
  }

  // Double-submission guard
  const submittingRef = useRef(false)

  const handleSubmitExam = useCallback(async () => {
    if (!questions.length || !user) return
    if (submittingRef.current) return
    submittingRef.current = true

    stopTimer()
    proctoring.exitFullscreen()
    setShowSubmitModal(false)
    setPhase('submitting')
    setSubmittingStep(1)
    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000)

    // Save recovery copy
    try {
      sessionStorage.setItem(
        `apt_recovery_${user.uid}_${params.subjectId}`,
        JSON.stringify({ answers, timeTaken, ts: Date.now() })
      )
    } catch { /* quota -- ignore */ }

    await new Promise(r => setTimeout(r, 600))
    setSubmittingStep(2)

    try {
      const sectionQuestions = questions.map(q => ({
        id: q.id, type: 'mcq', question: q.question, options: q.options,
        correctAnswer: q.correctAnswer, marks: q.marks, explanation: q.explanation,
        topic: q.topic || subject!.title, difficulty: q.difficulty || 'Medium',
      }))

      // Retry up to 3 times with backoff
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
              testId: `apt_exam_${params.subjectId}`,
              sections: [{ name: subject!.title, marks: 60, questions: sectionQuestions }],
              answers,
              codingAnswers: {},
              timeTaken,
              studentName: profile?.displayName || user.displayName || 'Student',
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
      await new Promise(r => setTimeout(r, 400))

      const evalData: Evaluation = data.evaluation
      const result: AptitudeExamResult = {
        uid: user.uid,
        subjectId: params.subjectId,
        score: evalData.totalScore,
        totalMarks: evalData.maxScore,
        percentage: evalData.percentage,
        passed: evalData.passed,
        evaluation: evalData,
        submittedAt: serverTimestamp(),
      }

      await setDoc(doc(db, 'aptitudeExamResults', `${user.uid}_${params.subjectId}`), result)

      try {
        sessionStorage.removeItem(`apt_recovery_${user.uid}_${params.subjectId}`)
        if (draftKey) localStorage.removeItem(draftKey)
      } catch {}

      setEvaluation(evalData)
      setExistingResult(result)
      setSubmittingStep(4)
      await new Promise(r => setTimeout(r, 400))
      setPhase('result')
    } catch (err) {
      console.error('Aptitude eval error:', err)
      submittingRef.current = false
      setToast('Evaluation failed. Your answers are saved -- try submitting again.')
      setPhase('running')
    }
  }, [questions, user, answers, profile, params.subjectId, stopTimer, subject, proctoring, draftKey])

  useEffect(() => { submitRef.current = handleSubmitExam }, [handleSubmitExam])

  useEffect(() => {
    if (phase !== 'running' || !draftKey || !questions.length) return
    const id = window.setInterval(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ answers, currentQIdx, ts: Date.now() }))
      } catch { /* quota -- ignore */ }
    }, 5000)
    return () => window.clearInterval(id)
  }, [phase, draftKey, questions.length, answers, currentQIdx])

  const totalQ = questions.length
  const answeredCount = questions.filter(q => Boolean(answers[q.id])).length
  const currentQ = questions[currentQIdx]
  const isLowTime = timeLeft > 0 && timeLeft < 300

  const getNavColor = (idx: number) => {
    const q = questions[idx]
    if (!q) return 'bg-gray-100'
    if (answers[q.id]) return 'bg-yellow-400 text-black'
    return 'bg-white border border-gray-200 text-gray-600'
  }

  // -- LOADING ----------------------------------------------------------------
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

  // -- LOCKED ----------------------------------------------------------------
  if (phase === 'locked') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
          <div className="flex justify-center"><Lock className="w-12 h-12 text-gray-400" /></div>
          <h2 className="text-xl font-black text-gray-900">Exam Locked</h2>
          <p className="text-sm text-gray-500">
            Complete all {concepts.length} concepts&apos; AI learning first to unlock the {subject!.title} exam.
          </p>
          <Link href={`/aptitude/${params.subjectId}`} className="block w-full py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-sm rounded-xl">
            {'<-'} Back to {subject!.title}
          </Link>
        </motion.div>
      </div>
    )
  }

  // -- ALREADY PASSED ---------------------------------------------------------
  if (phase === 'already-passed' && existingResult) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-gray-50 flex items-center justify-center p-6 overflow-auto">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-5">
          <div className="flex justify-center"><GraduationCap className="w-12 h-12 text-yellow-500" /></div>
          <h2 className="text-xl font-black text-gray-900">You Passed the Exam!</h2>
          <div className={`text-4xl font-black ${gradeColor(existingResult.evaluation?.grade || '')}`}>
            {existingResult.score}/{existingResult.totalMarks}
          </div>
          <div className="flex justify-center gap-3">
            <span className="text-sm font-bold text-gray-500">{existingResult.percentage.toFixed(1)}%</span>
            <span className="text-sm font-bold text-green-600">+ PASSED</span>
          </div>
          <div className="space-y-3">
            <Link href={`/aptitude/${params.subjectId}/certificate`} className="block w-full py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-sm rounded-xl">
              <span className="flex items-center justify-center gap-1"><GraduationCap className="w-4 h-4" /> View Certificate</span>
            </Link>
            <button type="button" onClick={() => setPhase('result')} className="block w-full py-2.5 border border-gray-200 text-sm font-bold text-gray-600 rounded-xl hover:bg-gray-50">
              View Detailed Report
            </button>
            <Link href={`/aptitude/${params.subjectId}`} className="block w-full py-2.5 text-sm text-gray-400 hover:text-gray-600">
              {'<-'} Back to {subject!.title}
            </Link>
          </div>
        </motion.div>
      </div>,
      document.body
    )
  }

  // -- INTRO ------------------------------------------------------------------
  if (phase === 'intro') {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-gray-50 flex items-center justify-center p-6 overflow-auto">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{subject!.icon}</span>
            <div>
              <h2 className="text-xl font-black text-gray-900">{subject!.title} -- Final Exam</h2>
              <p className="text-sm text-gray-500">Comprehensive assessment across all concepts</p>
            </div>
          </div>

          {existingResult && !existingResult.passed && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-700">
              Previous attempt: {existingResult.score}/{existingResult.totalMarks} ({existingResult.percentage.toFixed(1)}%) -- Did not pass. You can retake.
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-xl font-black text-gray-900">60</div>
              <div className="text-xs text-gray-400">Total Marks</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-xl font-black text-gray-900">60</div>
              <div className="text-xs text-gray-400">Minutes</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-xl font-black text-gray-900">30</div>
              <div className="text-xs text-gray-400">Questions</div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1.5">
            <p className="text-xs font-black text-amber-800 uppercase tracking-wide mb-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Strict Proctoring Rules</p>
            <p className="text-xs text-amber-700">Exam opens in <strong>fullscreen</strong> -- exiting triggers violation</p>
            <p className="text-xs text-amber-700">Tab switching: <strong>1 warning, 2nd auto-submits</strong></p>
            <p className="text-xs text-amber-700">All keyboard shortcuts <strong>disabled</strong> (Esc, F-keys, Ctrl+C/V)</p>
            <p className="text-xs text-amber-700">Copy, paste, right-click are <strong>blocked</strong></p>
            <p className="text-xs text-amber-700">Timer is strict -- <strong>auto-submits</strong> at 0:00</p>
            <p className="text-xs text-amber-700">Browser back button <strong>disabled</strong> during exam</p>
            <p className="text-xs text-amber-700">Need <strong>60%</strong> to pass and unlock certificate</p>
          </div>

          <div className="flex gap-3">
            <Link href={`/aptitude/${params.subjectId}`} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 text-center hover:bg-gray-50">
              Cancel
            </Link>
            <button type="button" onClick={handleBeginExam} className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-sm rounded-xl">
              Begin Exam {'>'}
            </button>
          </div>
        </motion.div>
      </div>,
      document.body
    )
  }

  // -- GENERATING -------------------------------------------------------------
  if (phase === 'generating') {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-gray-50 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-14 h-14 mx-auto border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          <h3 className="text-lg font-black text-gray-900">Generating your exam...</h3>
          <p className="text-sm text-gray-500">AI is creating 30 questions for {subject!.title}. This takes about 20-40 seconds.</p>
        </motion.div>
      </div>,
      document.body
    )
  }

  // -- RUNNING ----------------------------------------------------------------
  if (phase === 'running' && questions.length > 0 && currentQ) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-gray-50 flex flex-col">
        <AnimatePresence>
          {toast && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-orange-500 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-bold"
              onClick={() => setToast(null)}>
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

        {showSubmitModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
              <h3 className="text-lg font-black text-gray-900 mb-2">Submit Exam?</h3>
              <p className="text-sm text-gray-500 mb-4">
                You have answered <strong>{answeredCount}/{totalQ}</strong> questions.
                {answeredCount < totalQ && <span className="text-orange-600"> {totalQ - answeredCount} unanswered.</span>}
              </p>
              <p className="text-xs text-gray-400 mb-5">You need 60% to pass and unlock your certificate.</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowSubmitModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="button" onClick={handleSubmitExam} className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-300 rounded-xl text-sm font-black text-black">Submit</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Sticky header */}
        <div className={`sticky top-0 z-30 border-b shadow-sm ${isLowTime ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
          {/* Proctoring status bar */}
          <div className={`px-4 py-1 flex items-center justify-between text-xs font-bold ${proctoring.violations > 0 ? 'bg-orange-500 text-white' : 'bg-gray-900 text-gray-300'}`}>
            <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> PROCTORED EXAM -- {subject!.title}</span>
            <span className="flex items-center gap-3">
              {proctoring.violations > 0 && <span className="text-yellow-200 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {proctoring.violations}/2 violations</span>}
              <span className="flex items-center gap-1">{proctoring.isFullscreen ? <><Monitor className="w-3 h-3" /> Fullscreen</> : <><AlertTriangle className="w-3 h-3" /> Not fullscreen</>}</span>
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 max-w-5xl mx-auto">
            <div>
              <p className="text-xs font-bold text-gray-500">{subject!.title} Final Exam</p>
              <p className="text-xs text-gray-400">Q{currentQIdx + 1}/{totalQ} . {answeredCount} answered</p>
            </div>
            <div className={`text-xl font-black tabular-nums ${isLowTime ? 'text-red-600 animate-pulse' : 'text-gray-900'}`}>{formatTime(timeLeft)}</div>
            <button type="button" onClick={() => setShowSubmitModal(true)} className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-sm rounded-xl">Submit Exam</button>
          </div>
          <div className="h-1 bg-gray-100 overflow-hidden">
            <motion.div
              className="h-full bg-yellow-400"
              animate={{ width: `${totalQ > 0 ? (answeredCount / totalQ) * 100 : 0}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Question navigator */}
        <div className="bg-white border-b border-gray-100 px-4 py-3 max-w-5xl mx-auto w-full">
          <div className="grid grid-cols-10 sm:grid-cols-15 gap-1">
            {questions.map((_, idx) => (
              <button key={idx} type="button" onClick={() => setCurrentQIdx(idx)}
                className={`h-8 text-xs font-bold rounded-lg transition-all ${getNavColor(idx)} ${currentQIdx === idx ? 'ring-2 ring-yellow-500 ring-offset-1' : ''}`}>
                {idx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Main question area */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            {currentQ.topic && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{currentQ.topic}</span>
                {currentQ.difficulty && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${diffBg(currentQ.difficulty)}`}>{currentQ.difficulty}</span>
                )}
                <span className="text-xs text-gray-400 ml-auto">{currentQ.marks} marks</span>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 select-none">
              <p className="text-xs font-bold text-gray-400 mb-1">Question {currentQIdx + 1}</p>
              <p className="text-base text-gray-900 mb-5 leading-relaxed font-medium">{currentQ.question}</p>
              <div className="space-y-2">
                {currentQ.options.map(opt => (
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
            </div>

            <div className="flex items-center justify-between mt-4">
              <button type="button" onClick={() => setCurrentQIdx(v => Math.max(0, v - 1))} disabled={currentQIdx === 0} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40">{'<-'} Prev</button>
              <button type="button" onClick={() => setCurrentQIdx(v => Math.min(totalQ - 1, v + 1))} disabled={currentQIdx === totalQ - 1} className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 rounded-xl text-sm font-bold text-black disabled:opacity-40">Next {'>'}</button>
            </div>
          </div>
        </main>
      </div>,
      document.body
    )
  }

  // -- SUBMITTING -------------------------------------------------------------
  if (phase === 'submitting') {
    const steps = ['Preparing submission...', 'Grading your answers...', 'Generating explanations...', 'Saving results...']
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-gray-50 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center space-y-5">
          <div className="w-14 h-14 mx-auto border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          <div>
            <h3 className="text-lg font-black text-gray-900">Evaluating your answers...</h3>
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
      </div>,
      document.body
    )
  }

  // -- RESULT -----------------------------------------------------------------
  if ((phase === 'result' || phase === 'already-passed') && evaluation) {
    const { totalScore, maxScore, percentage, grade, passed, sections: evalSections, aiSummary } = evaluation
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-gray-50 overflow-auto">
        <div className="max-w-3xl mx-auto p-4 lg:p-8 space-y-5">
          {/* Score card */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="text-center">
                <div className={`text-5xl font-black ${passed ? 'text-green-600' : 'text-red-500'}`}>
                  {totalScore}<span className="text-2xl text-gray-400">/{maxScore}</span>
                </div>
                <div className="text-sm text-gray-500 mt-1">{subject!.title} Exam</div>
              </div>
              <div className="flex-1 w-full">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-bold text-gray-600">{percentage.toFixed(1)}%</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xl font-black ${gradeColor(grade)}`}>Grade {grade}</span>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{passed ? 'PASSED' : 'FAILED'}</span>
                  </div>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 1 }}
                    className={`h-full rounded-full ${passed ? 'bg-green-500' : 'bg-red-400'}`} />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0</span><span className="font-bold text-orange-600">60% pass mark</span><span>100</span>
                </div>
              </div>
            </div>

            {passed && (
              <div className="mt-5 p-4 bg-green-50 border border-green-200 rounded-xl text-center">
                <p className="text-green-700 font-bold text-sm flex items-center justify-center gap-1"><GraduationCap className="w-4 h-4" /> Certificate Unlocked! Your {subject!.title} certificate is ready.</p>
                <Link href={`/aptitude/${params.subjectId}/certificate`} className="mt-3 inline-block px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-sm rounded-xl">
                  View Certificate {'>'}
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

          {/* Section accordion */}
          <div className="space-y-3">
            {evalSections.map((sec, si) => (
              <motion.div key={si} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 + si * 0.05 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button type="button" onClick={() => setExpandedSections(prev => { const n = new Set(prev); if (n.has(si)) n.delete(si); else n.add(si); return n })}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50">
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
                            {'options' in eq && eq.options && (
                              <div className="ml-7 space-y-1">
                                {(eq.options as MCQOption[]).map(opt => (
                                  <div key={opt.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${opt.id === eq.correctAnswer ? 'bg-green-50 border border-green-200 font-bold text-green-800' : opt.id === eq.studentAnswer && !eq.isCorrect ? 'bg-red-50 border border-red-200 text-red-700' : 'text-gray-500'}`}>
                                    <span className="font-bold">{opt.id.toUpperCase()}.</span> {opt.text}
                                    {opt.id === eq.correctAnswer && <span className="ml-auto font-bold text-green-600">+ Correct</span>}
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

        <div className="sticky bottom-0 bg-white border-t border-gray-100 shadow-lg">
          <div className="max-w-3xl mx-auto px-4 py-3 flex gap-3">
            <Link href={`/aptitude/${params.subjectId}`} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 text-center hover:bg-gray-50">
              {'<-'} Back to {subject!.title}
            </Link>
            {passed && (
              <Link href={`/aptitude/${params.subjectId}/certificate`} className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-sm rounded-xl text-center">
                <span className="flex items-center justify-center gap-1"><GraduationCap className="w-4 h-4" /> View Certificate</span>
              </Link>
            )}
            {!passed && (
              <button type="button" onClick={() => setPhase('intro')} className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-sm rounded-xl">
                Retake Exam {'>'}
              </button>
            )}
          </div>
        </div>
      </div>,
      document.body
    )
  }

  return null
}
