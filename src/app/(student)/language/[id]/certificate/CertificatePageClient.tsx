'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, FlaskConical, CheckCircle2, ShieldCheck, QrCode, Download, ExternalLink } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { listenToProgress } from '@/lib/firebase/firestore'
import { downloadCertificatePdf, getCertificateTier } from '@/lib/pdf/downloadCertificatePdf'
import { getLanguageById } from '@/data/languages'
import { CONCEPTS } from '@/data/concepts'
import { Logo } from '@/components/shared/Logo'
import { PageTransition } from '@/components/shared/PageTransition'
import { BackButton } from '@/components/shared/BackButton'
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
  internalMarks?: number
  externalMarks?: number
}

function tierBadgeStyle(tier: string): { bg: string; text: string; border: string } {
  switch (tier) {
    case 'Diamond': return { bg: 'bg-cyan-50',     text: 'text-cyan-700',    border: 'border-cyan-200' }
    case 'Gold':    return { bg: 'bg-yellow-50',   text: 'text-yellow-700',  border: 'border-yellow-200' }
    case 'Silver':  return { bg: 'bg-gray-100',    text: 'text-gray-700',    border: 'border-gray-300' }
    case 'Pass':    return { bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-200' }
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
  const [copied, setCopied] = useState(false)

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
  const courseHeadline = `${langName} Programming`
  const learnerMeta = [profile?.registrationNumber, profile?.branch, profile?.year ? `Year ${profile.year}` : ''].filter(Boolean).join(' . ')

  // Only used to make the demo tier switcher (Pass/Silver/Gold/Diamond) produce a
  // representative overall score, since the PDF derives its tier from overallScore alone.
  const DEMO_TIER_SCORES: Record<string, number> = {
    Diamond: 92,
    Gold: 85,
    Silver: 70,
    Pass: 45,
  }

  const internalScore = examResult?.internalMarks ?? 0
  const externalScore = examResult?.externalMarks ?? 0
  const overallScore = demoTier
    ? DEMO_TIER_SCORES[demoTier] ?? (examResult?.combinedScore ?? 0)
    : examResult?.combinedScore ?? 0
  // Derived from overallScore rather than trusting the stored `tier` field, so a stale
  // Firestore record (written under an older threshold scheme) can never show a mismatched badge.
  const computedTier = getCertificateTier(overallScore)
  const effectiveTier = computedTier !== 'Failed' ? computedTier : undefined

  const verifyUrl = `/verify?certId=${encodeURIComponent(certId)}`

  const handleDownload = async () => {
    if (!canViewCertificate || isDownloading) return

    setIsDownloading(true)
    try {
      await downloadCertificatePdf({
        filename: `${langName.toLowerCase().replace(/\s+/g, '-')}${isDemoPreview ? '-demo' : ''}-certificate.pdf`,
        studentName,
        courseTitle: `${langName} Programming`,
        registrationNumber: profile?.registrationNumber || '',
        certificateId: certId,
        internalScore,
        externalScore,
        overallScore,
      })
    } finally {
      setIsDownloading(false)
    }
  }

  const handleCopyCertId = async () => {
    try {
      await navigator.clipboard.writeText(certId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable -- silently ignore, the ID is still visible to copy manually.
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
    <PageTransition>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        <BackButton fallbackHref={`/language/${params.id}`} label={`Back to ${langName}`} />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-black text-gray-900">{langName} Certificate</h1>

          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-full border text-xs font-semibold ${
              canViewCertificate
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-yellow-50 border-yellow-200 text-yellow-700'
            }`}>
              {canViewCertificate
                ? isDemoPreview
                  ? 'Demo certificate preview . full details and download enabled'
                  : `Certificate unlocked . ${concepts.length}/${concepts.length} concepts complete`
                : `${completedCount}/${concepts.length} concepts complete . certificate locked`}
            </div>
            {canViewCertificate && (
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm rounded-full shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                {isDownloading ? 'Preparing certificate...' : 'Download Certificate'}
              </button>
            )}
          </div>
        </div>

        {!canViewCertificate ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"
          >
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="inline-flex items-center gap-3 rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3">
                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-gray-900 font-bold text-sm">Certificate Locked</p>
                  <p className="text-gray-500 text-xs">Complete every concept in {langName} to unlock your professional certificate.</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{completedCount} of {concepts.length} concepts complete</p>
                    <p className="text-xs text-gray-400 mt-0.5">{progressPct}% of the {langName} learning track is finished.</p>
                  </div>
                  <p className="text-2xl font-black text-yellow-600">{progressPct}%</p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div className="h-full rounded-full bg-yellow-400 transition-all duration-700" style={{ width: `${progressPct}%` }} />
                </div>
              </div>

              <div>
                <p className="text-sm font-bold text-gray-900 mb-3">Remaining concepts</p>
                {remainingConcepts.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {remainingConcepts.map((concept) => (
                      <span
                        key={concept.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-600"
                      >
                        {concept.title}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">You are almost there.</p>
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-5">
              <Logo variant="nav" />
              <div>
                <p className="text-[11px] font-bold tracking-[0.24em] uppercase text-yellow-600">Preview</p>
                <h2 className="text-xl font-black text-gray-900 mt-1">Completion Certificate</h2>
                <p className="text-sm text-gray-500 mt-2">
                  Your final certificate will unlock automatically once all {concepts.length} concepts are complete.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-xl bg-gray-900 px-4 py-4">
                  <p className="text-2xl font-black text-white">{completedCount}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Done</p>
                </div>
                <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-4">
                  <p className="text-2xl font-black text-yellow-700">{Math.max(concepts.length - completedCount, 0)}</p>
                  <p className="text-xs text-yellow-700 mt-0.5">Remaining</p>
                </div>
              </div>

              <Link
                href={`/language/${params.id}`}
                className="inline-flex items-center justify-center w-full rounded-full bg-gray-900 hover:bg-gray-800 px-5 py-3 text-sm font-bold text-white transition-colors"
              >
                Continue Learning
              </Link>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {isDemoPreview && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Demo Preview</p>
                    <p className="text-sm text-blue-900 mt-1">Visible only to sastraism@gmail.com for certificate QA and download testing.</p>
                  </div>
                  <FlaskConical className="w-6 h-6 text-blue-600 shrink-0" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-bold text-blue-700 self-center">Preview tier:</span>
                  {['Pass', 'Silver', 'Gold', 'Diamond'].map(t => {
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

            {/* -- Certificate summary card -------------------------------- */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="flex items-start justify-between gap-6 flex-wrap">
                <div className="flex items-center gap-3">
                  <Logo variant="nav" />
                  <div>
                    <p className="text-[11px] font-bold tracking-[0.24em] uppercase text-gray-400">CoderPlay AI Credential</p>
                    <p className="text-xs text-gray-500 mt-0.5">Verified professional course completion</p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-black tracking-wide text-emerald-700">VERIFIED ACHIEVEMENT</span>
                </div>
              </div>

              <div className="mt-8 text-center">
                <p className="text-sm font-semibold text-gray-500">This certifies that</p>
                <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mt-2">{studentName}</h2>
                <p className="text-sm text-gray-500 mt-3">has successfully completed</p>
                <h3 className="text-2xl sm:text-3xl font-black text-yellow-600 mt-1">{courseHeadline}</h3>

                {effectiveTier && (() => {
                  const ts = tierBadgeStyle(effectiveTier)
                  return (
                    <div className={`inline-flex items-center gap-2 px-6 py-2 mt-5 rounded-full border font-black text-sm ${ts.bg} ${ts.text} ${ts.border}`}>
                      {effectiveTier} Tier{demoTier ? ' (Demo)' : ''}
                    </div>
                  )
                })()}
              </div>

              {/* Marks / stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
                  <p className="text-xl font-black text-gray-900">{internalScore}<span className="text-sm text-gray-400">/25</span></p>
                  <p className="text-xs text-gray-400 mt-0.5">Internal Marks</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
                  <p className="text-xl font-black text-gray-900">{externalScore}<span className="text-sm text-gray-400">/75</span></p>
                  <p className="text-xs text-gray-400 mt-0.5">External Marks</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                  <p className="text-xl font-black text-yellow-700">{overallScore}<span className="text-sm text-yellow-500">/100</span></p>
                  <p className="text-xs text-yellow-700 mt-0.5">Overall Score</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
                  <p className="text-xl font-black text-gray-900">{concepts.length}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Concepts Completed</p>
                </div>
              </div>

              {/* Learner + issue details */}
              <div className="grid sm:grid-cols-3 gap-3 mt-4">
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">Certificate ID</p>
                  <p className="text-sm font-black text-gray-900 mt-1 break-all font-mono">{certId}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">Issue Date</p>
                  <p className="text-sm font-black text-gray-900 mt-1">{issuedOnLabel}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">Learner Record</p>
                  <p className="text-sm font-semibold text-gray-700 mt-1">{learnerMeta || 'Not provided'}</p>
                </div>
              </div>

              {isDemoPreview && (
                <p className="text-xs text-blue-600 mt-4 font-medium text-center">
                  Demo preview active -- download is enabled for testing.
                </p>
              )}
            </div>

            {/* -- Verification & next steps -------------------------------- */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <QrCode className="w-5 h-5 text-gray-500" />
                  <h3 className="font-bold text-gray-900">Verify this certificate</h3>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">
                  Every downloaded PDF includes a QR code in the bottom-left corner. Scanning it, or opening the link below,
                  confirms this certificate is authentic and was issued by CoderPlay AI.
                </p>
                <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 mb-3">
                  <span className="text-xs font-mono text-gray-700 truncate flex-1">{certId}</span>
                  <button
                    type="button"
                    onClick={handleCopyCertId}
                    className="text-xs font-bold text-yellow-700 hover:text-yellow-800 shrink-0"
                  >
                    {copied ? 'Copied!' : 'Copy ID'}
                  </button>
                </div>
                <Link
                  href={verifyUrl}
                  target="_blank"
                  className="inline-flex items-center gap-2 text-sm font-bold text-gray-900 hover:text-yellow-700 transition-colors"
                >
                  Open verification page <ExternalLink className="w-4 h-4" />
                </Link>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">What to do next</h3>
                <ul className="space-y-2.5">
                  {[
                    'Download your certificate PDF using the button above.',
                    'Share it on LinkedIn, your resume, or with recruiters.',
                    'Anyone can verify it is genuine using the QR code or the Certificate ID above.',
                    'Keep the Certificate ID handy -- it stays valid and verifiable at any time.',
                  ].map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {concepts.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <h3 className="text-gray-900 font-bold text-base">Concepts in this learning track</h3>
                <p className="text-gray-500 text-sm">Each concept must be completed across all 3 stages to count toward the certificate.</p>
              </div>
              <div className="text-sm font-semibold text-yellow-600">
                {completedCount}/{concepts.length} complete
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {concepts.map((concept) => {
                const done = isConceptComplete(progress, concept.id)
                return (
                  <div
                    key={concept.id}
                    className={`rounded-xl border px-4 py-3 text-sm ${
                      done
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-gray-50 border-gray-100 text-gray-500'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{done ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Lock className="w-4 h-4 text-gray-400" />}</span>
                      <span className="font-medium">{concept.title}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
