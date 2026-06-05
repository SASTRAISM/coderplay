'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Calculator, BookOpen, Brain, BarChart2, Code2, Bot, ClipboardList, Lock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { APTITUDE_SUBJECTS, APTITUDE_CONCEPTS } from '@/data/aptitudeData'
import { PageTransition } from '@/components/shared/PageTransition'
import { useAuth } from '@/hooks/useAuth'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

const SUBJECT_ICON_MAP: Record<string, LucideIcon> = {
  quantitative: Calculator,
  verbal: BookOpen,
  logical: Brain,
  data_interpretation: BarChart2,
  technical_aptitude: Code2,
}

export default function AptitudePage() {
  const { user } = useAuth()
  const [subjectPct, setSubjectPct] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!user) return
    Promise.all(
      APTITUDE_SUBJECTS.map(async (subject) => {
        const concepts = APTITUDE_CONCEPTS[subject.id] || []
        if (concepts.length === 0) return [subject.id, 0] as [string, number]
        try {
          const results = await Promise.all(
            concepts.map(async (c) => {
              const [aptSnap, mcqSnap] = await Promise.all([
                getDoc(doc(db, 'aptitudeProgress', `${user.uid}_${subject.id}_${c.id}`)),
                getDoc(doc(db, 'aptitudeMCQResults', `${user.uid}_${subject.id}_${c.id}`)),
              ])
              const steps = aptSnap.exists() ? Math.min(aptSnap.data().stepsCompleted ?? 0, 5) : 0
              const mcq = mcqSnap.exists() ? 1 : 0
              return steps + mcq
            })
          )
          const earned = results.reduce((a, b) => a + b, 0)
          const pct = Math.round((earned / (concepts.length * 6)) * 100)
          return [subject.id, pct] as [string, number]
        } catch {
          return [subject.id, 0] as [string, number]
        }
      })
    ).then(entries => setSubjectPct(Object.fromEntries(entries)))
  }, [user?.uid])

  return (
    <PageTransition>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-700 font-medium">{'<- Dashboard'}</Link>
          </div>
          <h1 className="text-2xl font-black text-gray-900">Aptitude Preparation</h1>
          <p className="text-gray-500 text-sm mt-1">
            Master quantitative, verbal, logical, and technical aptitude for placements at TCS, Infosys, Wipro, Amazon, and more.
          </p>
        </div>

        {/* Subject cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {APTITUDE_SUBJECTS.map((subject, i) => {
            const concepts = APTITUDE_CONCEPTS[subject.id] || []
            return (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <Link href={`/aptitude/${subject.id}`}>
                  <div className="group bg-white border border-gray-100 rounded-2xl p-6 hover:border-yellow-300 hover:shadow-md transition-all cursor-pointer h-full flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: subject.color + '18' }}>
                        {(() => { const Icon = SUBJECT_ICON_MAP[subject.id] ?? Bot; return <Icon className="w-6 h-6" style={{ color: subject.color }} /> })()}
                      </div>
                      <span className="text-xs font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                        {concepts.length} topics
                      </span>
                    </div>
                    <h3 className="font-black text-gray-900 text-base mb-2">{subject.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed flex-1 mb-4 line-clamp-3">{subject.description}</p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {subject.topics.slice(0, 3).map(t => (
                        <span key={t} className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">{t}</span>
                      ))}
                      {subject.topics.length > 3 && (
                        <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">+{subject.topics.length - 3} more</span>
                      )}
                    </div>
                    {/* Per-subject progress */}
                    {(() => {
                      const pct = subjectPct[subject.id] ?? 0
                      return (
                        <div className="mb-4 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">
                              {pct === 0 ? 'Not started' : pct === 100 ? 'Complete!' : `In progress`}
                            </span>
                            <span className={`text-xs font-bold ${pct === 100 ? 'text-green-600' : pct > 0 ? 'text-indigo-500' : 'text-gray-300'}`}>{pct}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${pct === 100 ? 'bg-green-400' : 'bg-indigo-400'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })()}
                    <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                      <span className="text-xs text-gray-400">~{subject.estimatedTime} min / topic</span>
                      <span className="text-sm font-bold text-yellow-600 group-hover:text-yellow-700">
                        {(subjectPct[subject.id] ?? 0) > 0 ? 'Continue ->' : 'Start ->'}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-blue-900 mb-2">How Aptitude Learning Works</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              { Icon: Bot as LucideIcon,          title: 'Round 1 -- AI Explains',  desc: 'Cody AI teaches each concept deeply with examples, practice scenarios, and memory tricks.' },
              { Icon: ClipboardList as LucideIcon, title: 'Round 2 -- MCQ Exam',     desc: '30 unique questions per student -- MCQ, fill-in-the-blank, true/false, match, and ordering types.' },
              { Icon: Lock as LucideIcon,          title: 'Proctored Exam Mode',    desc: 'No copy-paste, no tab switching, fullscreen mode. Real placement-test conditions.' },
              { Icon: Bot as LucideIcon,           title: 'AI Help in Exam',        desc: 'Stuck? Ask Cody to explain the concept. It never reveals the answer -- only guides your thinking.' },
            ] as { Icon: LucideIcon; title: string; desc: string }[]).map(item => (
              <div key={item.title} className="flex items-start gap-3">
                <item.Icon className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-blue-900">{item.title}</p>
                  <p className="text-xs text-blue-700 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
