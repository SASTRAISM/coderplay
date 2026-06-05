'use client'

import { useState, useEffect, useCallback } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { GraduationCap, ClipboardList, Lock, Bot, Sparkles, MailOpen } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getLanguageById } from '@/data/languages'
import { CONCEPTS } from '@/data/concepts'
import { ConceptCard } from '@/components/learning/ConceptCard'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { Badge } from '@/components/shared/Badge'
import { listenToProgress } from '@/lib/firebase/firestore'
import { getBackendUrl } from '@/lib/backendUrl'
import { getCompletedConceptCount } from '@/lib/courseProgress'
import { db } from '@/lib/firebase/config'
import { doc, getDoc } from 'firebase/firestore'
import type { UserProgress, Concept } from '@/types'
const CACHE_KEY = (id: string) => `cp_syllabus_${id}`

function loadCachedConcepts(languageId: string): Concept[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CACHE_KEY(languageId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

type Difficulty = 'All' | 'Beginner' | 'Intermediate' | 'Advanced'

export default function LanguagePageClient({ params }: { params: { id: string } }) {
  const language = getLanguageById(params.id)
  if (!language) notFound()

  const { user } = useAuth()
  const staticConcepts = CONCEPTS[params.id] || []
  const [dynamicConcepts, setDynamicConcepts] = useState<Concept[]>([])
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Difficulty>('All')
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null)
  const [finalExamPassed, setFinalExamPassed] = useState(false)

  // Load cached AI-generated concepts on mount
  useEffect(() => {
    if (staticConcepts.length === 0) {
      setDynamicConcepts(loadCachedConcepts(params.id))
    }
  }, [params.id, staticConcepts.length])

  const concepts = staticConcepts.length > 0 ? staticConcepts : dynamicConcepts
  const hasDemoCertificateAccess = user?.email?.toLowerCase() === 'sastraism@gmail.com'

  const generateSyllabus = useCallback(async () => {
    setGenerating(true)
    setGenError(null)
    try {
      const res = await fetch(`${getBackendUrl()}/api/ai/generate-syllabus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          languageId: params.id,
          languageTitle: language.title,
          totalConcepts: language.totalConcepts,
        }),
        signal: AbortSignal.timeout(130_000),
      })
      const data = await res.json()
      if (!res.ok || !data.concepts) throw new Error(data.error || 'Generation failed')
      const generated: Concept[] = data.concepts.map((c: Omit<Concept, 'stages'>) => ({
        ...c,
        stages: [
          { stage: 1 as const, description: 'Interactive learning with guided explanations', unlocked: true },
          { stage: 2 as const, description: '15-question assessment', unlocked: false },
          { stage: 3 as const, description: 'Coding challenges', unlocked: false },
        ],
      }))
      localStorage.setItem(CACHE_KEY(params.id), JSON.stringify(generated))
      setDynamicConcepts(generated)
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Failed to generate syllabus')
    } finally {
      setGenerating(false)
    }
  }, [params.id, language.title, language.totalConcepts])

  useEffect(() => {
    if (!user) return
    const unsub = listenToProgress(user.uid, setUserProgress)
    return unsub
  }, [user])

  useEffect(() => {
    if (!user) return
    getDoc(doc(db, 'finalExamResults', `${user.uid}_${params.id}`)).then((snap) => {
      if (snap.exists() && snap.data()?.passed) setFinalExamPassed(true)
    }).catch(() => {})
  }, [user, params.id])

  const getStagesCompleted = (conceptId: string): number[] =>
    userProgress?.completedStages?.[conceptId] || []

  const isConceptDone = (conceptId: string) => {
    const s = getStagesCompleted(conceptId)
    return s.includes(1) && s.includes(2) && s.includes(3)
  }

  const conceptIds = concepts.map((concept) => concept.id)
  const completedCount = getCompletedConceptCount(userProgress, conceptIds)
  // Allow sastraism@gmail.com to access Final Exam without completing all concepts
  const allDone = (concepts.length > 0 && completedCount === concepts.length) || hasDemoCertificateAccess
  const progressPct = Math.round((completedCount / (concepts.length || 1)) * 100)

  // Internal marks calculation: average of all concept assessment scores scaled to 25
  const internalMarks = userProgress?.assessmentScores
    ? (() => {
        const scores = Object.values(userProgress.assessmentScores as Record<string, number>).filter(s => typeof s === 'number')
        if (scores.length === 0) return 0
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length
        return Math.round((avg / 100) * 25 * 10) / 10
      })()
    : 0
  const canTakeExam = allDone && internalMarks >= 17.5

  const filtered = filter === 'All' ? concepts : concepts.filter((c) => c.difficulty === filter)
  const diffCounts = {
    Beginner: concepts.filter((c) => c.difficulty === 'Beginner').length,
    Intermediate: concepts.filter((c) => c.difficulty === 'Intermediate').length,
    Advanced: concepts.filter((c) => c.difficulty === 'Advanced').length,
  }

  const tabs: Difficulty[] = ['All', 'Beginner', 'Intermediate', 'Advanced']

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Sticky header */}
      <div className="bg-white border-b border-gray-100 shrink-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          {/* Back button row */}
          <div className="flex items-center gap-3 mb-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors group"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-x-0.5 transition-transform">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span>Back to Dashboard</span>
            </Link>
          </div>

          {/* Language info row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-sm font-black text-gray-600">
                {language.icon}
              </div>
              <div>
                <h1 className="text-xl font-black text-gray-900">{language.title}</h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge
                    label={language.difficulty}
                    variant={language.difficulty === 'Beginner' ? 'beginner' : language.difficulty === 'Intermediate' ? 'intermediate' : 'advanced'}
                  />
                  {language.syllabusTag && (
                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                      {language.syllabusTag}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{concepts.length} concepts</span>
                </div>
              </div>
            </div>
            <div className="sm:ml-auto sm:text-right flex flex-col items-end gap-2">
              <p className="text-xs text-gray-400">
                <span className="font-bold text-gray-700">{completedCount}</span>/{concepts.length} completed
              </p>
              <ProgressBar value={progressPct} size="sm" className="w-32" animate />
              {concepts.length > 0 && (
                <div className="flex flex-wrap justify-end gap-2">
                  {allDone && finalExamPassed ? (
                    <Link
                      href={`/language/${params.id}/certificate`}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold text-xs rounded-full shadow-sm hover:shadow-md transition-all"
                    >
                      <GraduationCap className="w-4 h-4 inline-block align-middle mr-1" /> Certificate Ready
                    </Link>
                  ) : canTakeExam ? (
                    <Link
                      href={`/language/${params.id}/final-exam`}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-xs rounded-full shadow-sm hover:shadow-md transition-all"
                    >
                      <ClipboardList className="w-4 h-4 inline-block align-middle mr-1" /> Take Final Exam {'>'}
                    </Link>
                  ) : allDone ? (
                    <div className="flex items-center gap-1.5 px-4 py-1.5 bg-orange-50 border border-orange-200 text-orange-700 font-semibold text-xs rounded-full">
                      <Lock className="w-3 h-3 inline-block align-middle mr-1" /> Internal: {internalMarks}/25 (need 17.5)
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-100 border border-gray-200 text-gray-500 font-semibold text-xs rounded-full">
                      <Lock className="w-3 h-3 inline-block align-middle mr-1" /> {Math.max(concepts.length - completedCount, 0)} more concept{Math.max(concepts.length - completedCount, 0) === 1 ? '' : 's'} to unlock certificate
                    </div>
                  )}

                  {hasDemoCertificateAccess && (
                    <Link
                      href={`/language/${params.id}/certificate?demo=1`}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-white border border-blue-200 text-blue-700 font-bold text-xs rounded-full shadow-sm hover:bg-blue-50 transition-all"
                    >
                      View DEMO Certificate
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 space-y-5">
          {/* Description + tags */}
          <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4">
            <p className="text-gray-600 text-sm leading-relaxed">{language.description}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {language.tags.map((tag) => (
                <span key={tag} className="text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">{tag}</span>
              ))}
            </div>
          </div>

          {/* Difficulty stats */}
          <div className="grid grid-cols-3 gap-3">
            {(['Beginner', 'Intermediate', 'Advanced'] as const).map((d) => {
              const done = concepts.filter(c => c.difficulty === d && isConceptDone(c.id)).length
              return (
                <div key={d} className={`p-3 rounded-xl border text-center ${
                  d === 'Beginner' ? 'bg-green-50 border-green-200' :
                  d === 'Intermediate' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  <div className={`text-xl font-black ${
                    d === 'Beginner' ? 'text-green-700' :
                    d === 'Intermediate' ? 'text-yellow-700' : 'text-red-700'
                  }`}>{diffCounts[d]}</div>
                  <div className="text-xs font-medium text-gray-500 mt-0.5">{d}</div>
                  {done > 0 && (
                    <div className="text-xs font-bold text-green-600 mt-0.5">{done} done +</div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === tab
                    ? 'bg-yellow-500 text-black shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {tab}
                {tab !== 'All' && <span className="ml-1.5 text-xs opacity-70">{diffCounts[tab]}</span>}
              </button>
            ))}
          </div>

          {/* Concepts list */}
          <div className="space-y-2 pb-6">
            {/* Stage progress banner */}
            {concepts.length > 0 && (
              <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-2xl px-4 py-3 overflow-x-auto mb-1">
                <div className="flex items-center gap-1.5 shrink-0 text-xs font-bold text-gray-700">
                  <span className="w-5 h-5 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-black">{concepts.length}</span>
                  modules
                  <span className="font-normal text-gray-400">({completedCount} done)</span>
                </div>
                <span className="text-gray-300 shrink-0 font-bold">{'->'}</span>
                <div className={`flex items-center gap-1.5 shrink-0 text-xs font-bold ${allDone ? 'text-indigo-700' : 'text-gray-400'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center ${allDone ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                    <ClipboardList className="w-3 h-3" />
                  </span>
                  Final Exam
                </div>
                <span className="text-gray-300 shrink-0 font-bold">{'->'}</span>
                <div className={`flex items-center gap-1.5 shrink-0 text-xs font-bold ${finalExamPassed ? 'text-yellow-700' : 'text-gray-400'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center ${finalExamPassed ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                    <GraduationCap className="w-3 h-3" />
                  </span>
                  Get Certified
                </div>
              </div>
            )}
            {concepts.length === 0 ? (
              /* AI syllabus generator for languages with no static concepts */
              <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center space-y-4">
                <div className="flex justify-center"><Bot className="w-12 h-12 text-gray-400" /></div>
                <h3 className="text-lg font-bold text-gray-900">Syllabus not loaded yet</h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                  No concepts exist for <strong>{language.title}</strong> yet. Click below and Cody (AI) will generate a complete, structured syllabus for you using Ollama.
                </p>
                {genError && (
                  <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-xl">{genError}</p>
                )}
                <button
                  type="button"
                  onClick={generateSyllabus}
                  disabled={generating}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-sm rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                >
                  {generating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      Generating {language.totalConcepts} concepts... (may take ~30-60s)
                    </>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Generate Syllabus with AI</>
                  )}
                </button>
                {generating && (
                  <p className="text-xs text-gray-400">Ollama is thinking hard -- grab a chai while you wait!</p>
                )}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="flex justify-center mb-2"><MailOpen className="w-8 h-8" /></div>
                <p className="text-sm">No concepts for this difficulty level yet.</p>
              </div>
            ) : (
              <>
                {filtered.map((concept, i) => (
                  <ConceptCard
                    key={concept.id}
                    concept={concept}
                    stagesCompleted={getStagesCompleted(concept.id)}
                    locked={false}
                    index={i}
                  />
                ))}

                {/* Final Exam card -- shown only when viewing All concepts */}
                {filter === 'All' && (
                  <div className={`rounded-2xl border-2 border-dashed p-5 transition-all ${
                    canTakeExam
                      ? finalExamPassed
                        ? 'border-yellow-400 bg-yellow-50'
                        : 'border-indigo-400 bg-indigo-50 hover:shadow-md'
                      : allDone
                      ? 'border-orange-300 bg-orange-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          canTakeExam ? (finalExamPassed ? 'bg-yellow-400' : 'bg-indigo-500') : allDone ? 'bg-orange-200' : 'bg-gray-200'
                        }`}>
                          {finalExamPassed ? <GraduationCap className="w-5 h-5 text-black" /> : canTakeExam ? <ClipboardList className="w-5 h-5 text-white" /> : <Lock className={`w-5 h-5 ${allDone ? 'text-orange-500' : 'text-gray-400'}`} />}
                        </div>
                        <div>
                          <p className={`font-black text-sm ${canTakeExam || allDone ? 'text-gray-900' : 'text-gray-400'}`}>
                            Stage 4 -- Final Exam
                          </p>
                          <p className={`text-xs mt-0.5 ${canTakeExam || allDone ? 'text-gray-600' : 'text-gray-400'}`}>
                            {finalExamPassed
                              ? 'Passed! Certificate is unlocked.'
                              : canTakeExam
                              ? 'External: 75 marks . 90 min . Proctored'
                              : allDone
                              ? `Internal score: ${internalMarks}/25 -- need 17.5/25 to unlock exam`
                              : `Complete all ${concepts.length} concepts to unlock`}
                          </p>
                          {allDone && !finalExamPassed && (
                            <div className="mt-1.5 flex items-center gap-2">
                              <span className="text-xs text-gray-500 shrink-0">Internal:</span>
                              <div className="w-24">
                                <ProgressBar
                                  value={Math.min(100, Math.round((internalMarks / 25) * 100))}
                                  size="sm"
                                  animate
                                />
                              </div>
                              <span className={`text-xs font-bold shrink-0 ${internalMarks >= 17.5 ? 'text-green-600' : 'text-orange-600'}`}>{internalMarks}/25</span>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2 mt-1.5">
                            <span className="text-xs bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">25 Internal + 75 External = 100</span>
                            <span className="text-xs bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">90 Minutes</span>
                            <span className="text-xs bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">All Concepts</span>
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {finalExamPassed ? (
                          <Link
                            href={`/language/${params.id}/certificate`}
                            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-xs rounded-xl transition-colors"
                          >
                            View Certificate
                          </Link>
                        ) : canTakeExam ? (
                          <Link
                            href={`/language/${params.id}/final-exam`}
                            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl transition-colors"
                          >
                            Start Exam {'>'}
                          </Link>
                        ) : allDone ? (
                          <div className="px-4 py-2 bg-orange-100 text-orange-500 font-bold text-xs rounded-xl cursor-not-allowed flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Improve Score
                          </div>
                        ) : (
                          <div className="px-4 py-2 bg-gray-200 text-gray-400 font-bold text-xs rounded-xl cursor-not-allowed flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Locked
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
