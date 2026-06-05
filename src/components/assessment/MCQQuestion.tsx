'use client'

import { cn } from '@/lib/utils'
import type { MCQOption } from '@/types'

interface MCQQuestionProps {
  options: MCQOption[]
  selected: string | null
  correctAnswer?: string | string[]
  isSubmitted: boolean
  onChange: (id: string) => void
}

export function MCQQuestion({ options, selected, correctAnswer, isSubmitted, onChange }: MCQQuestionProps) {
  const correctIds = Array.isArray(correctAnswer) ? correctAnswer : (correctAnswer ? [correctAnswer] : [])

  return (
    <div className="space-y-3">
      {options.map((opt) => {
        const isSelected = selected === opt.id
        const isCorrect = isSubmitted && correctIds.includes(opt.id)
        const isWrong = isSubmitted && isSelected && !correctIds.includes(opt.id)

        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => !isSubmitted && onChange(opt.id)}
            disabled={isSubmitted}
            className={cn(
              'w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all',
              !isSubmitted && !isSelected && 'border-gray-200 text-gray-700 hover:border-yellow-300 hover:bg-yellow-50',
              !isSubmitted && isSelected && 'border-yellow-500 bg-yellow-50 text-yellow-800',
              isCorrect && 'border-green-500 bg-green-50 text-green-800',
              isWrong && 'border-red-400 bg-red-50 text-red-800',
              isSubmitted && !isCorrect && !isWrong && 'border-gray-200 text-gray-400 opacity-60'
            )}
          >
            <div className="flex items-center gap-3">
              <span className={cn(
                'w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0',
                !isSubmitted && !isSelected && 'border-gray-300 text-gray-400',
                !isSubmitted && isSelected && 'border-yellow-500 bg-yellow-500 text-white',
                isCorrect && 'border-green-500 bg-green-500 text-white',
                isWrong && 'border-red-500 bg-red-500 text-white',
              )}>
                {opt.id.toUpperCase()}
              </span>
              <span>{opt.text}</span>
              {isCorrect && <span className="ml-auto text-green-600 text-base">+</span>}
              {isWrong && <span className="ml-auto text-red-500 text-base">x</span>}
            </div>
          </button>
        )
      })}
    </div>
  )
}
