'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import { Badge } from '@/components/shared/Badge'
import { cn } from '@/lib/utils'
import type { Concept } from '@/types'

interface ConceptCardProps {
  concept: Concept
  stagesCompleted?: number[]
  locked?: boolean
  index?: number
}

export function ConceptCard({ concept, stagesCompleted = [], locked = false, index = 0 }: ConceptCardProps) {
  const isCompleted = stagesCompleted.includes(1) && stagesCompleted.includes(2) && stagesCompleted.includes(3)
  const isInProgress = stagesCompleted.length > 0 && !isCompleted

  const diffVariant =
    concept.difficulty === 'Beginner' ? 'beginner' :
    concept.difficulty === 'Intermediate' ? 'intermediate' : 'advanced'

  const cardContent = (
    <div className="flex items-center gap-4">
      {/* Order number / status */}
      <div className={cn(
        'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
        isCompleted ? 'bg-green-500 text-white' : locked ? 'bg-gray-200 text-gray-400' : 'bg-yellow-100 text-yellow-700'
      )}>
        {isCompleted ? '?' : locked ? <Lock className="w-4 h-4" /> : concept.order}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className={cn('font-semibold text-sm', locked ? 'text-gray-400' : 'text-gray-900')}>
            {concept.title}
          </h3>
          <Badge label={concept.difficulty} variant={diffVariant} />
          {isInProgress && <Badge label="In Progress" variant="new" />}
          {isCompleted && <Badge label="Completed" variant="achievement" />}
        </div>
        <p className={cn('text-xs mt-0.5 line-clamp-1', locked ? 'text-gray-400' : 'text-gray-500')}>
          {concept.description}
        </p>
      </div>

      {/* Stages + time + arrow */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex gap-1">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold',
                  stagesCompleted.includes(s)
                    ? 'bg-yellow-500 text-black'
                    : 'bg-gray-100 text-gray-400'
                )}
              >
                {s}
              </div>
            ))}
          </div>
          <span className="text-xs text-gray-400">{concept.estimatedTime}m</span>
        </div>
        {!locked && (
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5"
            className={cn('transition-colors', isCompleted ? 'text-green-400' : 'text-gray-300 group-hover:text-yellow-500')}
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        )}
      </div>
    </div>
  )

  if (locked) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.04 }}
        className="group p-4 rounded-xl border bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed"
      >
        {cardContent}
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
    >
      <Link
        href={`/concept/${concept.id}`}
        className={cn(
          'group flex flex-col p-4 rounded-xl border transition-all',
          isCompleted
            ? 'bg-green-50 border-green-200 hover:border-green-400 hover:shadow-sm'
            : 'bg-white border-gray-100 hover:border-yellow-300 hover:shadow-sm'
        )}
      >
        {cardContent}
      </Link>
    </motion.div>
  )
}