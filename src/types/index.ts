// --- User & Auth -------------------------------------------------------------

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  xp: number
  level: number
  createdAt: string | Date
  updatedAt: string | Date
  bio?: string
  preferredLanguage?: string
  registrationNumber?: string
  branch?: string
  year?: string
}

export interface UserProgress {
  uid: string
  completedStages: Record<string, number[]>  // conceptId -> [1, 2, 3]
  assessmentScores: Record<string, number>   // conceptId -> score
  timeSpent: Record<string, number>          // conceptId -> minutes
  learningAnalytics?: Record<string, LearningAnalytics>
  assessmentStats?: Record<string, AssessmentConceptStats>
  codingStats?: Record<string, CodingConceptStats>
  conceptScores?: Record<string, OverallConceptScore>
  dailyActivity?: Record<string, number>
  updatedAt: string | Date
}

// --- Languages & Concepts ----------------------------------------------------

export interface Language {
  id: string
  title: string
  description: string
  icon: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  totalConcepts: number
  color: string
  tags: string[]
  syllabusTag?: string
  trending?: boolean
}

export interface ConceptStage {
  stage: 1 | 2 | 3
  description: string
  unlocked: boolean
}

export interface Concept {
  id: string
  languageId: string
  title: string
  description: string
  estimatedTime: number  // in minutes
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  order: number
  stages: ConceptStage[]
  learningContent: string
  keyPoints: string[]
}

// --- Assessment Questions -----------------------------------------------------

export type QuestionType =
  | 'mcq'
  | 'true_false'
  | 'fill_blank'
  | 'code_output'
  | 'identify_error'
  | 'match'
  | 'scenario'
  | 'ordering'

export interface MCQOption {
  id: string
  text: string
}

export interface AssessmentQuestion {
  id: string
  type: QuestionType
  question: string
  options?: MCQOption[]        // for mcq
  pairs?: Array<{ left: string; right: string }>  // for match
  items?: string[]             // for ordering
  correctAnswer: string | string[]
  explanation: string
  points: number
  code?: string                // for code_output / identify_error
}

export interface UserAnswer {
  questionId: string
  answer: string | string[]
  isCorrect: boolean
  timeSpent: number  // seconds
}

export interface AssessmentResult {
  id?: string
  uid: string
  conceptId: string
  score: number
  totalQuestions: number
  answers: UserAnswer[]
  xpEarned: number
  questionSet?: AssessmentQuestion[]
  completedAt: string | Date
  submittedAt?: string | Date
}

// --- Coding Challenges --------------------------------------------------------

export interface TestCase {
  input: string
  expectedOutput: string
  explanation?: string
}

export interface CodingChallenge {
  id: string
  conceptId: string
  difficulty: 'basic' | 'medium' | 'hard'
  title: string
  description: string
  problemStatement: string
  inputFormat: string
  outputFormat: string
  constraints: string[]
  examples: Array<{ input: string; output?: string; expectedOutput?: string; explanation?: string }>
  starterCode: string
  visibleTestCases: TestCase[]
  hiddenTestCases: TestCase[]
  hints: string[]
}

export interface CodeSubmission {
  id?: string
  uid: string
  challengeId: string
  conceptId: string
  code: string
  language: string
  testsPassed: number
  totalTests: number
  status: 'accepted' | 'wrong_answer' | 'error' | 'pending'
  submittedAt?: string | Date
}

export interface LearningAnalytics {
  conceptId: string
  stepsCompleted: number[]
  probePromptsSeen: number
  probeResponses: number
  meaningfulResponses: number
  followUpQuestions: number
  explainAgainCount: number
  hintCount: number
  shortcutAttempts: number
  userMessages: number
  aiMessages: number
  effectivenessScore: number
  completedAt?: string | Date
}

export interface AssessmentConceptStats {
  conceptId: string
  score: number
  totalQuestions: number
  correctAnswers: number
  wrongAnswers: number
  percentage: number
  questionSet?: AssessmentQuestion[]
  completedAt?: string | Date
}

export interface CodingConceptStats {
  conceptId: string
  totalChallenges: number
  completedChallenges: number
  codingQuestionsCorrect: number
  passedTests: number
  totalTests: number
  percentage: number
  aiHelpRequests: number
  hintRequests: number
  debugRequests: number
  logicRequests: number
  fullAnswerRequests: number
  customQuestionRequests: number
  completedAt?: string | Date
}

export interface OverallConceptScore {
  conceptId: string
  aiLearningPercent: number
  assessmentPercent: number
  codingPercent: number
  marksOutOf100: number
  completedAt?: string | Date
}

// --- Chat ---------------------------------------------------------------------

export interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  content: string
  timestamp: Date
  type?: 'explain' | 'hint' | 'feedback' | 'greeting'
}

export interface ChatSession {
  id?: string
  uid: string
  conceptId: string
  messages: ChatMessage[]
  stage: number
  createdAt?: string | Date
}

// --- Achievements -------------------------------------------------------------

export type AchievementCategory = 'learning' | 'assessment' | 'coding' | 'consistency' | 'mastery'

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  category: AchievementCategory
  xpReward: number
  requirement: string
  earnedAt?: string
  isEarned?: boolean
  progress?: number  // 0-100
}

// --- Streak -------------------------------------------------------------------

export interface Streak {
  currentStreak: number
  longestStreak: number
  lastActiveDate: string
  totalDaysActive: number
  restoreAvailableOn?: string | null
  restoreBaseStreak?: number | null
  lastRestoredOn?: string | null
  consecutiveRestoreCount?: number  // tracks how many days in a row they've used restore
  lastRestoreCost?: number          // XP cost of the last restore
}

// --- Leaderboard -------------------------------------------------------------

export interface LeaderboardEntry {
  rank: number
  uid: string
  displayName: string
  photoURL?: string
  xp: number
  level: number
  conceptsCompleted: number
}

// --- Activity -----------------------------------------------------------------

export interface ActivityItem {
  id: string
  type: 'stage_complete' | 'achievement' | 'streak' | 'concept_start'
  title: string
  description: string
  xpEarned: number
  timestamp: Date
  languageId?: string
  conceptId?: string
}

// --- Dashboard Stats ---------------------------------------------------------

export interface DashboardStats {
  totalXP: number
  currentStreak: number
  conceptsCompleted: number
  timeSpentMinutes: number
  level: number
  rank: number
}
