'use client'

import { createContext, useContext, useState, useCallback } from 'react'

interface ExamModeContextValue {
  examMode: boolean
  enterExamMode: () => void
  exitExamMode: () => void
}

const ExamModeContext = createContext<ExamModeContextValue>({
  examMode: false,
  enterExamMode: () => {},
  exitExamMode: () => {},
})

export function ExamModeProvider({ children }: { children: React.ReactNode }) {
  const [examMode, setExamMode] = useState(false)
  const enterExamMode = useCallback(() => setExamMode(true), [])
  const exitExamMode = useCallback(() => setExamMode(false), [])
  return (
    <ExamModeContext.Provider value={{ examMode, enterExamMode, exitExamMode }}>
      {children}
    </ExamModeContext.Provider>
  )
}

export function useExamMode() {
  return useContext(ExamModeContext)
}
