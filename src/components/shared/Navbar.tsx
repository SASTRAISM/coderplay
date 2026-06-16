'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { Logo } from '@/components/shared/Logo'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { cn } from '@/lib/utils'

const publicLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Languages', href: '#languages' },
]

const studentLinks = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Progress', href: '/progress' },
  { label: 'Achievements', href: '/achievements' },
]

export function Navbar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const isStudentArea = pathname.startsWith('/dashboard') || pathname.startsWith('/language') || pathname.startsWith('/concept') || pathname.startsWith('/learn') || pathname.startsWith('/profile') || pathname.startsWith('/progress') || pathname.startsWith('/achievements')

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const links = isStudentArea ? studentLinks : publicLinks

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/95 dark:bg-[#0A0A0A]/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 shadow-sm'
          : 'bg-transparent'
      )}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Logo variant="nav" href={user ? '/dashboard' : '/'} onLight />

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'text-sm font-medium transition-colors',
                pathname === l.href
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          {user ? (
            <>
              <Link href="/profile" className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-black text-xs font-bold">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              </Link>
              <button
                onClick={logout}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="text-sm font-semibold bg-yellow-500 hover:bg-yellow-400 text-black px-5 py-2 rounded-full transition-colors shadow-sm"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <div className="w-5 flex flex-col gap-1.5">
            <span className={cn('block h-0.5 bg-gray-800 dark:bg-gray-200 transition-all', menuOpen && 'rotate-45 translate-y-2')} />
            <span className={cn('block h-0.5 bg-gray-800 dark:bg-gray-200 transition-all', menuOpen && 'opacity-0')} />
            <span className={cn('block h-0.5 bg-gray-800 dark:bg-gray-200 transition-all', menuOpen && '-rotate-45 -translate-y-2')} />
          </div>
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden bg-white dark:bg-[#111111] border-b border-gray-100 dark:border-gray-800"
          >
            <div className="px-4 pb-4 pt-2 space-y-1">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  {l.label}
                </Link>
              ))}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800 mt-2 flex flex-col gap-2">
                <div className="flex items-center justify-between px-3 py-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Theme</span>
                  <ThemeToggle />
                </div>
                {user ? (
                  <button
                    onClick={() => { logout(); setMenuOpen(false) }}
                    className="w-full text-left px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    Sign out
                  </button>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">Sign In</Link>
                    <Link href="/signup" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm font-semibold bg-yellow-500 text-black rounded-full text-center">Get Started</Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
