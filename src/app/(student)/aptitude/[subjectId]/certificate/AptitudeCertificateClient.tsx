'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { useAuth } from '@/hooks/useAuth'
import { APTITUDE_SUBJECTS } from '@/data/aptitudeData'
import { notFound } from 'next/navigation'

interface AptitudeExamResult {
  uid: string
  subjectId: string
  score: number
  totalMarks: number
  percentage: number
  passed: boolean
  submittedAt: unknown
}

function formatDate(value: unknown): string {
  if (!value) return new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  try {
    const d = typeof value === 'object' && value !== null && 'toDate' in value
      ? (value as { toDate: () => Date }).toDate()
      : new Date(value as string | number | Date)
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  }
}

function generateCertId(uid: string, subjectId: string): string {
  const base = `${uid}-${subjectId}`.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const hex = base.toString(16).toUpperCase().padStart(8, '0')
  return `CPA-APT-${subjectId.toUpperCase().slice(0, 4)}-${hex}`
}

export default function AptitudeCertificateClient({ params }: { params: { subjectId: string } }) {
  const subject = APTITUDE_SUBJECTS.find(s => s.id === params.subjectId)
  if (!subject) notFound()

  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()

  const [result, setResult] = useState<AptitudeExamResult | null | undefined>(undefined)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setResult(null)
      return
    }
    getDoc(doc(db, 'aptitudeExamResults', `${user.uid}_${params.subjectId}`)).then(snap => {
      if (snap.exists()) {
        const data = snap.data() as AptitudeExamResult
        setResult(data)
        if (!data.passed) {
          router.replace(`/aptitude/${params.subjectId}/exam`)
        }
      } else {
        setResult(null)
        router.replace(`/aptitude/${params.subjectId}/exam`)
      }
    }).catch(() => {
      setResult(null)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.uid, params.subjectId])

  const studentName = profile?.displayName || user?.displayName || 'Student'
  const registrationNumber = profile?.registrationNumber || ''
  const certId = user ? generateCertId(user.uid, params.subjectId) : `CPA-APT-PREVIEW`
  const issuedOn = result && result.passed ? formatDate(result.submittedAt) : formatDate(new Date())

  // Loading
  if (authLoading || result === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Not passed / no result -- redirecting
  if (!result || !result.passed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-400">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-amber-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back button */}
        <div className="flex items-center justify-between">
          <Link
            href={`/aptitude/${params.subjectId}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to {subject.title}
          </Link>
          <span className="text-xs font-bold text-green-700 bg-green-100 border border-green-200 px-3 py-1.5 rounded-full">
            + Certificate Unlocked
          </span>
        </div>

        {/* Certificate card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-3xl border-4 border-yellow-400 shadow-2xl overflow-hidden relative"
        >
          {/* Decorative corners */}
          <div className="absolute top-0 left-0 w-20 h-20 bg-yellow-400 opacity-20 rounded-br-full" />
          <div className="absolute bottom-0 right-0 w-20 h-20 bg-indigo-500 opacity-10 rounded-tl-full" />

          <div className="relative px-8 py-10 sm:px-12 sm:py-14 space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black tracking-widest text-yellow-600 uppercase">CoderPlay AI</p>
                <p className="text-xs text-gray-400 mt-0.5">Aptitude Achievement Credential</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-indigo-600 border-4 border-yellow-400 flex items-center justify-center shrink-0">
                <span className="text-2xl">{subject.icon}</span>
              </div>
            </div>

            {/* Title */}
            <div className="text-center border-y border-yellow-100 py-6 space-y-2">
              <p className="text-xs font-black tracking-widest text-gray-400 uppercase">Certificate of Achievement</p>
              <h1 className="text-4xl sm:text-5xl font-black text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>
                CERTIFICATE
              </h1>
              <p className="text-sm text-gray-500">This certifies that</p>
              <h2 className="text-3xl sm:text-4xl font-black text-yellow-600 mt-2" style={{ fontFamily: 'Georgia, serif' }}>
                {studentName}
              </h2>
              {registrationNumber && (
                <p className="text-sm text-gray-400 font-medium">{registrationNumber}</p>
              )}
            </div>

            {/* Body */}
            <div className="text-center space-y-3">
              <p className="text-base text-gray-600">has successfully completed the aptitude course</p>
              <h3 className="text-2xl sm:text-3xl font-black text-indigo-700">
                {subject.title}
              </h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                with a score of <strong className="text-gray-800">{result.score}/{result.totalMarks}</strong> ({result.percentage.toFixed(1)}%) on the comprehensive final exam at CoderPlay AI.
              </p>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-6 py-4 text-center min-w-[120px]">
                <p className="text-2xl font-black text-yellow-700">{result.percentage.toFixed(0)}%</p>
                <p className="text-xs text-gray-500 mt-1 font-medium">Score Achieved</p>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl px-6 py-4 text-center min-w-[120px]">
                <p className="text-2xl font-black text-indigo-700">{result.score}</p>
                <p className="text-xs text-gray-500 mt-1 font-medium">Marks Scored</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-2xl px-6 py-4 text-center min-w-[120px]">
                <p className="text-xs font-black text-green-700 mt-1">+ PASSED</p>
                <p className="text-xs text-gray-500 mt-1 font-medium">Status</p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100">
              <div className="text-left">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Issue Date</p>
                <p className="text-sm font-black text-gray-700 mt-0.5">{issuedOn}</p>
              </div>
              <div className="text-center bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Certificate ID</p>
                <p className="text-sm font-black text-gray-700 mt-0.5 break-all">{certId}</p>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-yellow-200 bg-yellow-50 px-4 py-2">
                  <span className="text-yellow-500">*</span>
                  <span className="text-xs font-black tracking-wide text-gray-700">VERIFIED</span>
                  <span className="text-yellow-500">*</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
