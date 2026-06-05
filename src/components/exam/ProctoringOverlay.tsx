'use client'

import { useCallback, useRef, useState } from 'react'
import { AlertTriangle, Lock, Monitor } from 'lucide-react'
import { useProctoring } from '@/hooks/useProctoring'
import { FullscreenPrompt } from '@/components/exam/FullscreenPrompt'

interface ProctoringOverlayProps {
  scopeLabel?: string
  showStatusBar?: boolean
  onTerminate?: () => void
  onBackAttempt?: () => void
  children: React.ReactNode
}

export function ProctoringOverlay({
  showStatusBar = false,
  onTerminate,
  onBackAttempt,
  children,
}: ProctoringOverlayProps) {
  const terminatingRef = useRef(false)
  const [countdown, setCountdown] = useState<number | null>(null)

  const handleTerminate = useCallback(() => {
    if (terminatingRef.current) return
    terminatingRef.current = true

    if (onTerminate) {
      try { onTerminate() } catch { /* ignore */ }
    }

    // Clear beforeunload so the browser doesn't show "Leave site?" dialog
    window.onbeforeunload = null

    // 3-second countdown then replace to dashboard
    let secs = 3
    setCountdown(secs)
    const tick = window.setInterval(() => {
      secs -= 1
      if (secs <= 0) {
        window.clearInterval(tick)
        window.location.replace('/dashboard')
      } else {
        setCountdown(secs)
      }
    }, 1000)
  }, [onTerminate])

  const proctoring = useProctoring({
    requireFullscreen: true,
    onAutoSubmit: handleTerminate,
    onBackAttempt,
  })

  return (
    <div className="relative h-full flex flex-col">
      {/* Optional proctoring status bar (used by stages that don't have their own) */}
      {showStatusBar && countdown === null && proctoring.isFullscreen && (
        <div className={`fixed top-0 left-0 right-0 z-[150] px-4 py-1 flex items-center justify-between text-xs font-bold ${proctoring.violations > 0 ? 'bg-orange-500 text-white' : 'bg-gray-900 text-gray-300'}`}>
          <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> PROCTORED EXAM</span>
          <span className="flex items-center gap-3">
            {proctoring.violations > 0 && <span className="text-yellow-200 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {proctoring.violations}/2 violations</span>}
            <span className="flex items-center gap-1"><Monitor className="w-3 h-3" /> Fullscreen</span>
          </span>
        </div>
      )}

      {/* Fullscreen prompt -- shown when not in fullscreen, no violation triggered */}
      {!proctoring.isFullscreen && countdown === null && (
        <FullscreenPrompt onEnter={proctoring.enterFullscreen} />
      )}

      {/* Termination countdown -- covers everything, no "Leave site?" since we cleared onbeforeunload */}
      {countdown !== null && (
        <div className="fixed inset-0 z-[500] bg-black/95 flex flex-col items-center justify-center gap-6">
          <div className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center text-white text-4xl font-black">
            {countdown}
          </div>
          <div className="text-center">
            <p className="text-white text-xl font-black">Session Terminated</p>
            <p className="text-gray-400 text-sm mt-1">
              Returning to dashboard in {countdown} second{countdown !== 1 ? 's' : ''}...
            </p>
          </div>
        </div>
      )}

      {children}
    </div>
  )
}
