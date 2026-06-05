'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Logo } from '@/components/shared/Logo'

export default function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setError('')
    setIsSubmitting(true)
    try {
      await sendPasswordReset(email)
      setSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="mb-8">
          <Logo variant="nav" href="/" onLight />
        </div>

        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-5"
            >
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto"><Mail className="w-8 h-8 text-green-600" /></div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 mb-2">Check your inbox</h1>
                <p className="text-gray-500 text-sm leading-relaxed">
                  We sent a password reset link to <span className="font-semibold text-gray-800">{email}</span>.
                  Check your inbox (and spam folder).
                </p>
              </div>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
                The reset link expires in 1 hour. If you don&apos;t see the email, check your spam folder.
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => { setSent(false); setEmail('') }}
                  className="w-full py-3 border border-gray-200 text-gray-600 font-medium text-sm rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Try another email
                </button>
                <Link href="/login" className="block w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm rounded-xl text-center transition-colors">
                  Back to Sign In
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h1 className="text-2xl font-black text-gray-900 mb-1">Forgot your password?</h1>
              <p className="text-gray-500 text-sm mb-8">Enter your email and we&apos;ll send you a reset link.</p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-5">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email address</label>
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com" required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !email}
                  className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <><span className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" /> Sending?</>
                  ) : 'Send Reset Link'}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-6">
                Remember your password?{' '}
                <Link href="/login" className="font-semibold text-yellow-600 hover:text-yellow-700">Sign in</Link>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}