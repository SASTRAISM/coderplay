'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Bot, ClipboardList, Lock, GraduationCap } from 'lucide-react'
import { APTITUDE_SUBJECTS, APTITUDE_CONCEPTS } from '@/data/aptitudeData'
import { PageTransition } from '@/components/shared/PageTransition'
import { notFound } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

interface ConceptProgress {
  stepsCompleted: number
  mcqDone: boolean
}

export default function SubjectPageClient({ params }: { params: { subjectId: string } }) {
  const subject = APTITUDE_SUBJECTS.find(s => s.id === params.subjectId)
  if (!subject) notFound()

  const concepts = APTITUDE_CONCEPTS[params.subjectId] || []
  const { user } = useAuth()

  const [conceptProgress, setConceptProgress] = useState<Record<string, ConceptProgress>>({})
  const [examResult, setExamResult] = useState<{ passed: boolean; percentage: number } | null | undefined>(undefined)

  // Load per-concept progress (stepsCompleted + mcqDone)
  useEffect(() => {
    if (!user) return
    Promise.all(
      concepts.map(async (c) => {
        try {
          const [aptSnap, mcqSnap] = await Promise.all([
            getDoc(doc(db, 'aptitudeProgress', `${user.uid}_${params.subjectId}_${c.id}`)),
            getDoc(doc(db, 'aptitudeMCQResults', `${user.uid}_${params.subjectId}_${c.id}`)),
          ])
          const stepsCompleted = aptSnap.exists() ? (aptSnap.data().stepsCompleted ?? 0) : 0
          return [c.id, { stepsCompleted, mcqDone: mcqSnap.exists() }] as [string, ConceptProgress]
        } catch {
          return [c.id, { stepsCompleted: 0, mcqDone: false }] as [string, ConceptProgress]
        }
      })
    ).then(entries => setConceptProgress(Object.fromEntries(entries)))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, params.subjectId])

  // Load exam result
  useEffect(() => {
    if (!user) return
    getDoc(doc(db, 'aptitudeExamResults', `${user.uid}_${params.subjectId}`)).then(snap => {
      if (snap.exists()) setExamResult(snap.data() as { passed: boolean; percentage: number })
      else setExamResult(null)
    }).catch(() => setExamResult(null))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, params.subjectId])

  const allAiDone = concepts.length > 0 && concepts.every(c => (conceptProgress[c.id]?.stepsCompleted ?? 0) >= 5)

  return (
    <PageTransition>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Link href="/dashboard" className="hover:text-gray-700">Dashboard</Link>
          <span>/</span>
          <Link href="/aptitude" className="hover:text-gray-700">Aptitude</Link>
          <span>/</span>
          <span className="text-gray-700 font-semibold">{subject.title}</span>
        </div>

        {/* Subject header */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-3xl">
            {subject.icon}
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">{subject.title}</h1>
            <p className="text-sm text-gray-500 mt-1 max-w-xl">{subject.description}</p>
          </div>
        </div>

        {/* Key topics */}
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
          <p className="text-xs font-bold text-gray-500 uppercase mb-2">Topics Covered</p>
          <div className="flex flex-wrap gap-2">
            {subject.topics.map(t => (
              <span key={t} className="text-xs font-medium text-gray-600 bg-white px-2.5 py-1 rounded-lg border border-gray-200">{t}</span>
            ))}
          </div>
        </div>

        {/* Concepts list */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-gray-900">Learning Concepts ({concepts.length})</h2>
          {concepts.map((concept, i) => {
            const progress: ConceptProgress = conceptProgress[concept.id] ?? { stepsCompleted: 0, mcqDone: false }
            return (
              <motion.div
                key={concept.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-yellow-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${
                      progress.mcqDone
                        ? 'bg-green-400 text-white'
                        : progress.stepsCompleted >= 5
                        ? 'bg-yellow-400 text-black'
                        : progress.stepsCompleted > 0
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {progress.mcqDone ? '+' : i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900 text-sm">{concept.title}</h3>
                        {progress.mcqDone && (
                          <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">+ Complete</span>
                        )}
                        {!progress.mcqDone && progress.stepsCompleted >= 5 && (
                          <span className="text-xs font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">AI Done . MCQ Ready</span>
                        )}
                        {!progress.mcqDone && progress.stepsCompleted > 0 && progress.stepsCompleted < 5 && (
                          <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Step {progress.stepsCompleted}/5</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{concept.description}</p>
                      {/* Step dots */}
                      <div className="flex items-center gap-1 mt-2">
                        {[1, 2, 3, 4, 5].map(s => (
                          <div
                            key={s}
                            className={`w-2 h-2 rounded-full ${s <= progress.stepsCompleted ? 'bg-green-400' : 'bg-gray-200'}`}
                          />
                        ))}
                        <span className="text-xs text-gray-400 ml-1">{progress.stepsCompleted}/5 steps</span>
                      </div>
                      {/* Progress bar */}
                      {(() => {
                        const pct = Math.round((Math.min(progress.stepsCompleted, 5) / 5) * 50 + (progress.mcqDone ? 50 : 0))
                        return (
                          <div className="mt-2 space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-400">
                                {progress.mcqDone ? 'Fully complete' : progress.stepsCompleted >= 5 ? 'MCQ remaining' : `AI steps: ${progress.stepsCompleted}/5`}
                              </span>
                              <span className={`text-xs font-bold ${progress.mcqDone ? 'text-green-600' : pct > 0 ? 'text-indigo-500' : 'text-gray-400'}`}>{pct}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${progress.mcqDone ? 'bg-green-400' : progress.stepsCompleted >= 5 ? 'bg-yellow-400' : 'bg-indigo-400'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )
                      })()}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {concept.keyPoints.slice(0, 2).map(kp => (
                          <span key={kp} className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">{kp}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Link
                      href={`/aptitude/${params.subjectId}/concept/${concept.id}/stage1`}
                      className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-xs rounded-xl transition-colors text-center whitespace-nowrap"
                    >
                      <span className="flex items-center justify-center gap-1">
                        <Bot className="w-3 h-3" />
                        {progress.stepsCompleted >= 5
                          ? 'Review AI'
                          : progress.stepsCompleted > 0
                          ? `Continue (${progress.stepsCompleted + 1}/5)`
                          : 'Learn with AI'}
                      </span>
                    </Link>
                    {progress.stepsCompleted >= 5 ? (
                      <Link
                        href={`/aptitude/${params.subjectId}/concept/${concept.id}/stage2`}
                        className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-bold text-xs rounded-xl transition-colors text-center whitespace-nowrap"
                      >
                        <span className="flex items-center justify-center gap-1"><ClipboardList className="w-3 h-3" /> Take MCQ Test</span>
                      </Link>
                    ) : (
                      <div className="px-4 py-2 bg-gray-100 text-gray-400 font-bold text-xs rounded-xl text-center cursor-not-allowed whitespace-nowrap">
                        <span className="flex items-center justify-center gap-1"><Lock className="w-3 h-3" /> {progress.stepsCompleted > 0 ? `${5 - progress.stepsCompleted} steps left` : 'Complete AI first'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Exam & Certificate section */}
        <div className={`rounded-2xl border-2 border-dashed p-5 ${allAiDone ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${allAiDone ? (examResult?.passed ? 'bg-yellow-400' : 'bg-indigo-500') : 'bg-gray-200'}`}>
                {examResult?.passed ? <GraduationCap className="w-5 h-5 text-black" /> : allAiDone ? <ClipboardList className="w-5 h-5 text-white" /> : <Lock className="w-5 h-5 text-gray-400" />}
              </div>
              <div>
                <p className={`font-black text-sm ${allAiDone ? 'text-gray-900' : 'text-gray-400'}`}>
                  Subject Final Exam
                </p>
                <p className={`text-xs mt-0.5 ${allAiDone ? 'text-gray-600' : 'text-gray-400'}`}>
                  {examResult?.passed
                    ? `Passed with ${examResult.percentage.toFixed(1)}% -- Certificate unlocked!`
                    : allAiDone
                    ? '30 questions . 60 minutes . 60% to pass'
                    : `Complete all 5 AI steps for all ${concepts.length} concepts first`}
                </p>
              </div>
            </div>
            <div className="shrink-0">
              {examResult?.passed ? (
                <Link href={`/aptitude/${params.subjectId}/certificate`} className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-xs rounded-xl transition-colors">
                  View Certificate
                </Link>
              ) : allAiDone ? (
                <Link href={`/aptitude/${params.subjectId}/exam`} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl transition-colors">
                  Take Exam {'>'}
                </Link>
              ) : (
                <div className="px-4 py-2 bg-gray-200 text-gray-400 font-bold text-xs rounded-xl cursor-not-allowed flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Locked
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
