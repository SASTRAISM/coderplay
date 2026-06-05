'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Zap, Code2, RotateCcw, Trophy, Star, TrendingUp, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AssessmentSummaryProps {
  score: number
  totalQuestions: number
  xpEarned: number
  conceptId: string
  aiFeedback?: string
  onRetake?: () => void
}

export function AssessmentSummary({ score, totalQuestions, xpEarned, conceptId, aiFeedback, onRetake }: AssessmentSummaryProps) {
  const pct = Math.round((score / totalQuestions) * 100)
  const grade = pct >= 90 ? 'Excellent' : pct >= 70 ? 'Good' : pct >= 50 ? 'Fair' : 'Needs Practice'
  const gradeColor = pct >= 90 ? 'text-green-600' : pct >= 70 ? 'text-yellow-600' : pct >= 50 ? 'text-orange-600' : 'text-red-600'
  const EmojiIcon = pct >= 90 ? Trophy : pct >= 70 ? Star : pct >= 50 ? TrendingUp : AlertCircle
  const emojiColor = pct >= 90 ? 'text-yellow-500' : pct >= 70 ? 'text-yellow-400' : pct >= 50 ? 'text-orange-500' : 'text-red-500'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-lg mx-auto text-center space-y-6"
    >
      {/* Score circle */}
      <div className="relative w-36 h-36 mx-auto">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#f3f4f6" strokeWidth="8" />
          <motion.circle
            cx="50" cy="50" r="42" fill="none"
            stroke="#EAB308" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 42}`}
            strokeDashoffset={`${2 * Math.PI * 42 * (1 - pct / 100)}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - pct / 100) }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-gray-900">{score}</span>
          <span className="text-xs text-gray-400 font-medium">/{totalQuestions}</span>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-center"><EmojiIcon className={cn('w-12 h-12', emojiColor)} /></div>
        <h2 className="text-2xl font-black text-gray-900">Assessment Complete!</h2>
        <p className={cn('text-lg font-bold', gradeColor)}>{grade}</p>
        <p className="text-gray-500 text-sm">You scored {pct}% -- {score} out of {totalQuestions} questions correct</p>
      </div>

      {/* XP earned */}
      <div className="inline-flex items-center gap-2 bg-yellow-50 border border-yellow-200 px-5 py-2.5 rounded-full">
        <Zap className="w-4 h-4 text-yellow-600" />
        <span className="font-bold text-yellow-800">+{xpEarned} XP Earned</span>
      </div>

      {/* AI feedback */}
      {aiFeedback && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm text-gray-700 text-left leading-relaxed">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-black text-xs font-black">AI</div>
            <span className="font-semibold text-gray-800">AI Feedback</span>
          </div>
          {aiFeedback}
        </div>
      )}

      {/* Breakdown */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-green-50 border border-green-200 rounded-xl p-3">
          <div className="text-2xl font-black text-green-700">{score}</div>
          <div className="text-green-600 font-medium">Correct</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <div className="text-2xl font-black text-red-700">{totalQuestions - score}</div>
          <div className="text-red-600 font-medium">Incorrect</div>
        </div>
      </div>

      {/* CTA */}
      <div className="space-y-3">
        <Link
          href={`/learn/${conceptId}/stage3`}
          className="flex items-center justify-center gap-2 w-full py-3.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm rounded-xl transition-colors"
        >
          <Code2 className="w-4 h-4" /> Proceed to Coding Practice
        </Link>

        {/* Retake button -- always visible so students can improve their score */}
        {onRetake && (
          <button
            type="button"
            onClick={onRetake}
            className="flex items-center justify-center gap-2 w-full py-3 border-2 border-yellow-400 text-yellow-700 hover:bg-yellow-50 font-bold text-sm rounded-xl transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Retake Assessment
          </button>
        )}

        <Link
          href={`/concept/${conceptId}`}
          className="block w-full py-3 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium text-sm rounded-xl transition-colors"
        >
          Back to Concept
        </Link>
      </div>
    </motion.div>
  )
}
