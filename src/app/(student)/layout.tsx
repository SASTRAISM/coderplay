'use client'

import { AuthGuard } from '@/components/auth/AuthGuard'
import { StudentNavbar } from '@/components/shared/StudentNavbar'
import { ExamModeProvider, useExamMode } from '@/context/ExamModeContext'

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { examMode } = useExamMode()
  if (examMode) {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-gray-50 dark:bg-[#0A0A0A]">
        <main className="flex-1 overflow-auto min-h-0">{children}</main>
      </div>
    )
  }
  return (
    <div className="h-screen flex overflow-hidden bg-gray-50 dark:bg-[#0A0A0A]">
      <StudentNavbar />
      <main className="flex-1 overflow-auto min-h-0">
        {children}
      </main>
    </div>
  )
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <ExamModeProvider>
        <LayoutInner>{children}</LayoutInner>
      </ExamModeProvider>
    </AuthGuard>
  )
}
