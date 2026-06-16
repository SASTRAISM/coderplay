'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Flame } from 'lucide-react'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { Badge } from '@/components/shared/Badge'
import type { Language } from '@/types'

interface LanguageCardProps {
  language: Language
  completedConcepts?: number
  progressPercent?: number
}

export function LanguageCard({
  language,
  completedConcepts = 0,
  progressPercent = 0,
}: LanguageCardProps) {
  const isStarted = progressPercent > 0
  const difficultyVariant =
    language.difficulty === 'Beginner' ? 'beginner' :
    language.difficulty === 'Intermediate' ? 'intermediate' : 'advanced'

  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: '0 12px 40px rgba(0,0,0,0.10)' }}
      transition={{ duration: 0.2 }}
      className="group relative bg-white border border-gray-100 rounded-2xl p-6 hover:border-yellow-300 transition-colors cursor-pointer"
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-sm font-black text-gray-600 group-hover:bg-yellow-50 transition-colors">
            {language.icon}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base leading-tight">{language.title}</h3>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge label={language.difficulty} variant={difficultyVariant} />
              {language.syllabusTag && (
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {language.syllabusTag}
                </span>
              )}
              {language.trending && (
                <span className="text-xs font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200 flex items-center gap-1">
                  <Flame className="w-3 h-3 inline-block" /> Trending
                </span>
              )}
            </div>
          </div>
        </div>
        {isStarted && (
          <span className="text-xs font-semibold text-yellow-600 bg-yellow-50 px-2.5 py-1 rounded-full border border-yellow-200">
            {progressPercent}%
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-500 leading-relaxed mb-4 line-clamp-2">{language.description}</p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {language.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
            {tag}
          </span>
        ))}
      </div>

      {/* Progress */}
      <div className="flex-col mb-4 space-y-1">
        <div className="flex justify-between text-xs text-gray-400">
          <span>{completedConcepts}/{language.totalConcepts} concepts</span>
          <span>{isStarted ? `${progressPercent}%` : 'Not started'}</span>
        </div>
        <ProgressBar value={progressPercent} size="sm" animate={false} />
      </div>

      {/* CTA */}
      <Link
        href={`/language/${language.id}`}
        className="block w-full text-center text-sm font-semibold py-2.5 rounded-xl border-2 transition-all
          border-gray-200 text-gray-700 hover:border-yellow-500 hover:bg-yellow-500 hover:!text-black"
      >
        {isStarted ? 'Continue Learning' : 'Start Learning'}
      </Link>
    </motion.div>
  )
}