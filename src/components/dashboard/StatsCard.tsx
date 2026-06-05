'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  label: string
  value: string | number
  icon: ReactNode
  subtitle?: string
  highlight?: boolean
  delay?: number
}

export function StatsCard({ label, value, icon, subtitle, highlight = false, delay = 0 }: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        'p-5 rounded-2xl border transition-all',
        highlight
          ? 'bg-yellow-500 border-yellow-500 text-black'
          : 'bg-white border-gray-100 hover:border-yellow-200 hover:shadow-md'
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="flex items-center">{icon}</span>
        <span className={cn(
          'text-xs font-medium px-2 py-0.5 rounded-full',
          highlight ? 'bg-yellow-400 text-black' : 'bg-gray-100 text-gray-500'
        )}>
          {label}
        </span>
      </div>
      <div className={cn('text-3xl font-black tracking-tight mt-1', highlight ? 'text-black' : 'text-gray-900')}>
        {value}
      </div>
      {subtitle && (
        <p className={cn('text-xs mt-1', highlight ? 'text-yellow-800' : 'text-gray-400')}>{subtitle}</p>
      )}
    </motion.div>
  )
}