'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number           // 0-100
  showLabel?: boolean
  label?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  color?: 'yellow' | 'green' | 'blue' | 'red'
  className?: string
  animate?: boolean
}

const sizeMap = { xs: 'h-1', sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' }
const colorMap = {
  yellow: 'bg-yellow-500',
  green:  'bg-green-500',
  blue:   'bg-blue-500',
  red:    'bg-red-500',
}

export function ProgressBar({
  value,
  showLabel = false,
  label,
  size = 'md',
  color = 'yellow',
  className,
  animate = true,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value))

  return (
    <div className={cn('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-medium text-gray-600">{label}</span>
          <span className="text-xs font-semibold text-gray-800">{pct}%</span>
        </div>
      )}
      <div className={cn('w-full bg-gray-100 rounded-full overflow-hidden', sizeMap[size])}>
        {animate ? (
          <motion.div
            className={cn('h-full rounded-full', colorMap[color])}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
          />
        ) : (
          <div
            className={cn('h-full rounded-full transition-all duration-700', colorMap[color])}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  )
}
