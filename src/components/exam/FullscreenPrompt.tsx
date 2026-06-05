'use client'

import { motion } from 'framer-motion'
import { Maximize2 } from 'lucide-react'

interface FullscreenPromptProps {
  onEnter: () => void
}

export function FullscreenPrompt({ onEnter }: FullscreenPromptProps) {
  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center space-y-5 border-4 border-yellow-400"
      >
        <div className="w-20 h-20 mx-auto rounded-full bg-yellow-100 flex items-center justify-center">
          <Maximize2 className="w-9 h-9 text-yellow-600" />
        </div>

        <div>
          <h3 className="text-xl font-black text-gray-900 mb-2">Fullscreen Required</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            This exam runs in fullscreen mode. Switching tabs or windows counts as a violation. ESC and F-keys are blocked.
          </p>
        </div>

        <div className="rounded-xl p-3 text-left space-y-1 bg-gray-50 border border-gray-100">
          <p className="text-xs font-bold text-gray-600 mb-1">During this exam:</p>
          {[
            'Do not switch tabs or windows',
            'Tab switches are violations (max 2)',
            'ESC and F-keys are silently blocked',
            'Copy, paste and right-click are blocked',
          ].map(r => (
            <p key={r} className="text-xs text-gray-500">- {r}</p>
          ))}
        </div>

        <button
          type="button"
          onClick={onEnter}
          className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-black text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <Maximize2 className="w-4 h-4" />
          Enter Fullscreen to Begin
        </button>
      </motion.div>
    </div>
  )
}
