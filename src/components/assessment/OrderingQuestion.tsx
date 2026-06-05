'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronUp, ChevronDown, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OrderingQuestionProps {
  items: string[]
  correctAnswer: string[]
  isSubmitted: boolean
  onOrderChange: (ordered: string[]) => void
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function OrderingQuestion({ items, correctAnswer, isSubmitted, onOrderChange }: OrderingQuestionProps) {
  const [ordered, setOrdered] = useState<string[]>(() => shuffle(items))
  const dragIndexRef = useRef<number | null>(null)
  const dragOverIndexRef = useRef<number | null>(null)

  useEffect(() => {
    onOrderChange(ordered)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const move = (index: number, direction: -1 | 1) => {
    if (isSubmitted) return
    const next = [...ordered]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setOrdered(next)
    onOrderChange(next)
  }

  const handleDragStart = (index: number) => {
    dragIndexRef.current = index
  }

  const handleDragEnter = (index: number) => {
    dragOverIndexRef.current = index
  }

  const handleDragEnd = () => {
    const from = dragIndexRef.current
    const to = dragOverIndexRef.current
    if (from === null || to === null || from === to) {
      dragIndexRef.current = null
      dragOverIndexRef.current = null
      return
    }
    const next = [...ordered]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setOrdered(next)
    onOrderChange(next)
    dragIndexRef.current = null
    dragOverIndexRef.current = null
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 font-medium mb-3">
        Drag items or use arrows to arrange in the correct order.
      </p>
      {ordered.map((item, i) => {
        const isCorrectPos = isSubmitted && correctAnswer[i] === item
        const isWrongPos = isSubmitted && correctAnswer[i] !== item
        return (
          <motion.div
            key={item}
            layout
            transition={{ duration: 0.15 }}
            draggable={!isSubmitted}
            onDragStart={() => handleDragStart(i)}
            onDragEnter={() => handleDragEnter(i)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl border text-sm font-medium transition-colors select-none',
              isSubmitted
                ? isCorrectPos
                  ? 'bg-green-50 border-green-300 text-green-800'
                  : isWrongPos
                  ? 'bg-red-50 border-red-300 text-red-800'
                  : 'bg-white border-gray-200 text-gray-800'
                : 'bg-white border-gray-200 text-gray-800 hover:border-yellow-300 cursor-grab active:cursor-grabbing'
            )}
          >
            {!isSubmitted && (
              <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
            )}
            <span className="w-6 h-6 rounded-full bg-yellow-100 text-yellow-800 text-xs font-black flex items-center justify-center shrink-0">
              {i + 1}
            </span>
            <span className="flex-1 font-mono text-sm">{item}</span>
            {!isSubmitted && (
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  type="button"
                  title="Move up"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Move down"
                  onClick={() => move(i, 1)}
                  disabled={i === ordered.length - 1}
                  className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}
            {isSubmitted && (
              <span className={cn('text-sm font-bold shrink-0', isCorrectPos ? 'text-green-600' : 'text-red-500')}>
                {isCorrectPos ? '+' : 'x'}
              </span>
            )}
          </motion.div>
        )
      })}
      {isSubmitted && (
        <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-xs text-gray-500 font-semibold mb-1">Correct order:</p>
          {correctAnswer.map((item, i) => (
            <p key={i} className="text-xs text-gray-700 font-mono">
              <span className="text-yellow-600 font-bold">{i + 1}.</span> {item}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
