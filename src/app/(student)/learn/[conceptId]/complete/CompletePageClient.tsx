'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { GraduationCap, Rocket, BarChart2, Lock, Lightbulb } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getAssessmentResults, getCodeSubmissions, getUserProgress, saveConceptScore } from '@/lib/firebase/firestore'
import { computeCodingPercentage, computeOverallConceptScore } from '@/lib/learningMetrics'
import { downloadLearningSummaryPdf } from '@/lib/pdf/downloadLearningSummaryPdf'
import type { AssessmentResult, CodeSubmission, CodingChallenge, UserProgress } from '@/types'
import { ASSESSMENT_QUESTIONS } from '@/data/assessmentQuestions'
import { CODING_CHALLENGES } from '@/data/codingChallenges'
import { CONCEPTS } from '@/data/concepts'
import { getLanguageById } from '@/data/languages'
import { getCompletedConceptCount, getConceptCompletionDate } from '@/lib/courseProgress'

function findConcept(conceptId: string) {
  for (const list of Object.values(CONCEPTS)) {
    const found = list.find((concept) => concept.id === conceptId)
    if (found) return found
  }
  return null
}

function parseLearningContent(content: string): { heading: string | null; lines: string[] }[] {
  const sections: { heading: string | null; lines: string[] }[] = []
  let current: { heading: string | null; lines: string[] } = { heading: null, lines: [] }

  content.split('\n').forEach((raw) => {
    const line = raw.trimEnd()
    if (line === '') return

    if (
      line.startsWith('```') ||
      line.startsWith('#include') ||
      line.startsWith('//') ||
      line.startsWith('def ') ||
      line.startsWith('class ') ||
      line.startsWith('int ') ||
      line.startsWith('import ') ||
      line.startsWith('print(') ||
      line.startsWith('for ') ||
      line.startsWith('if ') ||
      line.startsWith('while ') ||
      /^\s{2,}/.test(line)
    ) {
      current.lines.push(line)
      return
    }

    if (/^[A-Z][\w\s/()&+]+:$/.test(line.trim()) || /^#{1,3}\s/.test(line)) {
      if (current.lines.length > 0 || current.heading) sections.push(current)
      current = { heading: line.replace(/^#{1,3}\s/, ''), lines: [] }
      return
    }

    current.lines.push(line)
  })

  if (current.lines.length > 0 || current.heading) sections.push(current)
  return sections
}

function challengeCacheKey(conceptId: string, userId: string) {
  return `cpc_${userId}_${conceptId}`
}

function loadCachedChallenges(conceptId: string, userId: string): CodingChallenge[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = sessionStorage.getItem(challengeCacheKey(conceptId, userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function titleFromChallengeId(challengeId: string): string {
  return challengeId
    .replace(/^ai_/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\s+Ai$/, '')
    .replace(/\s+(Basic|Medium|Hard|Easy)$/i, '')
    .trim()
}

function buildSubmissionFallbackChallenge(submission: CodeSubmission, index: number): CodingChallenge {
  return {
    id: submission.challengeId || `submission_${index + 1}`,
    conceptId: submission.conceptId,
    difficulty: index === 0 ? 'basic' : index === 1 ? 'medium' : 'hard',
    title: titleFromChallengeId(submission.challengeId || `coding challenge ${index + 1}`),
    description: 'Recovered from your saved submission history.',
    problemStatement: 'Challenge details were not available in the local cache, so this section includes your saved solution and test results.',
    inputFormat: '',
    outputFormat: '',
    constraints: [],
    examples: [],
    starterCode: submission.code,
    visibleTestCases: [],
    hiddenTestCases: [],
    hints: [],
  }
}

export default function CompletePageClient({ params }: { params: { conceptId: string } }) {
  const { user, profile } = useAuth()
  const concept = findConcept(params.conceptId)

  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null)
  const [codeSubmissions, setCodeSubmissions] = useState<CodeSubmission[]>([])
  const [cachedChallenges, setCachedChallenges] = useState<CodingChallenge[]>([])
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)

  const fallbackQuestions = ASSESSMENT_QUESTIONS[params.conceptId] || []
  const staticChallenges = CODING_CHALLENGES[params.conceptId] || []

  useEffect(() => {
    if (!user) return

    if (staticChallenges.length === 0) {
      setCachedChallenges(loadCachedChallenges(params.conceptId, user.uid))
    }

    Promise.all([
      getAssessmentResults(user.uid, params.conceptId),
      getCodeSubmissions(user.uid, params.conceptId),
      getUserProgress(user.uid),
    ])
      .then(([results, submissions, progressDoc]) => {
        if (results.length > 0) setAssessmentResult(results[0])
        setCodeSubmissions(submissions)
        setProgress(progressDoc)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [params.conceptId, staticChallenges.length, user])

  const completedStages = progress?.completedStages?.[params.conceptId] || []
  const stage1Completed = completedStages.includes(1)
  const stage2Completed = completedStages.includes(2)
  const stage3Completed = completedStages.includes(3)

  const learningStats = progress?.learningAnalytics?.[params.conceptId]
  const assessmentStats = progress?.assessmentStats?.[params.conceptId]
  const codingStats = progress?.codingStats?.[params.conceptId]
  const savedConceptScore = progress?.conceptScores?.[params.conceptId]

  const questions = assessmentStats?.questionSet?.length
    ? assessmentStats.questionSet
    : assessmentResult?.questionSet?.length
      ? assessmentResult.questionSet
      : fallbackQuestions

  const bestSubmissionLookup = codeSubmissions.reduce((lookup, submission) => {
    if (!submission.challengeId) return lookup

    const existing = lookup.get(submission.challengeId)
    if (!existing) {
      lookup.set(submission.challengeId, submission)
      return lookup
    }

    if (existing.status !== 'accepted' && submission.status === 'accepted') {
      lookup.set(submission.challengeId, submission)
    }

    return lookup
  }, new Map<string, CodeSubmission>())
  const bestSubmissions = Array.from(bestSubmissionLookup.values())

  const resolvedChallenges = staticChallenges.length > 0
    ? staticChallenges
    : cachedChallenges.length > 0
      ? cachedChallenges
      : Array.from(
          new Map(
            bestSubmissions.map((submission, index) => [
              submission.challengeId || `submission_${index + 1}`,
              buildSubmissionFallbackChallenge(submission, index),
            ]),
          ).values(),
        )

  const acceptedChallengeIds = new Set(
    bestSubmissions.filter((submission) => submission.status === 'accepted').map((submission) => submission.challengeId),
  )
  const submittedChallengeIds = new Set(bestSubmissions.map((submission) => submission.challengeId).filter(Boolean))

  const mcqScore = assessmentStats?.correctAnswers ?? assessmentStats?.score ?? assessmentResult?.score ?? 0
  const mcqTotal = assessmentStats?.totalQuestions ?? assessmentResult?.totalQuestions ?? questions.length
  const mcqPercent = assessmentStats?.percentage ?? (mcqTotal > 0 ? Math.round((mcqScore / mcqTotal) * 100) : 0)
  const wrongAnswers = assessmentStats?.wrongAnswers ?? Math.max(0, mcqTotal - mcqScore)

  const hasDetailedLearningStats = Boolean(
    learningStats && (
      learningStats.probePromptsSeen > 0 ||
      learningStats.probeResponses > 0 ||
      learningStats.meaningfulResponses > 0 ||
      learningStats.userMessages > 0
    ),
  )
  const completedLearningSteps = learningStats?.stepsCompleted?.length ?? (stage1Completed ? 5 : 0)
  const aiLearningPercent = hasDetailedLearningStats
    ? learningStats?.effectivenessScore ?? 0
    : stage1Completed
      ? Math.round((completedLearningSteps / 5) * 100)
      : 0

  const codingTotalCount = codingStats?.totalChallenges
    || resolvedChallenges.length
    || submittedChallengeIds.size
    || (stage3Completed ? 1 : 0)
  const codingCorrectCount = codingStats?.completedChallenges
    || codingStats?.codingQuestionsCorrect
    || acceptedChallengeIds.size
    || (stage3Completed && codingTotalCount > 0 ? codingTotalCount : 0)
  const codingTotalTestsFromSubmissions = bestSubmissions.reduce((sum, submission) => sum + (submission.totalTests || 0), 0)
  const codingPassedTestsFromSubmissions = bestSubmissions.reduce((sum, submission) => {
    if (submission.status !== 'accepted') return sum + (submission.testsPassed || 0)
    return sum + (submission.totalTests || submission.testsPassed || 0)
  }, 0)
  const codingTotalTests = codingStats?.totalTests
    || codingTotalTestsFromSubmissions
    || (stage3Completed ? codingTotalCount : 0)
  const codingPassedTests = codingStats?.passedTests
    || codingPassedTestsFromSubmissions
    || (stage3Completed ? codingTotalTests : 0)
  const derivedCodingPercent = codingTotalTests > 0
    ? Math.round((codingPassedTests / codingTotalTests) * 100)
    : codingTotalCount > 0
      ? Math.round((codingCorrectCount / codingTotalCount) * 100)
      : stage3Completed
        ? 100
        : 0
  const codingPercent = codingStats
    ? computeCodingPercentage({
        ...codingStats,
        totalChallenges: codingStats.totalChallenges || codingTotalCount,
        completedChallenges: codingStats.completedChallenges || codingCorrectCount,
        passedTests: codingStats.passedTests || codingPassedTests,
        totalTests: codingStats.totalTests || codingTotalTests,
      }) || derivedCodingPercent
    : derivedCodingPercent

  const conceptCompletedAt = getConceptCompletionDate(progress, params.conceptId)
    ?? assessmentResult?.completedAt
    ?? assessmentResult?.submittedAt
    ?? codeSubmissions[0]?.submittedAt
    ?? progress?.updatedAt

  const overallScore = computeOverallConceptScore({
    conceptId: params.conceptId,
    aiLearningPercent,
    assessmentPercent: mcqPercent,
    codingPercent,
    completedAt: savedConceptScore?.completedAt ?? conceptCompletedAt ?? new Date(),
  })
  const totalXP =
    (stage1Completed ? 50 : 0) +
    (assessmentResult?.xpEarned ?? (stage2Completed ? mcqScore * 10 : 0)) +
    (stage3Completed ? 150 : 0)
  const aiLearningDetailText = hasDetailedLearningStats
    ? `${completedLearningSteps}/5 guided learning steps completed . ${learningStats?.meaningfulResponses ?? 0} meaningful responses`
    : stage1Completed
      ? 'All 5 guided learning steps completed'
      : 'Guided learning data not available yet'
  const scoreBreakdown = 'Assessment 40% . Coding 35% . AI learning 25%'

  useEffect(() => {
    if (!user || loading || !stage1Completed || !stage2Completed || !stage3Completed) return
    saveConceptScore(user.uid, params.conceptId, overallScore).catch(() => {})
  }, [
    loading,
    overallScore.aiLearningPercent,
    overallScore.assessmentPercent,
    overallScore.codingPercent,
    overallScore.completedAt,
    overallScore.marksOutOf100,
    params.conceptId,
    stage1Completed,
    stage2Completed,
    stage3Completed,
    user,
  ])

  const getBestCode = (challengeId: string): CodeSubmission | null => {
    return bestSubmissionLookup.get(challengeId) ?? null
  }

  const title = concept?.title ?? params.conceptId.replace(/_/g, ' ')
  const languageId = concept?.languageId ?? 'python'
  const languageTitle = getLanguageById(languageId)?.title ?? languageId.replace(/_/g, ' ')
  const learningContent = concept?.learningContent ?? ''
  const contentSections = parseLearningContent(learningContent)
  const languageConcepts = CONCEPTS[languageId] || []
  const languageConceptIds = languageConcepts.map((languageConcept) => languageConcept.id)
  const completedLanguageConcepts = getCompletedConceptCount(progress, languageConceptIds)
  const certificateUnlocked = languageConcepts.length > 0 && completedLanguageConcepts === languageConcepts.length
  const remainingConceptsToUnlock = Math.max(languageConcepts.length - completedLanguageConcepts, 0)

  const summaryCards = [
    { label: 'Total XP', value: `+${totalXP}`, color: 'text-yellow-400' },
    {
      label: 'Assessment',
      value: `${mcqPercent}%`,
      color: mcqPercent >= 80 ? 'text-green-400' : mcqPercent >= 60 ? 'text-yellow-400' : 'text-red-400',
    },
    { label: 'Correct Answers', value: `${mcqScore}`, color: 'text-green-400' },
    { label: 'Wrong Answers', value: `${wrongAnswers}`, color: 'text-red-400' },
    { label: 'AI Learning', value: `${aiLearningPercent}%`, color: 'text-sky-400' },
    { label: 'Coding Passed', value: `${codingCorrectCount}/${codingTotalCount || 0}`, color: 'text-purple-400' },
  ]

  const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: (index: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, delay: index * 0.1, ease: 'easeOut' },
    }),
  }

  const handleDownloadPDF = async () => {
    if (isDownloading) return

    setIsDownloading(true)
    try {
      await downloadLearningSummaryPdf({
        filename: `${params.conceptId}-learning-summary.pdf`,
        studentName: profile?.displayName || user?.displayName || 'Student',
        conceptTitle: title,
        languageTitle,
        completedAt: conceptCompletedAt ?? new Date(),
        totalXp: totalXP,
        overallScore: overallScore.marksOutOf100,
        assessmentPercent: mcqPercent,
        assessmentCorrect: mcqScore,
        assessmentWrong: wrongAnswers,
        assessmentTotal: mcqTotal,
        aiLearningPercent,
        aiLearningDetail: aiLearningDetailText,
        codingPercent,
        codingCompletedCount: codingCorrectCount,
        codingTotalCount,
        codingPassedTests,
        codingTotalTests,
        scoreFootnote: scoreBreakdown,
        keyPoints: concept?.keyPoints ?? [],
        notesSections: contentSections,
        questions,
        answers: assessmentResult?.answers ?? [],
        challenges: resolvedChallenges.map((challenge) => ({
          challenge,
          submission: getBestCode(challenge.id),
        })),
      })
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="no-print bg-gray-950 text-white px-6 py-14 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(234,179,8,0.18),transparent)]" />
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <div className="flex justify-center mb-3"><GraduationCap className="w-16 h-16 text-yellow-400" /></div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-2">Concept Mastered!</h1>
          <p className="text-yellow-400 text-xl font-bold mb-1">{title}</p>
          <p className="text-gray-400 text-sm mb-8">All 3 stages complete. Outstanding work!</p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-5xl mx-auto">
            {summaryCards.map((item) => (
              <div key={item.label} className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4">
                <div className={`text-3xl font-black ${item.color}`}>{item.value}</div>
                <div className="text-xs text-gray-400 mt-1">{item.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 inline-flex items-center justify-center gap-3 bg-white/5 border border-white/10 rounded-full px-6 py-3 flex-wrap">
            <span className="text-xs uppercase tracking-[0.22em] text-gray-400">Overall Score</span>
            <span className="text-3xl font-black text-white">{overallScore.marksOutOf100}/100</span>
            <span className="text-xs text-gray-400">{scoreBreakdown}</span>
          </div>
        </motion.div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        <div className="no-print flex justify-end">
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {isDownloading ? 'Preparing PDF...' : 'Download PDF'}
          </button>
        </div>

        <motion.section
          custom={0}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm"
        >
          <div className="px-6 py-4 border-b border-yellow-100 bg-yellow-50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-yellow-500 flex items-center justify-center text-black font-black text-sm shrink-0">1</div>
            <div className="flex-1">
              <h2 className="font-black text-gray-900">Stage 1 - Concept Notes</h2>
              <p className="text-xs text-gray-500">Complete revision material for your exam</p>
            </div>
            <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full shrink-0">+ +50 XP</span>
          </div>

          <div className="p-6 space-y-5">
            {learningContent ? (
              <>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="text-xs font-black text-yellow-700 uppercase tracking-wide mb-3">Key Points to Remember</p>
                  <ul className="space-y-2">
                    {(concept?.keyPoints ?? []).map((point, index) => (
                      <li key={index} className="flex items-start gap-2.5">
                        <span className="text-yellow-500 font-black shrink-0 mt-0.5">&gt;</span>
                        <span className="text-sm font-semibold text-gray-800">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-4">Full Notes</p>
                  <div className="space-y-4">
                    {contentSections.map((section, sectionIndex) => (
                      <div key={`${section.heading ?? 'section'}-${sectionIndex}`}>
                        {section.heading && (
                          <h3 className="text-sm font-black text-gray-900 mb-2 flex items-center gap-2">
                            <span className="w-1 h-4 bg-yellow-500 rounded-full inline-block" />
                            {section.heading}
                          </h3>
                        )}

                        <div className="space-y-1 pl-3">
                          {section.lines.map((line, lineIndex) => {
                            if (
                              /^\s{2,}/.test(line) ||
                              line.startsWith('//') ||
                              line.startsWith('#') ||
                              (line.includes('(') && line.includes(')') && !line.includes(' is ') && !line.includes(' are ') && !line.includes(' has '))
                            ) {
                              return (
                                <pre key={lineIndex} className="text-xs bg-gray-950 text-green-400 font-mono rounded-lg px-3 py-1.5 overflow-x-auto">
                                  {line}
                                </pre>
                              )
                            }

                            if (/^[-->]/.test(line.trim())) {
                              return (
                                <div key={lineIndex} className="flex items-start gap-2">
                                  <span className="text-yellow-500 font-bold shrink-0 mt-0.5 text-xs">&gt;</span>
                                  <span className="text-sm text-gray-700">{line.replace(/^[-->]\s*/, '')}</span>
                                </div>
                              )
                            }

                            if (/^\d+\./.test(line.trim())) {
                              return (
                                <div key={lineIndex} className="flex items-start gap-2">
                                  <span className="text-yellow-600 font-bold shrink-0 text-xs w-4">{line.match(/^\d+/)?.[0]}.</span>
                                  <span className="text-sm text-gray-700">{line.replace(/^\d+\.\s*/, '')}</span>
                                </div>
                              )
                            }

                            return (
                              <p key={lineIndex} className="text-sm text-gray-700 leading-relaxed">
                                {line}
                              </p>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">No notes available for this concept.</p>
            )}
          </div>
        </motion.section>

        <motion.section
          custom={1}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm"
        >
          <div className="px-6 py-4 border-b border-blue-100 bg-blue-50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-black text-sm shrink-0">2</div>
            <div className="flex-1">
              <h2 className="font-black text-gray-900">Stage 2 - Assessment Answers</h2>
              <p className="text-xs text-gray-500">All questions with correct answers and explanations</p>
            </div>
            <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full shrink-0">
              {mcqScore}/{mcqTotal} . {mcqPercent}%
            </span>
          </div>

          <div className="p-6 space-y-4">
            {loading ? (
              <div className="text-center py-10">
                <div className="w-8 h-8 rounded-full border-2 border-blue-200 border-t-blue-500 animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-400">Loading answers...</p>
              </div>
            ) : questions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No assessment questions were available for this concept.</p>
            ) : (
              questions.map((question, index) => {
                const answer = assessmentResult?.answers.find((item) => item.questionId === question.id)
                const isCorrect = answer?.isCorrect ?? false
                const correctAnswer = Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer]
                const resolvedAnswer = question.options
                  ? question.options
                      .filter((option) => correctAnswer.includes(option.id))
                      .map((option) => `${option.id.toUpperCase()}. ${option.text}`)
                      .join(', ')
                  : correctAnswer.join(', ')

                return (
                  <div key={question.id} className={`rounded-xl border overflow-hidden ${isCorrect ? 'border-green-200' : 'border-gray-200'}`}>
                    <div className={`px-4 py-2.5 flex items-center gap-2 ${isCorrect ? 'bg-green-50' : 'bg-gray-50'}`}>
                      <span className="text-sm">{isCorrect ? '+' : 'Review'}</span>
                      <span className="text-xs font-bold text-gray-500">Q{index + 1}</span>
                      <span className="text-xs text-gray-400 capitalize">{question.type.replace('_', ' ')}</span>
                      <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {isCorrect ? `+${question.points} pts` : 'Review'}
                      </span>
                    </div>

                    <div className="px-4 py-3 space-y-3">
                      <p className="text-sm font-semibold text-gray-900 leading-snug">{question.question}</p>

                      {question.code && (
                        <pre className="text-xs bg-gray-950 text-green-400 rounded-lg p-3 overflow-x-auto font-mono leading-5">
                          {question.code}
                        </pre>
                      )}

                      {question.options ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {question.options.map((option) => {
                            const isRight = correctAnswer.includes(option.id)
                            return (
                              <div
                                key={option.id}
                                className={`text-xs rounded-lg px-3 py-2 border font-medium flex items-center gap-2 ${
                                  isRight ? 'bg-green-50 border-green-300 text-green-800 font-bold' : 'bg-gray-50 border-gray-100 text-gray-400'
                                }`}
                              >
                                <span className="font-black w-4 shrink-0">{option.id.toUpperCase()}.</span>
                                <span>{option.text}</span>
                                {isRight && <span className="ml-auto text-green-600 font-black">+</span>}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-800 text-xs font-bold">
                          <span className="text-green-600">+</span>
                          Correct Answer:
                          <span className="font-black">{resolvedAnswer}</span>
                        </div>
                      )}

                      <div className="flex gap-2 p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
                        <Lightbulb className="w-4 h-4 shrink-0 text-yellow-500 mt-0.5" />
                        <p className="text-xs text-gray-700 leading-relaxed">{question.explanation}</p>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </motion.section>

        <motion.section
          custom={2}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm"
        >
          <div className="px-6 py-4 border-b border-purple-100 bg-purple-50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-purple-500 flex items-center justify-center text-white font-black text-sm shrink-0">3</div>
            <div className="flex-1">
              <h2 className="font-black text-gray-900">Stage 3 - Coding Challenges</h2>
              <p className="text-xs text-gray-500">Problem statements and your submitted solutions</p>
            </div>
            <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full shrink-0">
              {codingCorrectCount}/{codingTotalCount || 0} passed
            </span>
          </div>

          <div className="p-6 space-y-6">
            {resolvedChallenges.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No challenges available for this concept.</p>
            ) : (
              resolvedChallenges.map((challenge, index) => {
                const submission = getBestCode(challenge.id)
                const passed = submission?.testsPassed ?? 0
                const total = submission?.totalTests ?? (challenge.visibleTestCases.length + challenge.hiddenTestCases.length)
                const solutionCode = submission?.code ?? challenge.starterCode
                const diffBg = challenge.difficulty === 'basic'
                  ? 'bg-green-50 border-green-200'
                  : challenge.difficulty === 'medium'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-red-50 border-red-200'
                const diffText = challenge.difficulty === 'basic'
                  ? 'text-green-700'
                  : challenge.difficulty === 'medium'
                    ? 'text-yellow-700'
                    : 'text-red-700'

                return (
                  <div key={challenge.id} className={`rounded-xl border-2 overflow-hidden ${diffBg}`}>
                    <div className={`px-5 py-3 flex items-center gap-3 border-b ${diffBg}`}>
                      <span className={`text-xs font-black uppercase tracking-wide px-2.5 py-1 rounded-full border ${diffBg} ${diffText}`}>
                        {challenge.difficulty === 'basic' ? 'Easy' : challenge.difficulty === 'medium' ? 'Medium' : 'Hard'}
                      </span>
                      <div className="flex-1">
                        <span className="text-xs text-gray-400">Challenge {index + 1}</span>
                        <h3 className="font-black text-gray-900 text-base">{challenge.title}</h3>
                      </div>
                      <div className={`text-sm font-black ${passed === total && total > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                        {passed}/{total} tests
                      </div>
                    </div>

                    <div className="bg-white p-5 space-y-4">
                      <div>
                        <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-2">Problem Statement</p>
                        <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{challenge.problemStatement}</p>
                        </div>
                      </div>

                      {challenge.examples.length > 0 && (
                        <div>
                          <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-2">Examples</p>
                          <div className="space-y-2">
                            {challenge.examples.map((example, exampleIndex) => (
                              <div key={exampleIndex} className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                                {example.input && (
                                  <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                                    <span className="text-gray-400 font-sans font-bold block mb-0.5">Input</span>
                                    {example.input}
                                  </div>
                                )}
                                <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                                  <span className="text-gray-400 font-sans font-bold block mb-0.5">Output</span>
                                  {example.output}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-black text-gray-500 uppercase tracking-wide">
                            {submission ? 'Your Submitted Code' : 'Starter Code'}
                          </p>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            submission?.status === 'accepted'
                              ? 'bg-green-100 text-green-700'
                              : submission
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-500'
                          }`}>
                            {submission?.status === 'accepted' ? '+ Accepted' : submission ? `${passed}/${total} tests` : 'Starter'}
                          </span>
                        </div>
                        <pre className="bg-gray-950 text-green-400 rounded-xl p-4 text-xs font-mono overflow-x-auto leading-5">
                          <code>{solutionCode.trim()}</code>
                        </pre>
                      </div>

                      {challenge.visibleTestCases.length > 0 && (
                        <div>
                          <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-2">Test Cases</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {challenge.visibleTestCases.map((testCase, testCaseIndex) => (
                              <div key={testCaseIndex} className="text-xs font-mono bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                                <span className="text-gray-400 font-sans text-xs">In:</span> <span className="text-gray-700">{testCase.input || '(none)'}</span>
                                <br />
                                <span className="text-gray-400 font-sans text-xs">Out:</span> <span className="text-gray-800 font-bold">{testCase.expectedOutput}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </motion.section>

        <motion.section
          custom={3}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="no-print bg-gray-950 rounded-2xl p-8 text-center"
        >
          <div className="flex justify-center mb-3"><Rocket className="w-10 h-10 text-yellow-400" /></div>
          <h3 className="text-2xl font-black text-white mb-2">What&apos;s Next?</h3>
          <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
            Keep the momentum going. Every concept mastered builds a stronger foundation.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
            <Link href="/dashboard" className="px-6 py-3 bg-white hover:bg-gray-100 text-gray-950 font-bold text-sm rounded-full transition-all">
              Dashboard
            </Link>

            <Link href={`/language/${languageId}`} className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm rounded-full transition-all">
              Next Concept &rarr;</Link>

            {certificateUnlocked ? (
              <Link
                href={`/language/${languageId}/certificate`}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm rounded-full transition-all flex items-center gap-2 justify-center border border-white/20"
              >
                <GraduationCap className="w-4 h-4" /> View Certificate
              </Link>
            ) : (
              <div className="px-6 py-3 bg-white/5 text-gray-400 font-semibold text-sm rounded-full flex items-center gap-2 justify-center border border-white/10">
                <Lock className="w-4 h-4" /> Complete {remainingConceptsToUnlock} more concept{remainingConceptsToUnlock === 1 ? '' : 's'} to unlock the certificate
              </div>
            )}

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm rounded-full transition-all flex items-center gap-2 justify-center"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {isDownloading ? 'Preparing PDF...' : 'Download PDF'}
            </button>

            <Link
              href="/progress"
              className="px-6 py-3 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-semibold text-sm rounded-full transition-all flex items-center gap-2"
            >
              <BarChart2 className="w-4 h-4" /> View Progress
            </Link>
          </div>
        </motion.section>
      </div>
    </div>
  )
}
