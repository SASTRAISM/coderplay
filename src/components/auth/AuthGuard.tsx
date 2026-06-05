'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

function AuthStatusScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-yellow-500 animate-spin" />
        <p className="text-gray-500 text-sm font-medium">{message}</p>
      </div>
    </div>
  )
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const hasAccess = Boolean(user && user.emailVerified)

  useEffect(() => {
    if (!loading && !hasAccess) {
      router.replace('/login')
    }
  }, [hasAccess, loading, router])

  // Update lastSeen every 10s while student is active (admin "Online Now" uses 60s window)
  useEffect(() => {
    if (!hasAccess || !user) return
    const ping = () => {
      updateDoc(doc(db, 'users', user.uid), { lastSeen: serverTimestamp() }).catch(() => {})
    }
    ping()
    const interval = setInterval(ping, 10_000)
    return () => clearInterval(interval)
  }, [hasAccess, user])

  if (loading) return <AuthStatusScreen message="Loading your workspace..." />

  if (!hasAccess) {
    return (
      <AuthStatusScreen
        message={user ? 'Please verify your email before continuing...' : 'Redirecting to sign in...'}
      />
    )
  }

  return <>{children}</>
}