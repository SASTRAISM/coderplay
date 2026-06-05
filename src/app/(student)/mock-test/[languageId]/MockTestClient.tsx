'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { LANGUAGES } from '@/data/languages'
import { CONCEPTS } from '@/data/concepts'
import { ProctoringOverlay } from '@/components/exam/ProctoringOverlay'
import { ExamAIChat } from '@/components/exam/ExamAIChat'
import { getBackendUrl } from '@/lib/backendUrl'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { notFound } from 'next/navigation'
import type { AssessmentQuestion, MCQOption } from '@/types'

interface MockTestSection {
  name: string
  marks: number
  questions: AssessmentQuestion[]
}

interface MockTest {
  sections: MockTestSection[]
}

// Concept average score from progress (passed as prop from parent -- here stubbed 25pts)
const CONCEPT_SCORE_MARKS = 25

export default function MockTestClient({ params }: { params: { languageId: string } }) {
  const { user, profile } = useAuth()
  const router = useRouter()
  const language = LANGUAGES.find(l => l.id === params.languageId)
  if (!language) notFound()

  const concepts = CONCEPTS[params.languageId] || []
  const conceptTitles = concepts.map(c => c.title)

  const [phase, setPhase] = useState<'loading' | 'ready' | 'exam' | 'coding' | 'done' | 'failed'>('loading')
  const [test, setTest] = useState<MockTest | null>(null)
  const [error, setError] = useState('')
  const [currentSection, setCurrentSection] = useState(0)
  const [currentQ, setCurrentQ] = useState(0)
  const [mcqAnswers, setMcqAnswers] = useState<Array<{ correct: boolean; points: number }>>([])
  const [codingAnswers, setCodingAnswers] = useState<Array<{ code: string; passed: boolean; points: number }>>([])
  const [aiChatOpen, setAIChatOpen] = useState(false)
  const [attemptId] = useState(() => `mock_${user?.uid || 'anon'}_${Date.now()}`)

  // Concept score assumed at 25 marks (best-case from stage performance)
  const conceptScore = CONCEPT_SCORE_MARKS

  useEffect(() => {
    async function generate() {
      try {
        const res = await fetch(`${getBackendUrl()}/api/ai/generate-mock-test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            languageId: params.languageId,
            languageTitle: language!.title,
            conceptTitles: conceptTitles.slice(0, 10),
            learnerId: user?.uid || 'anon',
            variationSeed: `mock_${user?.uid || 'anon'}_${params.languageId}_${Date.now()}`,
          }),
        })
        const data = await res.json()
        if (data.success && data.test?.sections) {
          setTest(data.test)
          setPhase('ready')
        } else {
          setError(data.error || 'Could not generate mock test.')
          setPhase('loading')
        }
      } catch {
        setError('Backend unreachable. Make sure the server is running.')
        setPhase('loading')
      }
    }
    generate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const mcqSection = test?.sections.find(s => s.name.toLowerCase().includes('section a') || s.name.toLowerCase().includes('mcq'))
  const codingSection = test?.sections.find(s => s.name.toLowerCase().includes('section b') || s.name.toLowerCase().includes('coding'))

  const handleMCQAnswer = useCallback((isCorrect: boolean, points: number) => {
    const newAns = [...mcqAnswers, { correct: isCorrect, points: isCorrect ? points : 0 }]
    setMcqAnswers(newAns)
    if (mcqSection && currentQ < mcqSection.questions.length - 1) {
      setCurrentQ(q => q + 1)
    } else {
      if (codingSection && codingSection.questions.length > 0) {
        setPhase('coding')
        setCurrentQ(0)
      } else {
        finalize(newAns, [])
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mcqAnswers, currentQ, mcqSection, codingSection])

  const handleCodingSubmit = useCallback((code: string, passed: boolean, points: number) => {
    const newAns = [...codingAnswers, { code, passed, points: passed ? points : 0 }]
    setCodingAnswers(newAns)
    if (codingSection && currentQ < codingSection.questions.length - 1) {
      setCurrentQ(q => q + 1)
    } else {
      finalize(mcqAnswers, newAns)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codingAnswers, currentQ, codingSection, mcqAnswers])

  const handleViolationTerminate = useCallback(async () => {
    const mcqPts = mcqAnswers.reduce((a, b) => a + b.points, 0)
    const codPts = codingAnswers.reduce((a, b) => a + b.points, 0)
    if (user) {
      await setDoc(doc(db, 'mockTestResults', attemptId), {
        uid: user.uid,
        languageId: params.languageId,
        conceptScore,
        mcqScore: mcqPts,
        codingScore: codPts,
        total: conceptScore + mcqPts + codPts,
        passed: false,
        completedAt: serverTimestamp(),
      }).catch(() => {})
    }
    router.push('/dashboard')
  }, [user, mcqAnswers, codingAnswers, conceptScore, params.languageId, attemptId, router])

  const finalize = async (mcq: typeof mcqAnswers, coding: typeof codingAnswers) => {
    const mcqScore = mcq.reduce((a, b) => a + b.points, 0)
    const codingScore = coding.reduce((a, b) => a + b.points, 0)
    const total = conceptScore + mcqScore + codingScore

    if (user) {
      await setDoc(doc(db, 'mockTestResults', attemptId), {
        uid: user.uid,
        languageId: params.languageId,
        conceptScore,
        mcqScore,
        codingScore,
        total,
        passed: total >= 50,
        completedAt: serverTimestamp(),
      }).catch(() => { /* non-critical */ })
    }

    setPhase(total >= 50 ? 'done' : 'failed')
  }

  const mcqScore = mcqAnswers.reduce((a, b) => a + b.points, 0)
  const codingScore = codingAnswers.reduce((a, b) => a + b.points, 0)
  const total = conceptScore + mcqScore + codingScore

  // -- Loading state ------------------------------------------------------------
  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        {error ? (
          <div className="text-center space-y-4 max-w-sm">
            <div className="text-4xl">[!]</div>
            <h2 className="text-xl font-bold text-gray-900">Cannot load mock test</h2>
            <p className="text-sm text-gray-500">{error}</p>
            <button type="button" onClick={() => window.location.reload()} className="px-6 py-2.5 bg-yellow-400 text-black font-bold text-sm rounded-xl">Try Again</button>
          </div>
        ) : (
          <div className="text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-yellow-400 flex items-center justify-center mx-auto">
              <div className="w-7 h-7 border-4 border-black/20 border-t-black rounded-full animate-spin" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Generating Your Mock Test</h2>
            <p className="text-sm text-gray-500">Cody is crafting a unique 100-mark test covering all {language.title} concepts...</p>
          </div>
        )}
      </div>
    )
  }

  // -- Ready / briefing ---------------------------------------------------------
  if (phase === 'ready' && test) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full space-y-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">{language.title} Final Mock Test</h1>
            <p className="text-sm text-gray-500 mt-1">Complete this to unlock your certificate</p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-2 text-sm">
            {[
              { label: 'Total Marks', value: '100 marks' },
              { label: 'Concept Score (25)', value: `${conceptScore}/25 (from your stage performance)` },
              { label: 'MCQ Round (50)', value: `${mcqSection?.questions.length || 0} questions` },
              { label: 'Coding Round (25)', value: `${codingSection?.questions.length || 0} challenges` },
              { label: 'Pass Mark', value: '>= 50 marks' },
            ].map(item => (
              <div key={item.label} className="flex justify-between">
                <span className="text-gray-600">{item.label}</span>
                <span className="font-bold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>

          <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-700 font-semibold">
            [lock] Proctored -- No copy/paste, no tab switching. Violations are recorded.
          </div>

          <button
            type="button"
            onClick={() => { setPhase('exam'); setCurrentQ(0) }}
            className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-base rounded-xl transition-colors"
          >
            Start Mock Test &rarr;</button>
        </motion.div>
      </div>
    )
  }

  // -- MCQ Exam -----------------------------------------------------------------
  if (phase === 'exam' && mcqSection) {
    const q = mcqSection.questions[currentQ] as AssessmentQuestion & { options?: MCQOption[] }
    return (
      <ProctoringOverlay scopeLabel="Mock Test" onTerminate={handleViolationTerminate}>
        <div className="min-h-screen bg-gray-50">
          <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
            <div>
              <span className="text-xs font-bold text-gray-500">Section A -- MCQ</span>
              <h1 className="text-sm font-bold text-gray-900">{language.title} Mock Test</h1>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setAIChatOpen(true)} className="text-xs font-bold text-yellow-700 bg-yellow-50 border border-yellow-200 px-3 py-1.5 rounded-full hover:bg-yellow-100">[bot] Ask Cody</button>
              <span className="text-sm font-bold">{currentQ + 1}/{mcqSection.questions.length}</span>
            </div>
          </div>
          <div className="max-w-2xl mx-auto px-4 py-6">
            <InlineMCQ q={q} index={currentQ} total={mcqSection.questions.length} onAnswer={(correct) => handleMCQAnswer(correct, q.points || 2)} />
          </div>
        </div>
        <ExamAIChat conceptTitle={language.title} conceptKeyPoints={[]} language={params.languageId} currentQuestion={q?.question} isOpen={aiChatOpen} onClose={() => setAIChatOpen(false)} />
      </ProctoringOverlay>
    )
  }

  // -- Coding Round -------------------------------------------------------------
  if (phase === 'coding' && codingSection) {
    const q = codingSection.questions[currentQ] as AssessmentQuestion
    return (
      <ProctoringOverlay scopeLabel="Mock Test Coding" onTerminate={handleViolationTerminate}>
        <div className="min-h-screen bg-gray-50">
          <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
            <div>
              <span className="text-xs font-bold text-gray-500">Section B -- Coding</span>
              <h1 className="text-sm font-bold text-gray-900">{language.title} Mock Test</h1>
            </div>
            <span className="text-sm font-bold">{currentQ + 1}/{codingSection.questions.length}</span>
          </div>
          <div className="max-w-2xl mx-auto px-4 py-6">
            <CodingQuestion q={q} index={currentQ} onSubmit={(code, passed) => handleCodingSubmit(code, passed, q.points || 10)} />
          </div>
        </div>
      </ProctoringOverlay>
    )
  }

  // -- Results ------------------------------------------------------------------
  if (phase === 'done' || phase === 'failed') {
    const passed = phase === 'done'
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-5">
          <div className="text-6xl">{passed ? '[trophy]' : '[books]'}</div>
          <h2 className="text-2xl font-black text-gray-900">{passed ? 'Congratulations!' : 'Keep Practicing!'}</h2>
          <p className="text-gray-500 text-sm">{passed ? 'You passed the mock test. Your certificate is now unlocked!' : 'You need 50+ marks to pass. Review the concepts and try again.'}</p>

          <div className="bg-gray-50 rounded-xl p-5 space-y-2 text-sm">
            {[
              { label: 'Concept Score', value: `${conceptScore}/25` },
              { label: 'MCQ Score', value: `${mcqScore}/${mcqSection?.marks || 50}` },
              { label: 'Coding Score', value: `${codingScore}/${codingSection?.marks || 25}` },
              { label: 'Total Score', value: `${total}/100`, bold: true },
              { label: 'Result', value: passed ? '[ok] PASS' : '[x] FAIL', bold: true },
            ].map(item => (
              <div key={item.label} className={`flex justify-between ${item.bold ? 'border-t border-gray-100 pt-2 font-black text-base' : ''}`}>
                <span className="text-gray-600">{item.label}</span>
                <span className={`font-bold ${item.label === 'Result' ? (passed ? 'text-green-600' : 'text-red-600') : 'text-gray-900'}`}>{item.value}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2.5">
            {passed ? (
              <Link href={`/language/${params.languageId}/certificate`} className="block py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-sm rounded-xl transition-colors">
                [cap] Get Certificate &rarr;</Link>
            ) : (
              <button type="button" onClick={() => window.location.reload()} className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-sm rounded-xl transition-colors">
                Retake Mock Test &rarr;</button>
            )}
            <Link href={`/language/${params.languageId}`} className="block py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm rounded-xl transition-colors">
              Back to {language.title}
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  return null
}

// -- Inline MCQ component -----------------------------------------------------
function InlineMCQ({ q, index, total, onAnswer }: { q: AssessmentQuestion & { options?: MCQOption[] }; index: number; total: number; onAnswer: (correct: boolean) => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [textAns, setTextAns] = useState('')
  const [showResult, setShowResult] = useState(false)

  useEffect(() => { setSelected(null); setTextAns(''); setShowResult(false) }, [q])

  const submit = (ans: string) => {
    setSelected(ans)
    const correct = ans.toLowerCase().trim() === String(q.correctAnswer).toLowerCase().trim()
    setShowResult(true)
    setTimeout(() => onAnswer(correct), 2000)
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-5">
      <div className="flex justify-between text-xs text-gray-400">
        <span>Q{index + 1} of {total}</span>
        <span className="capitalize">{q.type.replace('_', ' ')} - {q.points} pt{q.points !== 1 ? 's' : ''}</span>
      </div>
      <div className="h-1 bg-gray-100 rounded-full"><div className="h-full bg-yellow-400 rounded-full" style={{ width: `${(index / total) * 100}%` }} /></div>
      <p className="text-base font-semibold text-gray-900 leading-relaxed">{q.question}</p>
      {q.code && <pre className="bg-gray-900 text-green-300 text-sm rounded-xl p-4 overflow-x-auto font-mono">{q.code}</pre>}

      {q.type === 'true_false' && (
        <div className="flex gap-3">
          {['True', 'False'].map(v => (
            <button key={v} type="button" disabled={showResult} onClick={() => submit(v)}
              className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${showResult && v === q.correctAnswer ? 'bg-green-50 border-green-400 text-green-800' : showResult && selected === v ? 'bg-red-50 border-red-300 text-red-700' : selected === v ? 'bg-yellow-50 border-yellow-400' : 'border-gray-200 hover:border-yellow-300'}`}
            >{v}</button>
          ))}
        </div>
      )}

      {(q.type === 'mcq' || q.type === 'code_output') && q.options && (
        <div className="space-y-2.5">
          {q.options.map((opt: MCQOption) => (
            <button key={opt.id} type="button" disabled={showResult} onClick={() => submit(opt.id)}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${showResult && opt.id === String(q.correctAnswer) ? 'bg-green-50 border-green-400 text-green-800' : showResult && selected === opt.id ? 'bg-red-50 border-red-300 text-red-700' : selected === opt.id ? 'bg-yellow-50 border-yellow-400' : 'border-gray-200 hover:border-yellow-300 hover:bg-yellow-50'}`}
            ><span className="font-bold mr-2">{opt.id.toUpperCase()}.</span>{opt.text}</button>
          ))}
        </div>
      )}

      {q.type === 'fill_blank' && (
        <div className="space-y-3">
          <input type="text" value={textAns} onChange={e => setTextAns(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && textAns.trim()) submit(textAns) }} disabled={showResult} placeholder="Your answer..." className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          {!showResult && <button type="button" disabled={!textAns.trim()} onClick={() => submit(textAns)} className="px-6 py-2.5 bg-yellow-400 text-black font-bold text-sm rounded-xl disabled:opacity-40">Submit</button>}
        </div>
      )}

      {showResult && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`p-4 rounded-xl text-sm ${selected?.toLowerCase().trim() === String(q.correctAnswer).toLowerCase().trim() ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
          <p className="font-bold mb-1">{selected?.toLowerCase().trim() === String(q.correctAnswer).toLowerCase().trim() ? '[ok] Correct!' : `[x] Answer: ${q.correctAnswer}`}</p>
          <p>{q.explanation}</p>
        </motion.div>
      )}
    </div>
  )
}

// -- Simple coding challenge component ----------------------------------------
function CodingQuestion({ q, index, onSubmit }: { q: AssessmentQuestion; index: number; onSubmit: (code: string, passed: boolean) => void }) {
  const [code, setCode] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => { setCode(''); setSubmitted(false) }, [q])

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-5">
      <div className="flex justify-between text-xs text-gray-400">
        <span>Coding Q{index + 1}</span>
        <span>{q.points} marks</span>
      </div>
      <h3 className="text-base font-bold text-gray-900">{q.question}</h3>
      <div className="text-sm text-gray-500 space-y-1">
        <p><strong>Input:</strong> {(q as AssessmentQuestion & { inputFormat?: string }).inputFormat}</p>
        <p><strong>Output:</strong> {(q as AssessmentQuestion & { outputFormat?: string }).outputFormat}</p>
      </div>
      {(q as AssessmentQuestion & { examples?: Array<{ input: string; output: string }> }).examples?.map((ex: { input: string; output: string }, i: number) => (
        <div key={i} className="bg-gray-50 rounded-xl p-3 text-xs font-mono">
          <p className="text-gray-500">Input: {ex.input}</p>
          <p className="text-gray-500">Output: {ex.output}</p>
        </div>
      ))}
      <textarea value={code} onChange={e => setCode(e.target.value)} disabled={submitted} rows={10} placeholder="Write your code here..." className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-y" />
      {!submitted && (
        <div className="flex gap-3">
          <button type="button" disabled={!code.trim()} onClick={() => { setSubmitted(true); onSubmit(code, code.trim().length > 20) }} className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-black font-bold text-sm rounded-xl transition-colors">
            Submit Solution
          </button>
          <button type="button" onClick={() => onSubmit('', false)} className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm rounded-xl transition-colors">
            Skip
          </button>
        </div>
      )}
      {submitted && <p className="text-sm text-green-700 font-semibold">[ok] Solution submitted!</p>}
    </div>
  )
}