'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="text-center max-w-sm space-y-4">
            <div className="text-5xl">??????</div>
            <h1 className="text-xl font-black text-gray-900">Something went wrong</h1>
            <p className="text-sm text-gray-500">An unexpected error occurred. Your progress is safe.</p>
            <button type="button" onClick={reset}
              className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm rounded-xl transition-colors">
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
