'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, BarChart2, Trophy, Zap, Timer, LogOut, User, ChevronLeft, ChevronRight, Menu } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Logo } from '@/components/shared/Logo'
import { addTimeSpent, listenToProgress, updateStreak, updateUserProfile } from '@/lib/firebase/firestore'
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { getTodayTimeSpentMinutes } from '@/lib/studyStats'
import { cn } from '@/lib/utils'
import type { UserProgress } from '@/types'

interface NavLink { href: string; Icon: LucideIcon; label: string }

const navLinks: NavLink[] = [
  { href: '/dashboard',    Icon: LayoutDashboard, label: 'Dashboard'    },
  { href: '/progress',     Icon: BarChart2,        label: 'Progress'     },
  { href: '/achievements', Icon: Trophy,           label: 'Achievements' },
  { href: '/profile',      Icon: User,             label: 'Profile'      },
]

const SIDEBAR_KEY = 'cp_sidebar_collapsed'

export function StudentNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, profile, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem(SIDEBAR_KEY) === '1'
    return false
  })
  const [progress, setProgress] = useState<UserProgress | null>(null)

  const displayName = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Student'
  const initials = displayName.split(' ').slice(0, 2).map((n: string) => n[0]?.toUpperCase() || '').join('')
  const xp = profile?.xp ?? 0
  const todayMinutes = getTodayTimeSpentMinutes(progress)

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0')
      return next
    })
  }

  useEffect(() => {
    if (!user) return

    const unsubscribe = listenToProgress(user.uid, setProgress)
    updateStreak(user.uid).catch(() => {})

    const pingPresence = async () => {
      try {
        const userRef = doc(db, 'users', user.uid)
        const snap = await getDoc(userRef)
        const data = snap.data() as { onlineSince?: unknown; lastSeen?: unknown } | undefined
        const now = Date.now()
        const lastSeenMs = (() => {
          const ls = data?.lastSeen
          if (!ls) return 0
          if (typeof ls === 'object' && ls !== null && 'seconds' in ls) return (ls as { seconds: number }).seconds * 1000
          if (typeof ls === 'string') return new Date(ls).getTime()
          return 0
        })()
        const wasOffline = now - lastSeenMs > 180_000
        await updateDoc(userRef, {
          lastSeen: serverTimestamp(),
          ...(wasOffline ? { onlineSince: serverTimestamp() } : {}),
        })
      } catch { /* ignore */ }
    }
    pingPresence()
    const presenceInterval = window.setInterval(pingPresence, 60_000)

    const interval = window.setInterval(() => {
      addTimeSpent(user.uid, 1).catch(() => {})
    }, 60_000)

    return () => {
      unsubscribe()
      window.clearInterval(interval)
      window.clearInterval(presenceInterval)
    }
  }, [user])

  const handleLogout = async () => {
    if (user) {
      try { await updateUserProfile(user.uid, { lastSeen: new Date(0).toISOString() } as never) } catch {}
    }
    await logout()
    router.replace('/')
  }

  const normalizePath = (path: string) => path.replace(/\/$/, '')
  const normalizedPathname = normalizePath(pathname)

  const isActive = (href: string) => {
    const normalizedHref = normalizePath(href)
    return (
      normalizedPathname === normalizedHref ||
      normalizedPathname.startsWith(normalizedHref + '/')
    )
  }

  return (
    <aside
      className={cn(
        'shrink-0 h-full flex flex-col bg-white border-r border-gray-100 transition-all duration-300 z-40 relative',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo + collapse toggle */}
      <div className={cn('flex items-center border-b border-gray-100 shrink-0', collapsed ? 'justify-center px-0 py-4' : 'justify-between px-4 py-4')}>
        {!collapsed && <Logo variant="nav" href="/dashboard" onLight />}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
        {navLinks.map((link) => {
          const active = isActive(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              title={collapsed ? link.label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all',
                collapsed ? 'justify-center' : '',
                active
                  ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              <link.Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{link.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: stats + user + logout */}
      <div className="shrink-0 border-t border-gray-100 p-3 space-y-2">
        {/* XP + Time stats (only when expanded) */}
        {!collapsed && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-1.5">
              <Zap className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
              <span className="text-xs font-bold text-yellow-700">{xp.toLocaleString()} XP</span>
            </div>
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5">
              <Timer className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="text-xs font-bold text-emerald-700">Today {todayMinutes}m</span>
            </div>
          </div>
        )}

        {/* Avatar row */}
        <div className={cn('flex items-center gap-2', collapsed ? 'justify-center' : '')}>
          <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-black text-xs font-black shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate">{displayName}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          title={collapsed ? 'Sign out' : undefined}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors',
            collapsed ? 'justify-center' : ''
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  )
}
