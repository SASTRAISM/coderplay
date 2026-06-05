'use client'

import { Lock, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StageProgressProps {
  currentStage?: 1 | 2 | 3
  completedStages?: number[]
  conceptId?: string
}

const stages = [
  { id: 1, label: 'Learning', description: 'Chat with your tutor to understand the concept' },
  { id: 2, label: 'Assessment', description: '15-question knowledge check' },
  { id: 3, label: 'Coding Practice', description: 'Apply with coding challenges' },
]

export function StageProgress({ currentStage, completedStages = [], conceptId }: StageProgressProps) {
  return (
    <div className="flex items-center gap-0">
      {stages.map((stage, idx) => {
        const isCompleted = completedStages.includes(stage.id)
        const isActive = currentStage === stage.id
        const isLocked = !isCompleted && stage.id > 1 && !completedStages.includes(stage.id - 1)

        return (
          <div key={stage.id} className="flex items-center flex-1">
            {/* Stage node */}
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all',
                  isCompleted ? 'bg-yellow-500 border-yellow-500 text-black shadow-sm' :
                  isActive    ? 'bg-white border-yellow-500 text-yellow-600 shadow-md ring-4 ring-yellow-100' :
                  isLocked    ? 'bg-gray-100 border-gray-200 text-gray-400' :
                                'bg-white border-gray-300 text-gray-500'
                )}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : isLocked ? <Lock className="w-4 h-4" /> : stage.id}
              </div>
              <div className="text-center px-1">
                <p className={cn('text-xs font-semibold', isActive ? 'text-gray-900' : isCompleted ? 'text-yellow-700' : 'text-gray-400')}>
                  Stage {stage.id}
                </p>
                <p className={cn('text-xs hidden sm:block mt-0.5', isActive || isCompleted ? 'text-gray-500' : 'text-gray-300')}>
                  {stage.label}
                </p>
              </div>
            </div>
            {/* Connector */}
            {idx < stages.length - 1 && (
              <div className={cn(
                'h-0.5 w-16 -mt-6 transition-colors',
                completedStages.includes(stage.id) ? 'bg-yellow-400' : 'bg-gray-200'
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}
