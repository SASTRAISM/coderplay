'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface Pair { left: string; right: string }

interface MatchQuestionProps {
  pairs: Pair[]
  correctAnswer: string[]   // right-side values in correct left-to-right order
  isSubmitted: boolean
  onMatchChange: (matches: string[]) => void
}

export function MatchQuestion({ pairs, correctAnswer, isSubmitted, onMatchChange }: MatchQuestionProps) {
  // matches[i] = the right-side value the user picked for left[i]
  const [matches, setMatches] = useState<(string | null)[]>(Array(pairs.length).fill(null))
  const rightOptions = pairs.map((p) => p.right)

  const pick = (leftIndex: number, rightValue: string) => {
    if (isSubmitted) return
    const next = [...matches]
    // Unset any other left that had this right value
    for (let i = 0; i < next.length; i++) {
      if (next[i] === rightValue) next[i] = null
    }
    next[leftIndex] = rightValue
    setMatches(next)
    onMatchChange(next.map((v) => v ?? ''))
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 font-medium">
        Select the correct match for each item on the left.
      </p>
      {pairs.map((pair, i) => {
        const chosen = matches[i]
        const isCorrect = isSubmitted && chosen === correctAnswer[i]
        const isWrong = isSubmitted && chosen !== correctAnswer[i]

        return (
          <div key={pair.left} className="flex items-start gap-3">
            {/* Left item */}
            <div className={cn(
              'flex-1 min-w-0 p-3 rounded-xl border text-sm font-mono font-medium',
              isSubmitted
                ? isCorrect ? 'bg-green-50 border-green-300 text-green-800'
                : 'bg-red-50 border-red-300 text-red-800'
                : 'bg-gray-50 border-gray-200 text-gray-800'
            )}>
              {pair.left}
            </div>

            {/* Arrow */}
            <div className="text-gray-400 pt-3 text-sm shrink-0">{'->'}</div>

            {/* Right choices */}
            <div className="flex-1 flex flex-wrap gap-2">
              {rightOptions.map((opt) => {
                const isSelected = chosen === opt
                const isUsedElsewhere = !isSelected && matches.includes(opt)
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={isSubmitted}
                    onClick={() => pick(i, opt)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                      isSubmitted && isSelected
                        ? isCorrect
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'bg-red-400 border-red-400 text-white'
                        : isSelected
                        ? 'bg-yellow-500 border-yellow-500 text-black'
                        : isUsedElsewhere
                        ? 'bg-gray-100 border-gray-200 text-gray-400 opacity-60'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-yellow-400 hover:bg-yellow-50'
                    )}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>

            {isSubmitted && (
              <span className="text-lg pt-2 shrink-0">{isCorrect ? '+' : 'x'}</span>
            )}
          </div>
        )
      })}

      {isSubmitted && (
        <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-xs text-gray-500 font-semibold mb-1">Correct matches:</p>
          {pairs.map((pair, i) => (
            <p key={i} className="text-xs text-gray-700">
              <span className="font-mono">{pair.left}</span>
              <span className="text-gray-400 mx-1">{'->'}</span>
              <span className="font-semibold text-gray-800">{correctAnswer[i]}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
