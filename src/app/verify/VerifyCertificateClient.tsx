'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Logo } from '@/components/shared/Logo'

type VerificationStatus = 'loading' | 'verified' | 'invalid'

interface CertificateRecord {
  certificateId: string
  studentName: string
  courseTitle: string
  issuedOn: string
  tier: string
}

const CERT_ID_PATTERN = /^CPA-[A-Z0-9]+-[A-F0-9]{8}$/

/**
 * Placeholder for a real verification API call. Replace with a fetch to the
 * backend (e.g. `GET /api/certificates/:certificateId`) once certificate
 * records are persisted server-side and can be looked up by ID.
 */
async function fetchCertificateRecord(certificateId: string): Promise<CertificateRecord | null> {
  await new Promise((resolve) => setTimeout(resolve, 900))

  if (!CERT_ID_PATTERN.test(certificateId)) return null

  const langId = certificateId.split('-')[1]?.toLowerCase() || 'course'

  return {
    certificateId,
    studentName: 'Certificate Holder',
    courseTitle: `${langId.toUpperCase()} Programming`,
    issuedOn: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
    tier: 'Verified',
  }
}

export default function VerifyCertificateClient() {
  const searchParams = useSearchParams()
  const certificateId = searchParams.get('certId') || ''

  const [status, setStatus] = useState<VerificationStatus>('loading')
  const [record, setRecord] = useState<CertificateRecord | null>(null)

  useEffect(() => {
    if (!certificateId) {
      setStatus('invalid')
      return
    }

    let cancelled = false

    setStatus('loading')
    fetchCertificateRecord(certificateId).then((result) => {
      if (cancelled) return
      setRecord(result)
      setStatus(result ? 'verified' : 'invalid')
    })

    return () => {
      cancelled = true
    }
  }, [certificateId])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.18),transparent_32%),linear-gradient(180deg,#111827_0%,#0f172a_48%,#020617_100%)] px-4 py-12 flex flex-col items-center">
      <div className="mb-10">
        <Logo variant="hero" href="/" />
      </div>

      <div className="w-full max-w-lg rounded-[32px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-8 sm:p-10 shadow-2xl text-center">
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="w-12 h-12 text-yellow-400 animate-spin" />
            <p className="text-gray-300 text-sm font-medium">Verifying certificate...</p>
          </div>
        )}

        {status === 'verified' && record && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Certificate Verified</h1>
              <p className="text-emerald-300 text-sm mt-1">This certificate is authentic and issued by CoderPlay AI.</p>
            </div>

            <div className="w-full mt-4 rounded-2xl border border-white/10 bg-black/20 divide-y divide-white/10 text-left">
              <div className="px-5 py-3 flex justify-between gap-4">
                <span className="text-xs uppercase tracking-wide text-gray-400">Certificate ID</span>
                <span className="text-sm font-mono text-white">{record.certificateId}</span>
              </div>
              <div className="px-5 py-3 flex justify-between gap-4">
                <span className="text-xs uppercase tracking-wide text-gray-400">Course</span>
                <span className="text-sm font-semibold text-white">{record.courseTitle}</span>
              </div>
              <div className="px-5 py-3 flex justify-between gap-4">
                <span className="text-xs uppercase tracking-wide text-gray-400">Issued On</span>
                <span className="text-sm text-white">{record.issuedOn}</span>
              </div>
            </div>
          </div>
        )}

        {status === 'invalid' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-rose-500/15 border border-rose-400/30 flex items-center justify-center">
              <XCircle className="w-9 h-9 text-rose-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Certificate Not Found</h1>
              <p className="text-rose-300 text-sm mt-1">
                {certificateId
                  ? <>We couldn&apos;t verify a certificate with ID <span className="font-mono">{certificateId}</span>.</>
                  : 'No certificate ID was provided.'}
              </p>
            </div>
            <p className="text-gray-400 text-xs max-w-sm">
              Double-check the QR code or link you used. If you believe this is an error, contact CoderPlay AI support.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
