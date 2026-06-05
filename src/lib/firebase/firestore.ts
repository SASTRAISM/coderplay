import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  runTransaction,
  type DocumentData,
} from 'firebase/firestore'
import { db } from './config'
import { getCalendarDayDiff, getLocalDateKey, parseStoredDate } from '@/lib/date'
import type {
  UserProfile,
  UserProgress,
  Achievement,
  ChatSession,
  AssessmentResult,
  CodeSubmission,
  Streak,
  LearningAnalytics,
  AssessmentConceptStats,
  CodingConceptStats,
  OverallConceptScore,
} from '@/types'

/** Base XP cost for first streak restore. Increases by 10 each consecutive day. */
export const STREAK_RESTORE_BASE_COST = 10

/** Compute restore cost based on consecutive restore history stored in the streak doc. */
export function getStreakRestoreCost(streak: { consecutiveRestoreCount?: number } | null | undefined): number {
  const count = (streak?.consecutiveRestoreCount ?? 0) + 1
  return count * 10
}

/** Legacy -- kept so old imports don't break; actual cost is now dynamic. */
export const STREAK_RESTORE_COST = STREAK_RESTORE_BASE_COST

function toMillis(value: unknown): number {
  if (!value) return 0
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? 0 : date.getTime()
  }
  if (typeof value === 'object' && value && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().getTime()
  }
  return 0
}

async function mergeProgressConceptField<T>(
  uid: string,
  field: 'learningAnalytics' | 'assessmentStats' | 'codingStats' | 'conceptScores',
  conceptId: string,
  value: T
): Promise<void> {
  const ref = doc(db, 'progress', uid)
  const snap = await getDoc(ref)

  if (snap.exists()) {
    await updateDoc(ref, {
      [`${field}.${conceptId}`]: value,
      updatedAt: serverTimestamp(),
    })
    return
  }

  await setDoc(ref, {
    uid,
    [field]: { [conceptId]: value },
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

// --- User Profile -----------------------------------------------------------

export async function createUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  const ref = doc(db, 'users', uid)
  await setDoc(ref, {
    ...data,
    uid,
    xp: 0,
    level: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const ref = doc(db, 'users', uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return snap.data() as UserProfile
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  const ref = doc(db, 'users', uid)
  await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true })
}

export async function isRegistrationNumberTaken(regNo: string): Promise<boolean> {
  const q = query(collection(db, 'users'), where('registrationNumber', '==', regNo.trim()))
  const snap = await getDocs(q)
  if (snap.empty) return false
  // Check if the matched Firestore doc has a valid uid that still exists in Auth
  // by verifying their profile doc exists and has an email (orphaned docs won't)
  for (const d of snap.docs) {
    const data = d.data()
    if (data.email && data.uid) return true
  }
  return false
}

// --- User Progress -----------------------------------------------------------

export async function getUserProgress(uid: string): Promise<UserProgress | null> {
  const ref = doc(db, 'progress', uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return snap.data() as UserProgress
}

export async function updateUserProgress(uid: string, data: Partial<UserProgress>): Promise<void> {
  const ref = doc(db, 'progress', uid)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() })
  } else {
    await setDoc(ref, { ...data, uid, updatedAt: serverTimestamp() })
  }
}

export async function markStageComplete(
  uid: string,
  conceptId: string,
  stage: 1 | 2 | 3,
  xpEarned: number
): Promise<void> {
  const progressRef = doc(db, 'progress', uid)
  const userRef = doc(db, 'users', uid)

  // Transaction prevents double-XP if user double-clicks or two tabs submit at once
  await runTransaction(db, async (txn) => {
    const [progressSnap, userSnap] = await Promise.all([
      txn.get(progressRef),
      txn.get(userRef),
    ])
    const existing = progressSnap.exists() ? (progressSnap.data() as DocumentData) : {}
    const completedStages: Record<string, number[]> = existing.completedStages || {}
    const conceptStages: number[] = completedStages[conceptId] || []
    const isNewStage = !conceptStages.includes(stage)
    if (!isNewStage) return  // already awarded -- no-op

    const updatedStages = [...conceptStages, stage]
    if (progressSnap.exists()) {
      txn.update(progressRef, {
        [`completedStages.${conceptId}`]: updatedStages,
        updatedAt: serverTimestamp(),
      })
    } else {
      txn.set(progressRef, {
        uid,
        completedStages: { [conceptId]: updatedStages },
        updatedAt: serverTimestamp(),
      })
    }
    // Use set+merge so it works whether the user doc exists or not
    if (userSnap.exists()) {
      txn.update(userRef, { xp: increment(xpEarned), updatedAt: serverTimestamp() })
    } else {
      txn.set(userRef, { uid, xp: xpEarned, updatedAt: serverTimestamp() }, { merge: true })
    }
  })
}

// --- Languages & Concepts ----------------------------------------------------

export async function getLanguages(): Promise<DocumentData[]> {
  const colRef = collection(db, 'languages')
  const snap = await getDocs(colRef)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getConcepts(languageId: string): Promise<DocumentData[]> {
  const colRef = collection(db, 'concepts')
  const q = query(colRef, where('languageId', '==', languageId), orderBy('order'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// --- Chat Sessions -----------------------------------------------------------

export async function saveChatSession(uid: string, session: Omit<ChatSession, 'id'>): Promise<string> {
  const colRef = collection(db, 'chatSessions')
  const docRef = await addDoc(colRef, {
    ...session,
    uid,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export async function getChatHistory(uid: string, conceptId: string): Promise<ChatSession[]> {
  const colRef = collection(db, 'chatSessions')
  const q = query(colRef, where('uid', '==', uid), where('conceptId', '==', conceptId))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as ChatSession))
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
    .slice(0, 1)
}

// --- Assessments -------------------------------------------------------------

export async function submitAssessment(uid: string, result: Omit<AssessmentResult, 'id'>): Promise<string> {
  const colRef = collection(db, 'assessments')
  const docRef = await addDoc(colRef, {
    ...result,
    uid,
    submittedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function getAssessmentResults(uid: string, conceptId: string): Promise<AssessmentResult[]> {
  const colRef = collection(db, 'assessments')
  const q = query(colRef, where('uid', '==', uid), where('conceptId', '==', conceptId))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as AssessmentResult))
    .sort((a, b) => Math.max(toMillis(b.submittedAt), toMillis(b.completedAt)) - Math.max(toMillis(a.submittedAt), toMillis(a.completedAt)))
    .slice(0, 5)
}

// --- Code Submissions ---------------------------------------------------------

export async function saveCodeSubmission(uid: string, submission: Omit<CodeSubmission, 'id'>): Promise<string> {
  const colRef = collection(db, 'codeSubmissions')
  const docRef = await addDoc(colRef, {
    ...submission,
    uid,
    submittedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function getCodeSubmissions(uid: string, conceptId: string): Promise<CodeSubmission[]> {
  const colRef = collection(db, 'codeSubmissions')
  const q = query(colRef, where('uid', '==', uid), where('conceptId', '==', conceptId))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as CodeSubmission))
    .sort((a, b) => toMillis(b.submittedAt) - toMillis(a.submittedAt))
}

// --- Achievements -------------------------------------------------------------

export async function getUserAchievements(uid: string): Promise<Achievement[]> {
  const ref = doc(db, 'achievements', uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) return []
  return (snap.data().earned || []) as Achievement[]
}

export async function unlockAchievement(uid: string, achievement: Achievement): Promise<void> {
  const ref = doc(db, 'achievements', uid)
  const snap = await getDoc(ref)
  const existing = snap.exists() ? snap.data().earned || [] : []
  const alreadyEarned = existing.some((a: Achievement) => a.id === achievement.id)
  if (!alreadyEarned) {
    await setDoc(ref, { earned: [...existing, { ...achievement, earnedAt: new Date().toISOString() }] }, { merge: true })
  }
}

// --- Streak -------------------------------------------------------------------

export async function updateStreak(uid: string): Promise<Streak> {
  const ref = doc(db, 'streaks', uid)
  const todayKey = getLocalDateKey()

  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref)

    if (!snap.exists()) {
      const newStreak: Streak = {
        currentStreak: 1,
        longestStreak: 1,
        lastActiveDate: todayKey,
        totalDaysActive: 1,
        restoreAvailableOn: null,
        restoreBaseStreak: null,
        lastRestoredOn: null,
      }
      transaction.set(ref, newStreak)
      return newStreak
    }

    const data = snap.data() as Streak
    if (data.lastActiveDate === todayKey) {
      return data
    }

    const lastActive = parseStoredDate(data.lastActiveDate)
    if (!lastActive) {
      const resetStreak: Streak = {
        currentStreak: 1,
        longestStreak: Math.max(data.longestStreak, 1),
        lastActiveDate: todayKey,
        totalDaysActive: (data.totalDaysActive ?? 0) + 1,
        restoreAvailableOn: null,
        restoreBaseStreak: null,
        lastRestoredOn: data.lastRestoredOn ?? null,
      }
      transaction.set(ref, resetStreak)
      return resetStreak
    }

    const diffDays = getCalendarDayDiff(lastActive, new Date())
    let updatedStreak: Streak

    if (diffDays === 1) {
      const nextCount = data.currentStreak + 1
      updatedStreak = {
        currentStreak: nextCount,
        longestStreak: Math.max(data.longestStreak, nextCount),
        lastActiveDate: todayKey,
        totalDaysActive: data.totalDaysActive + 1,
        restoreAvailableOn: null,
        restoreBaseStreak: null,
        lastRestoredOn: data.lastRestoredOn ?? null,
      }
    } else if (diffDays === 2 && data.currentStreak > 0) {
      updatedStreak = {
        currentStreak: 1,
        longestStreak: data.longestStreak,
        lastActiveDate: todayKey,
        totalDaysActive: data.totalDaysActive + 1,
        restoreAvailableOn: todayKey,
        restoreBaseStreak: data.currentStreak,
        lastRestoredOn: data.lastRestoredOn ?? null,
      }
    } else {
      updatedStreak = {
        currentStreak: 1,
        longestStreak: data.longestStreak,
        lastActiveDate: todayKey,
        totalDaysActive: data.totalDaysActive + 1,
        restoreAvailableOn: null,
        restoreBaseStreak: null,
        lastRestoredOn: data.lastRestoredOn ?? null,
      }
    }

    transaction.set(ref, updatedStreak)
    return updatedStreak
  })
}

export async function restoreStreak(uid: string): Promise<Streak> {
  const streakRef = doc(db, 'streaks', uid)
  const userRef = doc(db, 'users', uid)
  const todayKey = getLocalDateKey()

  return runTransaction(db, async (transaction) => {
    const streakSnap = await transaction.get(streakRef)
    const userSnap = await transaction.get(userRef)

    if (!streakSnap.exists()) throw new Error('No streak available to restore yet.')
    if (!userSnap.exists()) throw new Error('User profile not found.')

    const streak = streakSnap.data() as Streak
    const profile = userSnap.data() as UserProfile

    if (streak.restoreAvailableOn !== todayKey || !streak.restoreBaseStreak) {
      throw new Error('Your streak can only be restored on the day after you miss it.')
    }
    if (streak.lastRestoredOn === todayKey) {
      throw new Error('You already used your streak restore for today.')
    }

    // Progressive cost: 10 XP for 1st restore, +10 each consecutive day restored
    // If last restore was NOT yesterday, reset the count (non-consecutive)
    const yesterday = (() => {
      const d = new Date()
      d.setDate(d.getDate() - 1)
      return d.toISOString().split('T')[0]
    })()
    const isConsecutive = streak.lastRestoredOn === yesterday
    const newConsecutiveCount = isConsecutive ? (streak.consecutiveRestoreCount ?? 0) + 1 : 1
    const cost = newConsecutiveCount * 10

    if ((profile.xp ?? 0) < cost) {
      throw new Error(`You need ${cost} XP to restore your streak.`)
    }

    const restoredCount = streak.restoreBaseStreak + 1
    const updatedStreak: Streak = {
      currentStreak: restoredCount,
      longestStreak: Math.max(streak.longestStreak, restoredCount),
      lastActiveDate: todayKey,
      totalDaysActive: streak.totalDaysActive,
      restoreAvailableOn: null,
      restoreBaseStreak: null,
      lastRestoredOn: todayKey,
      consecutiveRestoreCount: newConsecutiveCount,
      lastRestoreCost: cost,
    }

    transaction.update(userRef, {
      xp: increment(-cost),
      updatedAt: serverTimestamp(),
    })
    transaction.set(streakRef, updatedStreak)

    return updatedStreak
  })
}

export async function getStreak(uid: string): Promise<Streak | null> {
  const ref = doc(db, 'streaks', uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return snap.data() as Streak
}

// --- Real-time Listeners ------------------------------------------------------

export function listenToProgress(uid: string, callback: (data: UserProgress | null) => void): () => void {
  const ref = doc(db, 'progress', uid)
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? (snap.data() as UserProgress) : null)
  })
}

export function listenToStreak(uid: string, callback: (data: Streak | null) => void): () => void {
  const ref = doc(db, 'streaks', uid)
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? (snap.data() as Streak) : null)
  })
}

export function listenToUserProfile(uid: string, callback: (data: UserProfile | null) => void): () => void {
  const ref = doc(db, 'users', uid)
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? (snap.data() as UserProfile) : null)
  })
}

// --- Time Tracking ------------------------------------------------------------

export async function addTimeSpent(uid: string, minutes: number): Promise<void> {
  const today = getLocalDateKey()
  const ref = doc(db, 'progress', uid)
  await setDoc(
    ref,
    {
      timeSpent: { total: increment(minutes) },
      dailyActivity: { [today]: increment(minutes) },
      uid,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export function listenToAchievements(uid: string, callback: (data: Achievement[]) => void): () => void {
  const ref = doc(db, 'achievements', uid)
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? ((snap.data().earned || []) as Achievement[]) : [])
  })
}

export async function saveLearningAnalytics(
  uid: string,
  conceptId: string,
  analytics: LearningAnalytics
): Promise<void> {
  await mergeProgressConceptField(uid, 'learningAnalytics', conceptId, analytics)
}

export async function saveAssessmentStats(
  uid: string,
  conceptId: string,
  stats: AssessmentConceptStats
): Promise<void> {
  const ref = doc(db, 'progress', uid)
  await setDoc(ref, {
    uid,
    assessmentScores: { [conceptId]: stats.score },
    updatedAt: serverTimestamp(),
  }, { merge: true })
  await mergeProgressConceptField(uid, 'assessmentStats', conceptId, stats)
}

export async function saveCodingStats(
  uid: string,
  conceptId: string,
  stats: CodingConceptStats
): Promise<void> {
  await mergeProgressConceptField(uid, 'codingStats', conceptId, stats)
}

export async function saveConceptScore(
  uid: string,
  conceptId: string,
  score: OverallConceptScore
): Promise<void> {
  await mergeProgressConceptField(uid, 'conceptScores', conceptId, score)
}