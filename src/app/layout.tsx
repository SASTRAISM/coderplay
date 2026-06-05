import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/auth/AuthProvider'

export const metadata: Metadata = {
  title: {
    default: 'CoderPlay AI -- Learn Coding with AI',
    template: '%s | CoderPlay AI',
  },
  description:
    'CoderPlay AI is an AI-powered coding learning platform for college students. Master programming concepts through guided AI chat, smart assessments, and hands-on coding challenges.',
  keywords: ['coding', 'learn programming', 'AI tutor', 'python', 'java', 'web development', 'edtech'],
  authors: [{ name: 'CoderPlay AI' }],
  openGraph: {
    title: 'CoderPlay AI -- Learn Coding with AI',
    description: 'Build strong coding foundations through guided AI learning, assessments, and coding practice.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#EAB308',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          // Unregister stale service workers and clear old caches on every load
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
          }
          if ('caches' in window) {
            caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
          }
        `}} />
      </head>
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}