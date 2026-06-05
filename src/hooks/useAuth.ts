'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { User } from 'firebase/auth'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signOut,
  resetPassword,
  verifyEmail,
  onAuthStateChange,
} from '@/lib/firebase/auth'
import { createUserProfile, getUserProfile } from '@/lib/firebase/firestore'
import type { UserProfile } from '@/types'

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string, extras?: { registrationNumber?: string; branch?: string; year?: string }) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  clearError: () => void
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  error: null,
  signIn: async () => {},
  signUp: async () => {},
  loginWithGoogle: async () => {},
  logout: async () => {},
  sendPasswordReset: async () => {},
  clearError: () => {},
})

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  return context
}

export function useAuthState() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        try {
          const userProfile = await getUserProfile(firebaseUser.uid)
          setProfile(userProfile)
        } catch {
          console.error('Failed to load user profile')
        }
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null)
    try {
      const credential = await signInWithEmail(email, password)
      if (!credential.user.emailVerified) {
        await signOut()
        setError('Please verify your email before signing in. Check your inbox.')
        throw new Error('email-not-verified')
      }
      // Mark online immediately so admin dashboard updates without waiting for the 30s ping
      updateDoc(doc(db, 'users', credential.user.uid), { lastSeen: serverTimestamp() }).catch(() => {})
    } catch (err: unknown) {
      const token = getFirebaseErrorToken(err)
      if (token === 'email-not-verified') throw err
      setError(parseFirebaseError(token))
      throw err
    }
  }, [])

  const signUp = useCallback(async (email: string, password: string, displayName: string, extras?: { registrationNumber?: string; branch?: string; year?: string }) => {
    setError(null)
    try {
      const credential = await signUpWithEmail(email, password, displayName)
      await verifyEmail(credential.user)
      await createUserProfile(credential.user.uid, {
        uid: credential.user.uid,
        email: credential.user.email || email,
        displayName,
        xp: 0,
        level: 1,
        ...(extras?.registrationNumber && { registrationNumber: extras.registrationNumber }),
        ...(extras?.branch && { branch: extras.branch }),
        ...(extras?.year && { year: extras.year }),
      })
      await signOut()
    } catch (err: unknown) {
      setError(parseFirebaseError(getFirebaseErrorToken(err)))
      throw err
    }
  }, [])

  const loginWithGoogle = useCallback(async () => {
    setError(null)
    try {
      const credential = await signInWithGoogle()
      const existing = await getUserProfile(credential.user.uid)
      if (!existing) {
        await createUserProfile(credential.user.uid, {
          uid: credential.user.uid,
          email: credential.user.email || '',
          displayName: credential.user.displayName || 'Student',
          photoURL: credential.user.photoURL || undefined,
          xp: 0,
          level: 1,
        })
      }
      // Mark online immediately so admin dashboard updates without waiting for the 30s ping
      updateDoc(doc(db, 'users', credential.user.uid), { lastSeen: serverTimestamp() }).catch(() => {})
    } catch (err: unknown) {
      setError(parseFirebaseError(getFirebaseErrorToken(err)))
      throw err
    }
  }, [])

  const logout = useCallback(async () => {
    await signOut()
  }, [])

  const sendPasswordReset = useCallback(async (email: string) => {
    setError(null)
    try {
      await resetPassword(email)
    } catch (err: unknown) {
      setError(parseFirebaseError(getFirebaseErrorToken(err)))
      throw err
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return {
    user,
    profile,
    loading,
    error,
    signIn,
    signUp,
    loginWithGoogle,
    logout,
    sendPasswordReset,
    clearError,
  }
}

function getFirebaseErrorToken(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = error.code
    if (typeof code === 'string') return code.toLowerCase()
  }
  if (error instanceof Error) return error.message.toLowerCase()
  return ''
}

function parseFirebaseError(token: string): string {
  if (token.includes('user-not-found')) return 'No account found with this email.'
  if (token.includes('wrong-password')) return 'Incorrect password. Please try again.'
  if (token.includes('invalid-credential') || token.includes('invalid-login-credentials')) {
    return 'Incorrect email or password. Please try again.'
  }
  if (token.includes('user-disabled')) return 'This account has been disabled.'
  if (token.includes('email-already-in-use')) return 'An account with this email already exists.'
  if (token.includes('weak-password')) return 'Password should be at least 6 characters.'
  if (token.includes('invalid-email')) return 'Please enter a valid email address.'
  if (token.includes('operation-not-allowed')) return 'Email/password sign-in is not enabled for this Firebase project.'
  if (token.includes('api-key-not-valid') || token.includes('app-not-authorized')) {
    return 'Firebase configuration is invalid for this app.'
  }
  if (token.includes('too-many-requests')) return 'Too many attempts. Please try again later.'
  if (token.includes('network-request-failed')) return 'Network error. Check your connection.'
  return 'Something went wrong. Please try again.'
}