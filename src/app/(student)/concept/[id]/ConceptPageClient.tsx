'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { motion } from 'framer-motion'
import { MessageSquare, ClipboardList, Code2, Lock, GraduationCap, Check } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { CONCEPTS } from '@/data/concepts'
import { getLanguageById } from '@/data/languages'
import { StageProgress } from '@/components/learning/StageProgress'
import { Badge } from '@/components/shared/Badge'
import { PageTransition } from '@/components/shared/PageTransition'
import { useAuth } from '@/hooks/useAuth'
import { listenToProgress } from '@/lib/firebase/firestore'
import type { UserProgress } from '@/types'

function findConceptById(id: string) {
  for (const concepts of Object.values(CONCEPTS)) {
    const found = concepts.find((c) => c.id === id)
    if (found) return found
  }
  return null
}

export default function ConceptPageClient({ params }: { params: { id: string } }) {
  const concept = findConceptById(params.id)
  if (!concept) notFound()

  const { user } = useAuth()
  const language = getLanguageById(concept.languageId)
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null)

  useEffect(() => {
    if (!user) return
    const unsub = listenToProgress(user.uid, setUserProgress)
    return unsub
  }, [user])

  const completedStages: number[] = userProgress?.completedStages?.[params.id] ?? []
  const allDone = completedStages.includes(1) && completedStages.includes(2) && completedStages.includes(3)

  const stageDescriptions: { stage: 1|2|3; Icon: LucideIcon; title: string; desc: string; time: string; unlocked: boolean }[] = [
    {
      stage: 1,
      Icon: MessageSquare,
      title: 'Learning Round',
      desc: 'Study the concept through guided explanations, examples, and mini check-ins with your tutor.',
      time: '10-15 min',
      unlocked: true,
    },
    {
      stage: 2,
      Icon: ClipboardList,
      title: 'Assessment Round',
      desc: '15 diverse questions to verify your understanding -- full explanations for every answer.',
      time: '15-20 min',
      unlocked: completedStages.includes(1),
    },
    {
      stage: 3,
      Icon: Code2,
      title: 'Coding Challenge',
      desc: 'Apply knowledge with 3 coding problems (Basic -> Medium -> Hard).',
      time: '20-30 min',
      unlocked: completedStages.includes(2),
    },
  ]

  // Next unlocked+incomplete stage
  const nextStage = allDone ? null :
    !completedStages.includes(1) ? 1 :
    !completedStages.includes(2) ? 2 : 3

  return (
    <PageTransition>
      <div className="h-full flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 shrink-0">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5">
            {/* Back button */}
            <div className="mb-4">
              <Link
                href={`/language/${concept.languageId}`}
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors group"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-x-0.5 transition-transform">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                <span>Back to {language?.title || concept.languageId}</span>
              </Link>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    label={concept.difficulty}
                    variant={concept.difficulty === 'Beginner' ? 'beginner' : concept.difficulty === 'Intermediate' ? 'intermediate' : 'advanced'}
                  />
                  <span className="text-xs text-gray-400">~{concept.estimatedTime} min total</span>
                  {allDone && (
                    <span className="text-xs font-bold text-green-700 bg-green-100 px-2.5 py-0.5 rounded-full">+ Completed</span>
                  )}
                </div>
                <h1 className="text-2xl font-black text-gray-900">{concept.title}</h1>
                <p className="text-gray-500 text-sm mt-1.5 leading-relaxed max-w-xl">{concept.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
            {/* Stage progress */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <h2 className="text-sm font-bold text-gray-700 mb-5 uppercase tracking-wide">Learning Path</h2>
              <StageProgress completedStages={completedStages} />
            </div>

            {/* Stage cards */}
            <div className="space-y-3">
              {stageDescriptions.map(({ stage, Icon, title, desc, time, unlocked }) => {
                const isCompleted = completedStages.includes(stage)
                const isNext = nextStage === stage
                return (
                  <motion.div
                    key={stage}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: stage * 0.08 }}
                    className={`p-5 rounded-2xl border-2 transition-all ${
                      isCompleted ? 'bg-green-50 border-green-200' :
                      isNext ? 'bg-yellow-50 border-yellow-400 shadow-md' :
                      !unlocked ? 'bg-gray-50 border-gray-100 opacity-60' :
                      'bg-white border-gray-100'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                        isCompleted ? 'bg-green-500 text-white' :
                        isNext ? 'bg-yellow-500' :
                        !unlocked ? 'bg-gray-200' : 'bg-gray-100'
                      }`}>
                        {isCompleted ? <Check className="w-5 h-5 text-white" /> : !unlocked ? <Lock className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-bold text-gray-400">STAGE {stage}</span>
                          {isNext && <span className="text-xs font-semibold text-yellow-700 bg-yellow-200 px-2 py-0.5 rounded-full">Up Next</span>}
                          {isCompleted && <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Completed</span>}
                          {!unlocked && <span className="text-xs text-gray-400">Complete previous stage first</span>}
                        </div>
                        <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed mb-3">{desc}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400"> {time}</span>
                          {unlocked && (
                            <Link
                              href={`/learn/${params.id}/stage${stage}`}
                              className={`text-sm font-semibold px-5 py-2 rounded-xl transition-colors ${
                                isCompleted
                                  ? 'text-green-700 border border-green-300 hover:bg-green-50'
                                  : isNext
                                  ? 'bg-yellow-500 hover:bg-yellow-400 text-black'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {isCompleted ? 'Review' : `Start Stage ${stage} ->`}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Key points */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <h2 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">What You&apos;ll Learn</h2>
              <ul className="space-y-2">
                {concept.keyPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <span className="text-yellow-500 mt-0.5 shrink-0">{'>'}</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="pb-6">
              {allDone ? (
                <Link
                  href={`/learn/${params.id}/complete`}
                  className="block w-full py-4 bg-green-500 hover:bg-green-400 text-white font-bold text-base rounded-2xl text-center transition-all shadow-lg shadow-green-100"
                >
                  <span className="flex items-center justify-center gap-2"><GraduationCap className="w-5 h-5" /> View Full Summary {'>'}</span>
                </Link>
              ) : nextStage ? (
                <Link
                  href={`/learn/${params.id}/stage${nextStage}`}
                  className="block w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-base rounded-2xl text-center transition-all shadow-lg shadow-yellow-100"
                >
                  {nextStage === 1 ? 'Start Learning ->' : nextStage === 2 ? 'Take Assessment ->' : 'Start Coding ->'}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
