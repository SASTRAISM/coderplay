'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, PartyPopper, BookOpen, CheckCircle2, XCircle, ClipboardList, Bot, Lock } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { APTITUDE_SUBJECTS, APTITUDE_CONCEPTS } from '@/data/aptitudeData'
import { ProctoringOverlay } from '@/components/exam/ProctoringOverlay'
import { ExamAIChat } from '@/components/exam/ExamAIChat'
import { getBackendUrl } from '@/lib/backendUrl'
import { notFound } from 'next/navigation'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { AssessmentQuestion, MCQOption } from '@/types'

interface RenderableQuestion extends AssessmentQuestion {
  pairs?: Array<{ left: string; right: string }>
  items?: string[]
}

function QuestionRenderer({
  question,
  index,
  total,
  onAnswer,
}: {
  question: RenderableQuestion
  index: number
  total: number
  onAnswer: (answer: string | string[], correct: boolean) => void
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [textAnswer, setTextAnswer] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [ordering, setOrdering] = useState<string[]>([])

  useEffect(() => {
    setSelected(null)
    setTextAnswer('')
    setShowResult(false)
    if (question.type === 'ordering' && question.items) {
      setOrdering([...question.items].sort(() => Math.random() - 0.5))
    }
  }, [question])

  const submit = (ans: string | string[]) => {
    const correct = Array.isArray(question.correctAnswer)
      ? JSON.stringify(ans) === JSON.stringify(question.correctAnswer)
      : String(ans).toLowerCase().trim() === String(question.correctAnswer).toLowerCase().trim()
    setShowResult(true)
    setTimeout(() => onAnswer(ans, correct), 2200)
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold text-gray-400">Question {index + 1} / {total}</span>
        <span className="text-xs font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
          {question.type.replace('_', ' ')} * {question.points} pt{question.points !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100 rounded-full mb-5">
        <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${((index) / total) * 100}%` }} />
      </div>

      <p className="text-base font-semibold text-gray-900 mb-5 leading-relaxed">{question.question}</p>

      {question.code && (
        <pre className="bg-gray-900 text-green-300 text-sm rounded-xl p-4 mb-5 overflow-x-auto font-mono">{question.code}</pre>
      )}

      {/* MCQ */}
      {(question.type === 'mcq' || question.type === 'code_output') && question.options && (
        <div className="space-y-2.5">
          {question.options.map((opt: MCQOption) => {
            const correctAns = String(question.correctAnswer)
            const isCorrect = showResult && opt.id === correctAns
            const isWrong = showResult && selected === opt.id && opt.id !== correctAns
            return (
              <button
                key={opt.id}
                type="button"
                disabled={showResult}
                onClick={() => { setSelected(opt.id); submit(opt.id) }}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                  isCorrect ? 'bg-green-50 border-green-400 text-green-800' :
                  isWrong ? 'bg-red-50 border-red-300 text-red-700' :
                  selected === opt.id ? 'bg-yellow-50 border-yellow-400 text-yellow-900' :
                  'border-gray-200 text-gray-700 hover:border-yellow-300 hover:bg-yellow-50'
                }`}
              >
                <span className="font-bold mr-2">{opt.id.toUpperCase()}.</span>{opt.text}
              </button>
            )
          })}
        </div>
      )}

      {/* True/False */}
      {question.type === 'true_false' && (
        <div className="flex gap-3">
          {['True', 'False'].map(v => {
            const isCorrect = showResult && v === question.correctAnswer
            const isWrong = showResult && selected === v && v !== question.correctAnswer
            return (
              <button
                key={v}
                type="button"
                disabled={showResult}
                onClick={() => { setSelected(v); submit(v) }}
                className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${
                  isCorrect ? 'bg-green-50 border-green-400 text-green-800' :
                  isWrong ? 'bg-red-50 border-red-300 text-red-700' :
                  selected === v ? 'bg-yellow-50 border-yellow-400' :
                  'border-gray-200 text-gray-700 hover:border-yellow-300'
                }`}
              >{v}</button>
            )
          })}
        </div>
      )}

      {/* Fill blank */}
      {question.type === 'fill_blank' && (
        <div className="space-y-3">
          <input
            type="text"
            value={textAnswer}
            onChange={e => setTextAnswer(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && textAnswer.trim()) { setSelected(textAnswer); submit(textAnswer) } }}
            disabled={showResult}
            placeholder="Type your answer..."
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          {!showResult && (
            <button type="button" onClick={() => { setSelected(textAnswer); submit(textAnswer) }} disabled={!textAnswer.trim()} className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-black font-bold text-sm rounded-xl transition-colors">
              Submit Answer
            </button>
          )}
        </div>
      )}

      {/* Match */}
      {question.type === 'match' && question.pairs && (
        <div className="space-y-2">
          {question.pairs.map((pair: { left: string; right: string }, i: number) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span className="flex-1 bg-blue-50 border border-blue-100 px-3 py-2 rounded-lg text-blue-800 font-medium">{pair.left}</span>
              <span className="text-gray-400">{'<->'}</span>
              <span className="flex-1 bg-purple-50 border border-purple-100 px-3 py-2 rounded-lg text-purple-800 font-medium">{pair.right}</span>
            </div>
          ))}
          {!showResult && (
            <button type="button" onClick={() => submit(question.pairs!.map((p: { left: string; right: string }) => `${p.left}-${p.right}`))} className="mt-3 px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm rounded-xl transition-colors">
              I understand the match
            </button>
          )}
        </div>
      )}

      {/* Ordering */}
      {question.type === 'ordering' && (
        <div className="space-y-2">
          {ordering.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 w-4">{i + 1}.</span>
              <span className="flex-1 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg text-sm text-gray-800">{item}</span>
            </div>
          ))}
          {!showResult && (
            <button type="button" onClick={() => submit(ordering)} className="mt-3 px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm rounded-xl transition-colors">
              Submit Order
            </button>
          )}
        </div>
      )}

      {/* Result feedback */}
      {showResult && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-4 p-4 rounded-xl text-sm ${
            String(selected || '').toLowerCase().trim() === String(question.correctAnswer).toLowerCase().trim()
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <p className="font-bold mb-1">
            {String(selected || '').toLowerCase().trim() === String(question.correctAnswer).toLowerCase().trim()
              ? <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Correct!</span>
              : <span className="flex items-center gap-1"><XCircle className="w-4 h-4" /> Incorrect -- Answer: {Array.isArray(question.correctAnswer) ? question.correctAnswer.join(', ') : question.correctAnswer}</span>}
          </p>
          <p>{question.explanation}</p>
        </motion.div>
      )}
    </div>
  )
}

export default function AptitudeStage2Client({ params }: { params: { subjectId: string; conceptId: string } }) {
  const { user } = useAuth()
  const router = useRouter()
  const subject = APTITUDE_SUBJECTS.find(s => s.id === params.subjectId)
  const allConcepts = APTITUDE_CONCEPTS[params.subjectId] || []
  const concept = allConcepts.find(c => c.id === params.conceptId)
  if (!subject || !concept) notFound()

  const [questions, setQuestions] = useState<RenderableQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Array<{ correct: boolean }>>([])
  const [done, setDone] = useState(false)
  const [aiChatOpen, setAIChatOpen] = useState(false)

  useEffect(() => {
    async function generate() {
      try {
        const res = await fetch(`${getBackendUrl()}/api/ai/generate-aptitude-questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subjectId: params.subjectId,
            subjectTitle: subject!.title,
            topic: concept!.title,
            learnerId: user?.uid || 'anon',
            variationSeed: `${user?.uid || 'anon'}_${params.conceptId}_${Date.now()}`,
            count: 30,
          }),
        })
        const data = await res.json()
        if (data.questions?.length > 0) {
          setQuestions(data.questions)
        } else {
          setError('Could not generate questions. Please try again.')
        }
      } catch {
        setError('Backend is unreachable. Make sure the server is running.')
      } finally {
        setLoading(false)
      }
    }
    generate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleViolationTerminate = useCallback(async () => {
    const score = answers.filter(a => a.correct).length
    if (user && answers.length > 0) {
      const docId = `${user.uid}_${params.subjectId}_${params.conceptId}`
      await setDoc(doc(db, 'aptitudeMCQResults', docId), {
        uid: user.uid,
        subjectId: params.subjectId,
        conceptId: params.conceptId,
        score,
        total: questions.length,
        pct: questions.length > 0 ? Math.round((score / questions.length) * 100) : 0,
        passed: false,
        completedAt: serverTimestamp(),
      }).catch(() => {})
    }
    router.push('/dashboard')
  }, [user, answers, questions.length, params.subjectId, params.conceptId, router])

  const handleAnswer = useCallback((answer: string | string[], correct: boolean) => {
    const newAnswers = [...answers, { correct }]
    setAnswers(newAnswers)
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1)
    } else {
      setDone(true)
      if (user) {
        const docId = `${user.uid}_${params.subjectId}_${params.conceptId}`
        setDoc(doc(db, 'aptitudeMCQResults', docId), {
          uid: user.uid, subjectId: params.subjectId, conceptId: params.conceptId,
          score: newAnswers.filter(a => a.correct).length,
          total: questions.length,
          pct: Math.round((newAnswers.filter(a => a.correct).length / questions.length) * 100),
          passed: Math.round((newAnswers.filter(a => a.correct).length / questions.length) * 100) >= 60,
          completedAt: serverTimestamp(),
        }).catch(() => {})
      }
    }
  }, [answers, currentIndex, questions.length, user, params.subjectId, params.conceptId])

  const score = answers.filter(a => a.correct).length
  const total = questions.length
  const pct = total > 0 ? Math.round((score / total) * 100) : 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-yellow-400 flex items-center justify-center mx-auto">
            <div className="w-7 h-7 border-4 border-black/20 border-t-black rounded-full animate-spin" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Generating 30 Questions</h2>
            <p className="text-sm text-gray-500 mt-1">Cody is creating unique aptitude questions just for you...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="flex justify-center"><AlertTriangle className="w-10 h-10 text-yellow-500" /></div>
          <h2 className="text-xl font-bold text-gray-900">Questions unavailable</h2>
          <p className="text-sm text-gray-500">{error}</p>
          <button type="button" onClick={() => window.location.reload()} className="px-6 py-2.5 bg-yellow-400 text-black font-bold text-sm rounded-xl">Try Again</button>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-5">
          <div className="flex justify-center">{pct >= 70 ? <PartyPopper className="w-12 h-12 text-yellow-500" /> : pct >= 50 ? <CheckCircle2 className="w-12 h-12 text-green-500" /> : <BookOpen className="w-12 h-12 text-gray-400" />}</div>
          <h2 className="text-2xl font-black text-gray-900">{pct >= 70 ? 'Excellent!' : pct >= 50 ? 'Good job!' : 'Keep Practicing!'}</h2>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-4xl font-black text-yellow-500">{score}/{total}</p>
            <p className="text-sm text-gray-500 mt-1">{pct}% score on {concept.title}</p>
          </div>
          <div className="flex gap-2 text-sm">
            <span className="flex-1 bg-green-50 border border-green-200 text-green-700 font-bold py-2 rounded-xl flex items-center justify-center gap-1"><CheckCircle2 className="w-4 h-4" /> {score} correct</span>
            <span className="flex-1 bg-red-50 border border-red-200 text-red-700 font-bold py-2 rounded-xl flex items-center justify-center gap-1"><XCircle className="w-4 h-4" /> {total - score} wrong</span>
          </div>
          <div className="flex flex-col gap-2.5">
            <Link href={`/aptitude/${params.subjectId}/concept/${params.conceptId}/stage1`} className="block py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-sm rounded-xl transition-colors">
              Review with AI Again
            </Link>
            <Link href={`/aptitude/${params.subjectId}`} className="block py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm rounded-xl transition-colors">
              Next Topic {'>'}
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <ProctoringOverlay scopeLabel="Aptitude MCQ Exam" onTerminate={handleViolationTerminate}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Link href={`/aptitude/${params.subjectId}`} className="text-sm text-gray-400 hover:text-gray-700">{'<- Back'}</Link>
            <div>
              <span className="text-xs font-bold text-purple-600 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 w-fit"><ClipboardList className="w-3 h-3" /> Round 2 -- MCQ Exam</span>
              <h1 className="text-sm font-bold text-gray-900 mt-0.5">{concept.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAIChatOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs font-bold rounded-full hover:bg-yellow-100 transition-colors"
            >
              <Bot className="w-3 h-3" /> Ask Cody
            </button>
            <span className="text-sm font-bold text-gray-900">{currentIndex + 1}/{questions.length}</span>
          </div>
        </div>

        {/* Proctoring notice */}
        <div className="bg-red-50 border-b border-red-100 px-4 py-2 text-center">
          <p className="text-xs font-semibold text-red-700 flex items-center justify-center gap-1"><Lock className="w-3 h-3" /> Proctored Exam -- No copy/paste, no tab switching. Violations are recorded.</p>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6">
          <AnimatePresence mode="wait">
            <motion.div key={currentIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <QuestionRenderer
                question={questions[currentIndex]}
                index={currentIndex}
                total={questions.length}
                onAnswer={handleAnswer}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <ExamAIChat
        conceptTitle={concept.title}
        conceptKeyPoints={concept.keyPoints}
        language="aptitude"
        currentQuestion={questions[currentIndex]?.question}
        isOpen={aiChatOpen}
        onClose={() => setAIChatOpen(false)}
      />
    </ProctoringOverlay>
  )
}
