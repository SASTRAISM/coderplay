'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import {
  getUserProgress,
  updateUserProgress,
  markStageComplete,
} from '@/lib/firebase/firestore'
import type { UserProgress } from '@/types'
import { generateXP } from '@/lib/utils'

interface LanguageProgress {
  languageId: string
  completedConcepts: number
  totalConcepts: number
  percentage: number
}

interface OverallStats {
  totalXP: number
  conceptsCompleted: number
  stagesCompleted: number
  languagesStarted: number
}

interface UseProgressReturn {
  progress: UserProgress | null
  loading: boolean
  error: string | null
  updateConceptProgress: (conceptId: string, stage: 1 | 2 | 3) => Promise<void>
  getStagesCompleted: (conceptId: string) => number[]
  isStageComplete: (conceptId: string, stage: 1 | 2 | 3) => boolean
  isConceptComplete: (conceptId: string) => boolean
  getLanguageProgress: (languageId: string, conceptIds: string[], totalConcepts: number) => LanguageProgress
  getOverallStats: () => OverallStats
  refreshProgress: () => Promise<void>
}

export function useProgress(): UseProgressReturn {
  const { user, profile } = useAuth()
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProgress = useCallback(async () => {
    if (!user) {
      setProgress(null)
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const data = await getUserProgress(user.uid)
      setProgress(data)
    } catch (err) {
      setError('Failed to load progress')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  const updateConceptProgress = useCallback(
    async (conceptId: string, stage: 1 | 2 | 3) => {
      if (!user) return
      const xpEarned = generateXP(
        stage === 1 ? 'completeStage1' : stage === 2 ? 'completeStage2' : 'completeStage3'
      )
      try {
        await markStageComplete(user.uid, conceptId, stage, xpEarned)
        // Optimistic update
        setProgress((prev) => {
          if (!prev) {
            return {
              uid: user.uid,
              completedStages: { [conceptId]: [stage] },
              assessmentScores: {},
              timeSpent: {},
              updatedAt: new Date(),
            }
          }
          const existing = prev.completedStages[conceptId] || []
          return {
            ...prev,
            completedStages: {
              ...prev.completedStages,
              [conceptId]: existing.includes(stage) ? existing : [...existing, stage],
            },
          }
        })
      } catch (err) {
        setError('Failed to update progress')
        console.error(err)
      }
    },
    [user]
  )

  const getStagesCompleted = useCallback(
    (conceptId: string): number[] => {
      return progress?.completedStages?.[conceptId] || []
    },
    [progress]
  )

  const isStageComplete = useCallback(
    (conceptId: string, stage: 1 | 2 | 3): boolean => {
      const stages = progress?.completedStages?.[conceptId] || []
      return stages.includes(stage)
    },
    [progress]
  )

  const isConceptComplete = useCallback(
    (conceptId: string): boolean => {
      const stages = progress?.completedStages?.[conceptId] || []
      return stages.includes(1) && stages.includes(2) && stages.includes(3)
    },
    [progress]
  )

  const getLanguageProgress = useCallback(
    (languageId: string, conceptIds: string[], totalConcepts: number): LanguageProgress => {
      const completedConcepts = conceptIds.filter((id) => isConceptComplete(id)).length
      return {
        languageId,
        completedConcepts,
        totalConcepts,
        percentage: totalConcepts > 0 ? Math.round((completedConcepts / totalConcepts) * 100) : 0,
      }
    },
    [isConceptComplete]
  )

  const getOverallStats = useCallback((): OverallStats => {
    if (!progress) return { totalXP: 0, conceptsCompleted: 0, stagesCompleted: 0, languagesStarted: 0 }
    const allConceptIds = Object.keys(progress.completedStages)
    const conceptsCompleted = allConceptIds.filter((id) => isConceptComplete(id)).length
    const stagesCompleted = allConceptIds.reduce(
      (sum, id) => sum + (progress.completedStages[id]?.length || 0),
      0
    )
    return {
      totalXP: profile?.xp || 0,
      conceptsCompleted,
      stagesCompleted,
      languagesStarted: allConceptIds.length > 0 ? 1 : 0,
    }
  }, [progress, profile, isConceptComplete])

  return {
    progress,
    loading,
    error,
    updateConceptProgress,
    getStagesCompleted,
    isStageComplete,
    isConceptComplete,
    getLanguageProgress,
    getOverallStats,
    refreshProgress: fetchProgress,
  }
}
