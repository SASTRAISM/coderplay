'use client'

import { motion } from 'framer-motion'

type ViolationModalType = 'warn1' | 'warn2' | 'terminated' | null

interface ExamViolationModalProps {
  type: NonNullable<ViolationModalType>
  onDismiss: () => void
}

export function ExamViolationModal({ type, onDismiss }: ExamViolationModalProps) {
  const isFinal = type === 'warn2'
  const isTerminated = type === 'terminated'

  if (isTerminated) {
    return (
      <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 24 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center space-y-5 border-4 border-red-600"
        >
          <div className="w-20 h-20 mx-auto rounded-full bg-red-100 flex items-center justify-center text-4xl font-black text-red-600">
            X
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide bg-red-100 text-red-700">
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            Session Terminated
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-gray-900">Exam Terminated</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              You have exceeded the maximum number of violations. Your session has been terminated and your work submitted as-is. Redirecting to dashboard...
            </p>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        className={`bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center space-y-5 border-4 ${isFinal ? 'border-red-500' : 'border-yellow-500'}`}
      >
        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-4xl font-black ${isFinal ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
          !
        </div>

        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide ${isFinal ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {isFinal ? 'Final Warning' : 'Violation Flagged'}
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-black text-gray-900">{isFinal ? 'Final Warning' : 'Warning - 1 Strike'}</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            {isFinal
              ? 'This is your final warning. One more violation will immediately terminate your exam session and your work will be submitted as-is.'
              : 'A violation has been recorded. This is your only warning -- one more violation will immediately terminate your session and redirect you to the dashboard.'}
          </p>
        </div>

        <div className="rounded-xl p-3 text-left space-y-1 bg-gray-50 border border-gray-100">
          <p className="text-xs font-bold text-gray-600">Prohibited during this exam:</p>
          {['Switching tabs or windows', 'Pressing Escape or F-keys', 'Copy / Paste / Screenshot', 'Using browser back button'].map(r => (
            <p key={r} className="text-xs text-gray-500">- {r}</p>
          ))}
        </div>

        {/* Clicking this button IS a user gesture -- fullscreen re-entry will succeed */}
        <button
          type="button"
          onClick={onDismiss}
          className={`w-full py-3 font-black text-sm rounded-xl transition-colors ${isFinal ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-yellow-400 hover:bg-yellow-500 text-black'}`}
        >
          {isFinal ? 'I Understand - Final Warning' : 'I Understand - Last Chance'}
        </button>
      </motion.div>
    </div>
  )
}
