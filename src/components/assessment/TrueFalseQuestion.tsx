'use client'

import React from 'react'
import type { LucideProps } from 'lucide-react'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TrueFalseQuestionProps {
  selected: string | null
  correctAnswer?: string
  isSubmitted: boolean
  onChange: (val: 'true' | 'false') => void
}

export function TrueFalseQuestion({ selected, correctAnswer, isSubmitted, onChange }: TrueFalseQuestionProps) {
  const normAnswer = correctAnswer?.toLowerCase()
  const normalizedCorrect: 'true' | 'false' =
    normAnswer === 'true' || normAnswer === 'yes' ? 'true' : 'false'

  const opts: { label: string; value: 'true' | 'false'; Icon: React.FC<LucideProps> }[] = [
    { label: 'True', value: 'true', Icon: Check },
    { label: 'False', value: 'false', Icon: X },
  ]

  return (
    <div className="flex gap-4">
      {opts.map((opt) => {
        const isSelected = selected === opt.value
        const isCorrect = isSubmitted && opt.value === normalizedCorrect
        const isWrong = isSubmitted && isSelected && opt.value !== normalizedCorrect

        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => !isSubmitted && onChange(opt.value)}
            disabled={isSubmitted}
            className={cn(
              'flex-1 py-5 rounded-2xl border-2 font-bold text-lg transition-all',
              !isSubmitted && !isSelected && 'border-gray-200 text-gray-500 hover:border-yellow-300 hover:bg-yellow-50',
              !isSubmitted && isSelected && 'border-yellow-500 bg-yellow-50 text-yellow-800',
              isCorrect && 'border-green-500 bg-green-50 text-green-800',
              isWrong && 'border-red-400 bg-red-50 text-red-700',
              isSubmitted && !isCorrect && !isWrong && 'border-gray-200 text-gray-300 opacity-50'
            )}
          >
            <div className="flex flex-col items-center gap-1">
              <opt.Icon className="w-7 h-7" />
              <span className="text-base">{opt.label}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
