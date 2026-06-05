'use client'

import { cn } from '@/lib/utils'

interface FillBlankQuestionProps {
  questionText: string       // contains "___" placeholder
  value: string
  correctAnswer?: string | string[]
  isSubmitted: boolean
  onChange: (val: string) => void
}

export function FillBlankQuestion({ questionText, value, correctAnswer, isSubmitted, onChange }: FillBlankQuestionProps) {
  const answers = Array.isArray(correctAnswer) ? correctAnswer : (correctAnswer ? [correctAnswer] : [])
  // Strip surrounding spaces only, preserve internal spaces (e.g. "y = x.upper()")
  const normalise = (s: string) => s.trim().toLowerCase()
  const isCorrect = isSubmitted && answers.some(a => normalise(value) === normalise(a))
  const isWrong = isSubmitted && !isCorrect
  const displayAnswer = answers[0] ?? ''

  // Split on ___ to get [before, after]. The text may contain \n for code-style layout.
  const blankIdx = questionText.indexOf('___')
  const beforeBlank = blankIdx >= 0 ? questionText.slice(0, blankIdx) : questionText
  const afterBlank = blankIdx >= 0 ? questionText.slice(blankIdx + 3) : ''

  // Render a text segment, converting \n to <br/> tags
  const renderText = (text: string) =>
    text.split('\n').map((line, i, arr) => (
      <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
    ))

  return (
    <div className="space-y-4">
      <p className="text-base text-gray-800 font-medium leading-relaxed font-mono whitespace-pre-wrap">
        {renderText(beforeBlank)}
        <input
          type="text"
          value={value}
          onChange={(e) => !isSubmitted && onChange(e.target.value)}
          disabled={isSubmitted}
          placeholder="type here..."
          className={cn(
            'inline-block mx-2 border-b-2 bg-transparent text-base font-semibold outline-none w-32 text-center transition-colors font-sans',
            !isSubmitted && 'border-yellow-400 text-gray-800 focus:border-yellow-600',
            isCorrect && 'border-green-500 text-green-700',
            isWrong && 'border-red-400 text-red-600',
          )}
        />
        {renderText(afterBlank)}
      </p>

      {isSubmitted && (
        <div className={cn(
          'flex items-center gap-2 p-3 rounded-xl text-sm font-medium',
          isCorrect ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        )}>
          <span>{isCorrect ? '+ Correct!' : `x The correct answer is: "${displayAnswer}"`}</span>
        </div>
      )}
    </div>
  )
}
