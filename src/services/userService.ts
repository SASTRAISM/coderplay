import type { Achievement, LeaderboardEntry, UserProfile } from '@/types'

export const ALL_ACHIEVEMENTS: Achievement[] = [
  // Learning
  { id: 'first_concept', title: 'First Steps', description: 'Complete your first concept fully (all 3 stages)', icon: 'check', category: 'learning', xpReward: 100, requirement: 'Complete 1 concept', progress: 0 },
  { id: 'five_concepts', title: 'Getting Momentum', description: 'Complete 5 concepts', icon: 'trending', category: 'learning', xpReward: 250, requirement: 'Complete 5 concepts', progress: 0 },
  { id: 'ten_concepts', title: 'Knowledge Builder', description: 'Complete 10 concepts', icon: 'book', category: 'learning', xpReward: 500, requirement: 'Complete 10 concepts', progress: 0 },
  { id: 'first_language', title: 'Language Master', description: 'Complete all concepts in a language', icon: 'trophy', category: 'learning', xpReward: 1000, requirement: 'Finish all concepts in 1 language', progress: 0 },
  // Assessment
  { id: 'perfect_score', title: 'Perfect Score', description: 'Score 15/15 in an assessment', icon: 'award', category: 'assessment', xpReward: 150, requirement: 'Get a perfect assessment score', progress: 0 },
  { id: 'assessment_10', title: 'Assessment Pro', description: 'Complete 10 assessments', icon: 'target', category: 'assessment', xpReward: 200, requirement: 'Complete 10 assessments', progress: 0 },
  // Coding
  { id: 'first_code', title: 'Code Warrior', description: 'Submit your first coding solution', icon: 'code', category: 'coding', xpReward: 100, requirement: 'Submit 1 code solution', progress: 0 },
  { id: 'all_tests', title: 'Bug Slayer', description: 'Pass all test cases on a challenge', icon: 'swords', category: 'coding', xpReward: 150, requirement: 'Pass all visible + hidden tests', progress: 0 },
  { id: 'hard_challenge', title: 'Hard Mode', description: 'Complete a Hard coding challenge', icon: 'zap', category: 'coding', xpReward: 300, requirement: 'Complete 1 Hard challenge', progress: 0 },
  // Consistency
  { id: 'streak_3', title: 'On A Roll', description: 'Maintain a 3-day streak', icon: 'flame', category: 'consistency', xpReward: 75, requirement: '3-day streak', progress: 0 },
  { id: 'streak_7', title: 'Week Warrior', description: 'Maintain a 7-day streak', icon: 'flame', category: 'consistency', xpReward: 200, requirement: '7-day streak', progress: 0 },
  { id: 'streak_30', title: 'Monthly Champion', description: 'Maintain a 30-day streak', icon: 'flame', category: 'consistency', xpReward: 500, requirement: '30-day streak', progress: 0 },
  { id: 'xp_500', title: 'XP Grinder', description: 'Earn 500 total XP', icon: 'zap', category: 'learning', xpReward: 50, requirement: 'Earn 500 XP', progress: 0 },
  { id: 'xp_2000', title: 'Power Learner', description: 'Earn 2000 total XP', icon: 'zap', category: 'learning', xpReward: 100, requirement: 'Earn 2000 XP', progress: 0 },
]

export function mergeAchievements(earned: Achievement[]): Achievement[] {
  const earnedMap = new Map(earned.map((a) => [a.id, a]))
  return ALL_ACHIEVEMENTS.map((a) => {
    const earnedVersion = earnedMap.get(a.id)
    if (earnedVersion) {
      return { ...a, isEarned: true, earnedAt: earnedVersion.earnedAt }
    }
    return { ...a, isEarned: false }
  })
}

export function getAchievementsByCategory(
  achievements: Achievement[],
  category: Achievement['category']
): Achievement[] {
  return achievements.filter((a) => a.category === category)
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || '')
    .join('')
}

export function formatXP(xp: number): string {
  if (xp >= 1000) return `${(xp / 1000).toFixed(1)}k`
  return xp.toString()
}

export function getMockLeaderboard(): LeaderboardEntry[] {
  return [
    { rank: 1, uid: 'u1', displayName: 'Arjun Sharma', xp: 4850, level: 7, conceptsCompleted: 32 },
    { rank: 2, uid: 'u2', displayName: 'Priya Nair', xp: 4200, level: 6, conceptsCompleted: 28 },
    { rank: 3, uid: 'u3', displayName: 'Rahul Verma', xp: 3900, level: 6, conceptsCompleted: 25 },
    { rank: 4, uid: 'u4', displayName: 'Sneha Reddy', xp: 3100, level: 5, conceptsCompleted: 20 },
    { rank: 5, uid: 'u5', displayName: 'Kiran Patel', xp: 2700, level: 5, conceptsCompleted: 18 },
  ]
}

export function buildUserProfile(uid: string, email: string, displayName: string): Partial<UserProfile> {
  return {
    uid,
    email,
    displayName,
    xp: 0,
    level: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}
