'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface BackButtonProps {
  fallbackHref?: string
  label?: string
  className?: string
}

export function BackButton({ fallbackHref = '/dashboard', label = 'Back', className }: BackButtonProps) {
  const router = useRouter()

  const handleClick = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.replace(fallbackHref)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors group ${className ?? ''}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        className="group-hover:-translate-x-0.5 transition-transform">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      <span>{label}</span>
    </button>
  )
}
