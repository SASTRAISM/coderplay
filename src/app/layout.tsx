import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { ThemeProvider } from '@/context/ThemeContext'

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
        {/* Anti-FOUC: apply saved theme before first paint */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('cp_theme');
            if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            if (t === 'dark') document.documentElement.classList.add('dark');
          } catch(e) {}
        `}} />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
          }
          if ('caches' in window) {
            caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
          }
        `}} />
      </head>
      <body className="min-h-screen bg-white dark:bg-[#0A0A0A] text-gray-900 dark:text-gray-50 antialiased">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
