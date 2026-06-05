'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, FlaskConical, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { listenToProgress } from '@/lib/firebase/firestore'
import { downloadCertificatePdf } from '@/lib/pdf/downloadCertificatePdf'
import { getLanguageById } from '@/data/languages'
import { CONCEPTS } from '@/data/concepts'
import { Logo } from '@/components/shared/Logo'
import {
  getCompletedConceptCount,
  getLanguageCompletionDate,
  isConceptComplete,
} from '@/lib/courseProgress'
import { db } from '@/lib/firebase/config'
import { doc, getDoc } from 'firebase/firestore'
import type { UserProgress } from '@/types'

interface FinalExamResult {
  tier?: string
  passed?: boolean
  combinedScore?: number
}

function tierBadgeStyle(tier: string): { bg: string; text: string; border: string } {
  switch (tier) {
    case 'Elite':   return { bg: 'bg-purple-100',  text: 'text-purple-800',  border: 'border-purple-300' }
    case 'Diamond': return { bg: 'bg-cyan-100',    text: 'text-cyan-800',    border: 'border-cyan-300' }
    case 'Gold':    return { bg: 'bg-yellow-100',  text: 'text-yellow-800',  border: 'border-yellow-300' }
    case 'Silver':  return { bg: 'bg-gray-100',    text: 'text-gray-600',    border: 'border-gray-300' }
    case 'Bronze':  return { bg: 'bg-amber-100',   text: 'text-amber-800',   border: 'border-amber-300' }
    default:        return { bg: 'bg-gray-100',    text: 'text-gray-600',    border: 'border-gray-200' }
  }
}

function generateCertId(uid: string, langId: string): string {
  const base = `${uid}-${langId}`.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const hex = base.toString(16).toUpperCase().padStart(8, '0')
  return `CPA-${langId.toUpperCase()}-${hex}`
}

function formatDate(value: string | Date | null | undefined): string {
  const date = value ? new Date(value) : new Date()
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function CertificatePageClient({ params }: { params: { id: string } }) {
  const { user, profile } = useAuth()
  const searchParams = useSearchParams()
  const language = getLanguageById(params.id)
  const concepts = CONCEPTS[params.id] || []

  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [examResult, setExamResult] = useState<FinalExamResult | null>(null)

  useEffect(() => {
    if (!user) return
    return listenToProgress(user.uid, setProgress)
  }, [user])

  useEffect(() => {
    if (!user) return
    getDoc(doc(db, 'finalExamResults', `${user.uid}_${params.id}`)).then(snap => {
      if (snap.exists()) setExamResult(snap.data() as FinalExamResult)
    }).catch(() => {})
  }, [user, params.id])

  const conceptIds = concepts.map((concept) => concept.id)
  const completedCount = getCompletedConceptCount(progress, conceptIds)
  const allDone = concepts.length > 0 && completedCount === concepts.length
  const isDemoPreview =
    searchParams.get('demo') === '1' &&
    user?.email?.toLowerCase() === 'sastraism@gmail.com'
  const demoTier = isDemoPreview ? (searchParams.get('tier') || null) : null
  const canViewCertificate = allDone || isDemoPreview
  const progressPct = Math.round((completedCount / (concepts.length || 1)) * 100)
  const completedOn = getLanguageCompletionDate(progress, conceptIds)
  const remainingConcepts = concepts.filter((concept) => !isConceptComplete(progress, concept.id))

  const studentName = profile?.displayName || user?.displayName || 'Student'
  const certId = user
    ? isDemoPreview
      ? `CPA-${params.id.toUpperCase()}-DEMO`
      : generateCertId(user.uid, params.id)
    : `CPA-${params.id.toUpperCase()}-PREVIEW`
  const langName = language?.title || params.id
  const issuedOnLabel = formatDate(isDemoPreview ? new Date() : completedOn)
  const courseHeadline = `${langName.toUpperCase()} PROGRAMMING`
  const learnerMeta = [profile?.registrationNumber, profile?.branch, profile?.year ? `Year ${profile.year}` : ''].filter(Boolean).join('  *  ')

  const effectiveTier = demoTier || (examResult?.tier !== 'Failed' ? examResult?.tier : undefined)

  const handleDownload = async () => {
    if (!canViewCertificate || isDownloading) return

    setIsDownloading(true)
    try {
      await downloadCertificatePdf({
        filename: `${langName.toLowerCase().replace(/\s+/g, '-')}${isDemoPreview ? '-demo' : ''}-certificate.pdf`,
        studentName,
        courseTitle: `${langName} Programming`,
        certificateId: certId,
        issuedOn: isDemoPreview ? new Date() : (completedOn ?? new Date()),
        conceptsCompleted: concepts.length,
        registrationNumber: profile?.registrationNumber,
        branch: profile?.branch,
        year: profile?.year,
        tier: effectiveTier,
      })
    } finally {
      setIsDownloading(false)
    }
  }

  if (!language) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Language not found.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.18),transparent_32%),linear-gradient(180deg,#111827_0%,#0f172a_48%,#020617_100%)] px-4 py-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={`/language/${params.id}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to {langName}
          </Link>

          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-full border text-xs font-semibold ${
              canViewCertificate
                ? 'bg-emerald-500/10 border-emerald-400/25 text-emerald-300'
                : 'bg-yellow-500/10 border-yellow-400/25 text-yellow-300'
            }`}>
              {canViewCertificate
                ? isDemoPreview
                  ? 'Demo certificate preview . full details and download enabled'
                  : `Certificate unlocked . ${concepts.length}/${concepts.length} concepts complete`
                : `${completedCount}/${concepts.length} concepts complete . certificate locked`}
            </div>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!canViewCertificate || isDownloading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-400 text-black font-bold text-sm rounded-full shadow-lg hover:bg-yellow-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {isDownloading ? 'Preparing certificate...' : 'Download Certificate'}
            </button>
          </div>
        </div>

        {!canViewCertificate ? (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-[32px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-8 sm:p-10 shadow-2xl"
          >
            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-3 rounded-full bg-white/5 border border-white/10 px-4 py-2">
                  <div className="w-10 h-10 rounded-full bg-yellow-400/15 border border-yellow-400/30 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Certificate Locked</p>
                    <p className="text-gray-400 text-xs">Complete every concept in {langName} to unlock your professional certificate.</p>
                  </div>
                </div>

                <div>
                  <p className="text-yellow-300 text-xs font-bold tracking-[0.28em] uppercase mb-3">Learning Progress</p>
                  <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                    Finish the remaining topics to open your final certificate.
                  </h1>
                  <p className="text-gray-300 text-sm sm:text-base mt-4 max-w-2xl leading-relaxed">
                    The certificate becomes available only after all concepts in this language are fully completed across guided learning, assessment, and coding practice.
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <p className="text-sm font-semibold text-white">{completedCount} of {concepts.length} concepts complete</p>
                      <p className="text-xs text-gray-400 mt-1">{progressPct}% of the {langName} learning track is finished.</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-yellow-300">{progressPct}%</p>
                    </div>
                  </div>
                  <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-yellow-300 via-amber-400 to-emerald-400"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-sm font-semibold text-white mb-3">Remaining concepts</p>
                  {remainingConcepts.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {remainingConcepts.map((concept) => (
                        <span
                          key={concept.id}
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-200"
                        >
                          <span className="text-yellow-300">*</span>
                          {concept.title}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">You are almost there.</p>
                  )}
                </div>
              </div>

              <div className="rounded-[28px] border border-yellow-300/15 bg-[#fffaf0] p-6 shadow-[0_30px_80px_rgba(15,23,42,0.35)] relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(234,179,8,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.08),transparent_32%)]" />
                <div className="relative space-y-6">
                  <Logo variant="nav" onLight />
                  <div>
                    <p className="text-[11px] font-bold tracking-[0.34em] uppercase text-amber-700">Preview</p>
                    <h2 className="text-2xl font-black text-slate-900 mt-2">Completion Certificate</h2>
                    <p className="text-sm text-slate-500 mt-2">
                      Your final certificate will unlock automatically once all {concepts.length} concepts are complete.
                    </p>
                  </div>

                  <div className="rounded-3xl border border-amber-200 bg-white/80 p-5">
                    <p className="text-xs uppercase tracking-[0.28em] text-amber-700 font-bold mb-2">Unlock Rule</p>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      Complete every concept in the {langName} learning path, including all 3 stages per concept.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-2xl bg-slate-900 px-4 py-4">
                      <p className="text-2xl font-black text-white">{completedCount}</p>
                      <p className="text-xs text-slate-400 mt-1">Done</p>
                    </div>
                    <div className="rounded-2xl bg-amber-100 px-4 py-4">
                      <p className="text-2xl font-black text-amber-800">{Math.max(concepts.length - completedCount, 0)}</p>
                      <p className="text-xs text-amber-700 mt-1">Remaining</p>
                    </div>
                  </div>

                  <Link
                    href={`/language/${params.id}`}
                    className="inline-flex items-center justify-center w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 transition-colors"
                  >
                    Continue Learning
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="rounded-[36px] bg-white shadow-[0_40px_110px_rgba(2,6,23,0.5)] overflow-hidden border border-[#e1c067] relative"
          >
            <div className="absolute inset-0 bg-[linear-gradient(180deg,#fffdfa_0%,#fff8ea_100%)]" />
            <div className="absolute inset-[18px] rounded-[28px] border-[3px] border-[#e4bf5e]" />
            <div className="absolute inset-[28px] rounded-[22px] border border-[#d8b561]" />
            <div className="absolute left-0 bottom-0 h-44 w-44 bg-[#0d4577] [clip-path:polygon(0_30%,0_100%,70%_100%)]" />
            <div className="absolute left-3 bottom-3 h-32 w-32 border-l-[10px] border-b-[10px] border-[#f3c659] rounded-bl-[28px]" />
            <div className="absolute right-0 top-0 h-40 w-40 bg-[#f6d26d] [clip-path:polygon(30%_0,100%_0,100%_70%)] opacity-60" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-[380px] w-[380px] rounded-full border-[24px] border-slate-200/20" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-200/20 text-[270px] font-black tracking-tight">
              *
            </div>

            <div className="relative px-8 py-10 sm:px-12 sm:py-14">
              <div className="flex flex-col gap-8">
                {isDemoPreview && (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-700">Demo Preview</p>
                        <p className="text-sm text-blue-900 mt-1">Visible only to sastraism@gmail.com for certificate QA and download testing.</p>
                      </div>
                      <FlaskConical className="w-6 h-6 text-blue-600 shrink-0" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs font-bold text-blue-700 self-center">Preview tier:</span>
                      {['Bronze', 'Silver', 'Gold', 'Diamond', 'Elite'].map(t => {
                        const ts = tierBadgeStyle(t)
                        const isActive = demoTier === t
                        return (
                          <a
                            key={t}
                            href={`?demo=1&tier=${t}`}
                            className={`px-3 py-1 rounded-full border text-xs font-bold transition-all ${isActive ? `${ts.bg} ${ts.text} ${ts.border} ring-2 ring-offset-1 ring-blue-400` : 'border-blue-200 text-blue-600 hover:bg-blue-100'}`}
                          >
                            {t}
                          </a>
                        )
                      })}
                      {demoTier && (
                        <a href="?demo=1" className="px-3 py-1 rounded-full border border-gray-300 text-xs font-bold text-gray-500 hover:bg-gray-100">
                          Clear
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between gap-6">
                  <div className="space-y-2">
                    <Logo variant="nav" onLight />
                    <div className="pl-1">
                      <p className="text-[11px] font-bold tracking-[0.26em] uppercase text-[#123f6d]">CoderPlay AI Credential</p>
                      <p className="text-xs text-slate-500 mt-1">Verified professional course completion</p>
                    </div>
                  </div>

                  <div className="w-24 h-24 rounded-full bg-[#133b6d] border-[7px] border-[#f1cd74] shadow-xl flex items-center justify-center text-white shrink-0">
                    <div className="w-[76px] h-[76px] rounded-full border border-[#f6df9d] flex items-center justify-center">
                      <div className="text-center leading-none">
                        <p className="text-[10px] font-black tracking-[0.22em] text-[#f7d878]">VERIFIED</p>
                        <p className="text-[20px] font-black mt-2">CPA</p>
                        <p className="text-[8px] font-bold mt-2 text-[#f7d878]">ACHIEVEMENT</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center pt-1">
                  <h1 className="text-[52px] sm:text-[72px] leading-none text-[#243d78]" style={{ fontFamily: 'Georgia, serif', letterSpacing: '0.04em' }}>
                    CERTIFICATE
                  </h1>
                  <p className="text-[22px] sm:text-[32px] text-[#314a84] -mt-1" style={{ fontFamily: 'Georgia, serif', letterSpacing: '0.16em' }}>
                    OF ACHIEVEMENT
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-[18px] sm:text-[22px] font-semibold text-[#2f457a]">This certifies that</p>
                  <h2 className="text-4xl sm:text-6xl font-black text-[#e85b17] mt-4 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
                    {studentName}
                  </h2>
                  <div className="h-[2px] w-[78%] mx-auto bg-[#d7952f] mt-4" />
                  <p className="text-lg sm:text-[20px] font-medium text-[#2f457a] mt-7">
                    has successfully completed the course
                  </p>
                  <h3 className="text-3xl sm:text-5xl font-black text-[#243d78] mt-3 tracking-tight">
                    {courseHeadline}
                  </h3>
                  <p className="text-sm sm:text-base text-slate-500 mt-4 max-w-3xl mx-auto leading-relaxed">
                    with verified completion of guided lessons, assessments, and coding practice inside CoderPlay AI.
                  </p>

                  {/* Tier badge -- prominently shown */}
                  {effectiveTier && effectiveTier !== 'Failed' && (() => {
                    const ts = tierBadgeStyle(effectiveTier)
                    return (
                      <div className="flex flex-col items-center gap-1 mt-6">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Certificate Tier</p>
                        <div className={`inline-flex items-center gap-2 px-8 py-3 rounded-full border-2 font-black text-base ${ts.bg} ${ts.text} ${ts.border}`}>
                          {effectiveTier} Tier{demoTier ? ' (Demo)' : ''}
                        </div>
                      </div>
                    )
                  })()}

                  {isDemoPreview && (
                    <p className="text-xs text-blue-600 mt-3 font-medium">
                      Demo preview active -- download is enabled for testing.
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <div className="rounded-2xl border border-[#efcf82] bg-white/90 px-5 py-3 text-center shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Concepts Completed</p>
                    <p className="text-lg font-black text-[#243d78] mt-1">{concepts.length}</p>
                  </div>
                  <div className="rounded-2xl border border-[#efcf82] bg-white/90 px-5 py-3 min-w-[190px] text-center shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Certificate ID</p>
                    <p className="text-sm font-black text-[#243d78] mt-1 break-all">{certId}</p>
                  </div>
                  <div className="rounded-2xl border border-[#efcf82] bg-white/90 px-5 py-3 text-center shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Issue Date</p>
                    <p className="text-sm font-black text-[#243d78] mt-1">{issuedOnLabel}</p>
                  </div>
                </div>

                <div className="grid gap-4 pt-4 sm:grid-cols-[1fr_auto_1fr] items-end">
                  <div className="text-left">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Issue Date</p>
                    <p className="text-2xl font-black text-[#243d78] mt-2">{issuedOnLabel}</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white/85 px-5 py-4 text-center shadow-sm min-w-[280px]">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Verified Learner Record</p>
                    <p className="text-sm text-[#2f457a] font-semibold mt-2">
                      {learnerMeta || 'Issued digitally by CoderPlay AI as a verified achievement credential.'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-2">Verify inside CoderPlay AI using credential ID {certId}</p>
                  </div>

                  <div className="text-right">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#efcf82] bg-white/90 px-4 py-2 shadow-sm">
                      <span className="text-[#e3a318]">*</span>
                      <span className="text-xs font-black tracking-[0.14em] text-[#243d78]">VERIFIED ACHIEVEMENT</span>
                      <span className="text-[#e3a318]">*</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {concepts.length > 0 && (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <h3 className="text-white font-bold text-base">Concepts in this learning track</h3>
                <p className="text-gray-400 text-sm">Each concept must be completed across all 3 stages to count toward the certificate.</p>
              </div>
              <div className="text-sm font-semibold text-yellow-300">
                {completedCount}/{concepts.length} complete
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {concepts.map((concept) => {
                const done = isConceptComplete(progress, concept.id)
                return (
                  <div
                    key={concept.id}
                    className={`rounded-2xl border px-4 py-3 text-sm ${
                      done
                        ? 'bg-emerald-500/10 border-emerald-400/20 text-emerald-200'
                        : 'bg-white/5 border-white/10 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{done ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-gray-400" />}</span>
                      <span className="font-medium">{concept.title}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
