'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { BarChart2, Users, ClipboardList, LogOut } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ThemeToggle } from '@/components/shared/ThemeToggle'

const ADMIN_CODE = 'admin1115'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('cp_admin_auth')
    if (stored === ADMIN_CODE) {
      setAuthed(true)
    } else if (pathname !== '/admin/login') {
      router.replace('/admin/login')
    } else {
      setAuthed(false)
    }
  }, [pathname, router])

  if (pathname === '/admin/login') return <>{children}</>
  if (authed === null) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!authed) return null

  const nav: { href: string; label: string; Icon: LucideIcon }[] = [
    { href: '/admin/dashboard',   label: 'Dashboard',       Icon: BarChart2     },
    { href: '/admin/students',    label: 'Students',        Icon: Users         },
    { href: '/admin/mock-tests',  label: 'Placement Tests', Icon: ClipboardList },
  ]

  const handleLogout = () => {
    localStorage.removeItem('cp_admin_auth')
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white dark:bg-[#111111] border-r border-gray-100 dark:border-gray-800 flex flex-col py-6 px-4 fixed top-0 left-0 h-full z-20">
        <div className="mb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-yellow-400 rounded-xl flex items-center justify-center text-sm font-black text-black">CP</div>
            <div>
              <p className="text-sm font-black text-gray-900 dark:text-gray-100">CoderPlay</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {nav.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/30'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <item.Icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Theme toggle + logout */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-3 py-1">
            <span className="text-xs text-gray-400 dark:text-gray-500">Theme</span>
            <ThemeToggle />
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors font-semibold"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-56 flex-1 p-8">
        {children}
      </main>
    </div>
  )
}
