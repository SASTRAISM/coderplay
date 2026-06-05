'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { Badge } from '@/components/shared/Badge'
import { MCQQuestion } from './MCQQuestion'
import { TrueFalseQuestion } from './TrueFalseQuestion'
import { FillBlankQuestion } from './FillBlankQuestion'
import { OrderingQuestion } from './OrderingQuestion'
import { MatchQuestion } from './MatchQuestion'
import { Pin, PartyPopper, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AssessmentQuestion } from '@/types'

// SafeQuestion: same as AssessmentQuestion but correctAnswer is replaced by answerToken
export type SafeQuestion = Omit<AssessmentQuestion, 'correctAnswer'> & {
  answerToken?: string
  // correctAnswer may still be present locally when server-check is unavailable (fallback)
  correctAnswer?: string | string[]
}

interface QuestionCardProps {
  question: SafeQuestion
  questionNumber: number
  totalQuestions: number
  // onCheckAnswer: sends answer to backend, returns { correct, correctAnswer }
  onCheckAnswer: (answer: string | string[]) => Promise<{ correct: boolean; correctAnswer?: string | string[] }>
  onAnswer: (answer: string | string[], isCorrect: boolean) => void
  onNext?: () => void
  isLastQuestion?: boolean
}

const typeLabels: Record<string, string> = {
  mcq: 'Multiple Choice',
  true_false: 'True / False',
  fill_blank: 'Fill in the Blank',
  code_output: 'Code Output',
  identify_error: 'Identify the Error',
  match: 'Match the Following',
  scenario: 'Scenario Based',
  ordering: 'Ordering',
}

function extractCodeFromText(text: string): { questionText: string; code: string | null } {
  const match = text.match(/```[\w]*\n?([\s\S]*?)```/)
  if (!match) return { questionText: text, code: null }
  const code = match[1].trim()
  const questionText = text.replace(/```[\w]*\n?[\s\S]*?```/, '').trim()
  return { questionText, code }
}

function playTone(correct: boolean) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    if (correct) {
      osc.frequency.setValueAtTime(523, ctx.currentTime)
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1)
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2)
    } else {
      osc.frequency.setValueAtTime(330, ctx.currentTime)
      osc.frequency.setValueAtTime(277, ctx.currentTime + 0.15)
    }
    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.45)
  } catch { /* audio not supported */ }
}

export function QuestionCard({ question, questionNumber, totalQuestions, onCheckAnswer, onAnswer, onNext, isLastQuestion }: QuestionCardProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [fillValue, setFillValue] = useState('')
  const [orderedItems, setOrderedItems] = useState<string[]>([])
  const [matchedItems, setMatchedItems] = useState<string[]>([])
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [revealedAnswer, setRevealedAnswer] = useState<string | string[] | undefined>(undefined)
  const [showNext, setShowNext] = useState(false)
  const [nextReady, setNextReady] = useState(false)

  const handleSubmit = async () => {
    if (isChecking || isSubmitted) return
    let answer: string | string[] = ''

    if (question.type === 'fill_blank') {
      answer = fillValue
    } else if (question.type === 'ordering') {
      answer = orderedItems
    } else if (question.type === 'match') {
      answer = matchedItems
    } else {
      answer = selected || ''
    }

    setIsChecking(true)
    try {
      const result = await onCheckAnswer(answer)
      setIsCorrect(result.correct)
      // revealedAnswer comes from backend after submission -- safe to show now
      setRevealedAnswer(result.correctAnswer)
      setIsSubmitted(true)
      setShowNext(true)
      setNextReady(false)
      playTone(result.correct)
      onAnswer(answer, result.correct)
      setTimeout(() => setNextReady(true), 2500)
    } finally {
      setIsChecking(false)
    }
  }

  const hasAnswer =
    question.type === 'fill_blank' ? fillValue.trim().length > 0
    : question.type === 'ordering' ? orderedItems.length > 0
    : question.type === 'match' ? (matchedItems.length > 0 && matchedItems.length === (question.pairs?.length ?? 0) && matchedItems.every(v => v !== ''))
    : selected !== null

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between mb-2">
          <Badge label={typeLabels[question.type] || question.type} variant="stage" />
          <span className="text-sm text-gray-500 font-medium">
            Question {questionNumber} of {totalQuestions}
          </span>
        </div>
        <ProgressBar value={(questionNumber / totalQuestions) * 100} size="xs" />
      </div>

      <div className="p-6 space-y-5">
        {/* Question */}
        {question.type !== 'fill_blank' && (() => {
          const needsCode = question.type === 'code_output' || question.type === 'identify_error'
          const extracted = needsCode && !question.code
            ? extractCodeFromText(question.question)
            : { questionText: question.question, code: question.code ?? null }
          const displayCode = extracted.code
          return (
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
              <p className="text-xs font-bold text-yellow-700 uppercase tracking-wide mb-2"><Pin className="w-3 h-3 inline-block align-middle mr-1" />Question {questionNumber}</p>
              <h2 className="text-base font-black text-gray-900 leading-snug">{extracted.questionText}</h2>
              {displayCode && (
                <pre className="mt-3 text-sm bg-gray-950 text-green-400 rounded-xl p-4 overflow-x-auto font-mono leading-6">
                  <code>{displayCode}</code>
                </pre>
              )}
            </div>
          )
        })()}

        {question.type === 'fill_blank' && (
          <div className="bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-2">
            <p className="text-xs font-bold text-yellow-700 uppercase tracking-wide"><Pin className="w-3 h-3 inline-block align-middle mr-1" />Question {questionNumber}</p>
          </div>
        )}

        {/* Answer input -- pass revealedAnswer (from backend) for highlighting after submission */}
        {question.type === 'mcq' && question.options && (
          <MCQQuestion
            options={question.options}
            selected={selected}
            correctAnswer={isSubmitted ? revealedAnswer as string | string[] : undefined}
            isSubmitted={isSubmitted}
            onChange={setSelected}
          />
        )}
        {question.type === 'true_false' && (
          <TrueFalseQuestion
            selected={selected}
            correctAnswer={isSubmitted ? String(revealedAnswer ?? '') : ''}
            isSubmitted={isSubmitted}
            onChange={(v) => setSelected(v)}
          />
        )}
        {question.type === 'fill_blank' && (
          <FillBlankQuestion
            questionText={question.question}
            value={fillValue}
            correctAnswer={isSubmitted ? (Array.isArray(revealedAnswer) ? revealedAnswer : (revealedAnswer ? [String(revealedAnswer)] : [])) : []}
            isSubmitted={isSubmitted}
            onChange={setFillValue}
          />
        )}
        {(question.type === 'code_output' || question.type === 'identify_error') && question.options && (
          <MCQQuestion
            options={question.options}
            selected={selected}
            correctAnswer={isSubmitted ? revealedAnswer as string | string[] : undefined}
            isSubmitted={isSubmitted}
            onChange={setSelected}
          />
        )}
        {question.type === 'scenario' && question.options && (
          <MCQQuestion
            options={question.options}
            selected={selected}
            correctAnswer={isSubmitted ? revealedAnswer as string | string[] : undefined}
            isSubmitted={isSubmitted}
            onChange={setSelected}
          />
        )}
        {question.type === 'ordering' && question.items && (
          <OrderingQuestion
            items={question.items}
            correctAnswer={isSubmitted ? revealedAnswer as string[] : []}
            isSubmitted={isSubmitted}
            onOrderChange={setOrderedItems}
          />
        )}
        {question.type === 'match' && question.pairs && (
          <MatchQuestion
            pairs={question.pairs}
            correctAnswer={isSubmitted ? revealedAnswer as string[] : []}
            isSubmitted={isSubmitted}
            onMatchChange={setMatchedItems}
          />
        )}

        {/* Explanation -- shown only after submission */}
        <AnimatePresence>
          {isSubmitted && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'p-4 rounded-xl border text-sm',
                isCorrect ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
              )}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg">{isCorrect ? <PartyPopper className="w-5 h-5" /> : <Lightbulb className="w-5 h-5" />}</span>
                <div>
                  <p className={cn('font-semibold mb-1', isCorrect ? 'text-green-800' : 'text-orange-800')}>
                    {isCorrect ? "Excellent! That's correct." : "Not quite right -- here's the explanation:"}
                  </p>
                  {question.explanation && (
                    <p className={cn(isCorrect ? 'text-green-700' : 'text-orange-700')}>{question.explanation}</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <div className="flex justify-between items-center gap-3 pt-2">
          {isSubmitted && (
            <span className="font-medium text-yellow-600 text-sm">+{question.points} XP earned</span>
          )}
          <div className="flex gap-2 ml-auto">
            {!isSubmitted ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!hasAnswer || isChecking}
                className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold text-sm rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isChecking ? 'Checking...' : 'Submit Answer'}
              </button>
            ) : (
              <button
                type="button"
                onClick={onNext}
                disabled={!nextReady}
                className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLastQuestion ? 'View Results' : 'Next Question'} {nextReady ? '>' : '...'}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
