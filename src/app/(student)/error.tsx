'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function StudentError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[StudentError]', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-sm space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto text-3xl">
          ??????
        </div>
        <div>
          <h2 className="text-lg font-black text-gray-900">Page error</h2>
          <p className="text-sm text-gray-500 mt-1">Something went wrong loading this page. Your progress is safe in Firestore.</p>
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={reset}
            className="w-full px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm rounded-xl transition-colors">
            Try again
          </button>
          <Link href="/dashboard"
            className="w-full px-5 py-2.5 border border-gray-200 text-gray-600 font-medium text-sm rounded-xl hover:bg-gray-50 transition-colors text-center">
            Back to Dashboard
          </Link>
        </div>
        {error.digest && (
          <p className="text-xs text-gray-300 font-mono">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
