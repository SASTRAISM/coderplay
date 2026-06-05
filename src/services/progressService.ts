import type { UserProgress, DashboardStats, Achievement } from '@/types'
import { getTotalTimeSpentMinutes } from '@/lib/studyStats'

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1200, 2000, 3200, 5000, 7500, 10500, 14000, 18500, 24000, 30500, 40000]

export function calculateLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1
  }
  return 1
}

export function xpForNextLevel(xp: number): { current: number; needed: number; percentage: number } {
  const level = calculateLevel(xp)
  if (level >= LEVEL_THRESHOLDS.length) {
    return { current: xp, needed: LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1], percentage: 100 }
  }
  const currentThreshold = LEVEL_THRESHOLDS[level - 1]
  const nextThreshold = LEVEL_THRESHOLDS[level]
  const progress = xp - currentThreshold
  const needed = nextThreshold - currentThreshold
  return {
    current: progress,
    needed,
    percentage: Math.min(100, Math.round((progress / needed) * 100)),
  }
}

export function getLevelTitle(level: number): string {
  const titles: Record<number, string> = {
    1: 'Rookie Coder',
    2: 'Code Apprentice',
    3: 'Script Explorer',
    4: 'Junior Developer',
    5: 'Code Builder',
    6: 'Problem Solver',
    7: 'Algorithm Thinker',
    8: 'Senior Developer',
    9: 'Code Architect',
    10: 'Tech Wizard',
    11: 'Code Ninja',
    12: 'Algorithm Master',
    13: 'Master Developer',
    14: 'Code Legend',
    15: 'Grand Master',
  }
  return titles[level] || 'Grand Master'
}

export function getLevelBadge(level: number): { icon: string; color: string } {
  const badges: Record<number, { icon: string; color: string }> = {
    1:  { icon: 'Lv1', color: 'bg-gray-100 text-gray-600' },
    2:  { icon: 'Lv2', color: 'bg-blue-100 text-blue-700' },
    3:  { icon: 'Lv3', color: 'bg-blue-200 text-blue-800' },
    4:  { icon: 'Lv4', color: 'bg-green-100 text-green-700' },
    5:  { icon: 'Lv5', color: 'bg-yellow-100 text-yellow-700' },
    6:  { icon: 'Lv6', color: 'bg-yellow-200 text-yellow-800' },
    7:  { icon: 'Lv7', color: 'bg-purple-100 text-purple-700' },
    8:  { icon: 'Lv8', color: 'bg-gray-200 text-gray-700' },
    9:  { icon: 'Lv9', color: 'bg-yellow-300 text-yellow-900' },
    10: { icon: 'L10', color: 'bg-cyan-100 text-cyan-700' },
    11: { icon: 'L11', color: 'bg-indigo-100 text-indigo-700' },
    12: { icon: 'L12', color: 'bg-red-100 text-red-700' },
    13: { icon: 'L13', color: 'bg-purple-200 text-purple-800' },
    14: { icon: 'L14', color: 'bg-orange-100 text-orange-700' },
    15: { icon: 'MAX', color: 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' },
  }
  return badges[level] || badges[15]
}

export function getConceptsCompleted(progress: UserProgress | null): number {
  if (!progress?.completedStages) return 0
  return Object.values(progress.completedStages).filter(
    (stages) => stages.includes(1) && stages.includes(2) && stages.includes(3)
  ).length
}

export function isStageUnlocked(
  progress: UserProgress | null,
  conceptId: string,
  stage: 1 | 2 | 3
): boolean {
  if (stage === 1) return true
  const stages = progress?.completedStages?.[conceptId] || []
  if (stage === 2) return stages.includes(1)
  if (stage === 3) return stages.includes(2)
  return false
}

export function getStageStatus(
  progress: UserProgress | null,
  conceptId: string,
  stage: 1 | 2 | 3
): 'locked' | 'available' | 'completed' {
  const stages = progress?.completedStages?.[conceptId] || []
  if (stages.includes(stage)) return 'completed'
  if (isStageUnlocked(progress, conceptId, stage)) return 'available'
  return 'locked'
}

export function calculateDashboardStats(
  progress: UserProgress | null,
  xp: number,
  streak: number
): DashboardStats {
  return {
    totalXP: xp,
    currentStreak: streak,
    conceptsCompleted: getConceptsCompleted(progress),
    timeSpentMinutes: getTotalTimeSpentMinutes(progress),
    level: calculateLevel(xp),
    rank: 0, // fetched from leaderboard separately
  }
}

export function checkAchievements(
  progress: UserProgress | null,
  xp: number,
  streak: number,
  existingAchievements: Achievement[]
): Achievement[] {
  const earnedIds = existingAchievements.map((a) => a.id)
  const newAchievements: Achievement[] = []
  const conceptsCompleted = getConceptsCompleted(progress)
  const currentLevel = calculateLevel(xp)
  const hour = typeof window !== 'undefined' ? new Date().getHours() : -1

  const candidates: Achievement[] = [
    { id: 'first_concept', title: 'First Steps', description: 'Complete your first concept', icon: 'check', category: 'learning', xpReward: 100, requirement: 'Complete 1 concept fully', isEarned: conceptsCompleted >= 1 },
    { id: 'five_concepts', title: 'Getting Momentum', description: 'Complete 5 concepts', icon: 'trending', category: 'learning', xpReward: 250, requirement: 'Complete 5 concepts fully', isEarned: conceptsCompleted >= 5 },
    { id: 'streak_7', title: 'Week Warrior', description: 'Maintain a 7-day learning streak', icon: 'flame', category: 'consistency', xpReward: 200, requirement: '7-day streak', isEarned: streak >= 7 },
    { id: 'xp_500', title: 'XP Grinder', description: 'Earn 500 XP', icon: 'zap', category: 'learning', xpReward: 50, requirement: 'Earn 500 total XP', isEarned: xp >= 500 },
    { id: 'ten_concepts', title: 'Dedicated Learner', description: 'Complete 10 concepts', icon: 'book', category: 'learning', xpReward: 400, requirement: 'Complete 10 concepts fully', isEarned: conceptsCompleted >= 10 },
    { id: 'all_concepts_lang', title: 'Language Master', description: 'Complete all concepts in a language', icon: 'trophy', category: 'mastery', xpReward: 1000, requirement: 'Complete 14 concepts fully', isEarned: conceptsCompleted >= 14 },
    { id: 'streak_3', title: '3-Day Streak', description: 'Maintain a 3-day learning streak', icon: 'flame', category: 'consistency', xpReward: 50, requirement: '3-day streak', isEarned: streak >= 3 },
    { id: 'streak_14', title: 'Two-Week Warrior', description: 'Maintain a 14-day learning streak', icon: 'flame', category: 'consistency', xpReward: 350, requirement: '14-day streak', isEarned: streak >= 14 },
    { id: 'streak_30', title: 'Monthly Champion', description: 'Maintain a 30-day learning streak', icon: 'flame', category: 'consistency', xpReward: 750, requirement: '30-day streak', isEarned: streak >= 30 },
    { id: 'streak_100', title: 'Century Streak', description: 'Maintain a 100-day learning streak', icon: 'flame', category: 'consistency', xpReward: 2000, requirement: '100-day streak', isEarned: streak >= 100 },
    { id: 'xp_1000', title: 'XP Hunter', description: 'Earn 1,000 XP', icon: 'zap', category: 'learning', xpReward: 100, requirement: 'Earn 1000 total XP', isEarned: xp >= 1000 },
    { id: 'xp_2500', title: 'XP Machine', description: 'Earn 2,500 XP', icon: 'zap', category: 'learning', xpReward: 200, requirement: 'Earn 2500 total XP', isEarned: xp >= 2500 },
    { id: 'xp_5000', title: 'XP Legend', description: 'Earn 5,000 XP', icon: 'zap', category: 'learning', xpReward: 500, requirement: 'Earn 5000 total XP', isEarned: xp >= 5000 },
    { id: 'xp_10000', title: 'XP God', description: 'Earn 10,000 XP', icon: 'zap', category: 'mastery', xpReward: 1000, requirement: 'Earn 10000 total XP', isEarned: xp >= 10000 },
    { id: 'level_5', title: 'Halfway There', description: 'Reach Level 5', icon: 'rocket', category: 'mastery', xpReward: 300, requirement: 'Reach Level 5', isEarned: currentLevel >= 5 },
    { id: 'level_10', title: 'Top Tier Coder', description: 'Reach Level 10', icon: 'rocket', category: 'mastery', xpReward: 750, requirement: 'Reach Level 10', isEarned: currentLevel >= 10 },
    { id: 'level_15', title: 'Code Grandmaster', description: 'Reach Level 15', icon: 'trophy', category: 'mastery', xpReward: 2000, requirement: 'Reach Level 15', isEarned: currentLevel >= 15 },
    { id: 'speed_demon', title: 'Speed Demon', description: 'Complete a concept in one session', icon: 'zap', category: 'mastery', xpReward: 200, requirement: 'Complete 3 concepts', isEarned: conceptsCompleted >= 3 },
    { id: 'night_owl', title: 'Night Owl', description: 'Study after 10 PM', icon: 'moon', category: 'consistency', xpReward: 100, requirement: 'Study after 10 PM with 1+ concept done', isEarned: hour >= 22 && conceptsCompleted >= 1 },
    { id: 'early_bird', title: 'Early Bird', description: 'Study before 8 AM', icon: 'sun', category: 'consistency', xpReward: 100, requirement: 'Study before 8 AM with 1+ concept done', isEarned: hour >= 0 && hour < 8 && conceptsCompleted >= 1 },
    { id: 'perfectionist', title: 'Perfectionist', description: 'Score 100% on any MCQ round', icon: 'award', category: 'mastery', xpReward: 300, requirement: 'Score 100% on any MCQ round', isEarned: false },
    { id: 'aptitude_starter', title: 'Aptitude Beginner', description: 'Complete your first aptitude concept', icon: 'target', category: 'learning', xpReward: 150, requirement: 'Complete your first aptitude concept', isEarned: false },
    { id: 'placement_warrior', title: 'Placement Warrior', description: 'Attempt a placement mock test', icon: 'swords', category: 'mastery', xpReward: 500, requirement: 'Attempt a placement mock test', isEarned: false },
    { id: 'comeback_kid', title: 'Comeback Kid', description: 'Restore a lost streak', icon: 'star', category: 'consistency', xpReward: 200, requirement: 'Restore a lost streak', isEarned: false },
  ]

  for (const achievement of candidates) {
    if (achievement.isEarned && !earnedIds.includes(achievement.id)) {
      newAchievements.push({ ...achievement, earnedAt: new Date().toISOString() })
    }
  }

  return newAchievements
}
