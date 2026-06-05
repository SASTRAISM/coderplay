'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Lock as LockIcon } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useStrictClipboardGuard } from '@/hooks/useStrictClipboardGuard'
import { ProctoringOverlay } from '@/components/exam/ProctoringOverlay'
import { useExamMode } from '@/context/ExamModeContext'
import { CODING_CHALLENGES } from '@/data/codingChallenges'
import { CodingChallengePanel, getCodingCodeStorageKey } from '@/components/coding/CodingChallengePanel'
import { AICodingAssistant } from '@/components/coding/AICodingAssistant'
import { StageProgress } from '@/components/learning/StageProgress'
import { markStageComplete, saveCodeSubmission, saveCodingStats } from '@/lib/firebase/firestore'
import { aiService } from '@/lib/ai/aiService'
import { cn } from '@/lib/utils'
import type { CodingChallenge } from '@/types'

type Difficulty = 'basic' | 'medium' | 'hard'
const DIFF_ORDER: Difficulty[] = ['basic', 'medium', 'hard']
const ANSWER_REVEAL_SECONDS = 300

// Concept metadata - same map as Stage2 for language lookup
const CONCEPT_LANG: Record<string, { title: string; keyPoints: string[]; language: string }> = {
  // JavaScript
  js_intro: { title: 'Introduction to JavaScript', keyPoints: ['console.log() for output', 'script tag linking', 'case-sensitive'], language: 'javascript' },
  js_variables: { title: 'Variables - var, let & const', keyPoints: ['const default; let when reassignment needed', 'block vs function scope', 'hoisting'], language: 'javascript' },
  js_datatypes: { title: 'Data Types & Type Coercion', keyPoints: ['7 primitive types', 'typeof null is "object"', 'always use ==='], language: 'javascript' },
  js_operators: { title: 'Operators & Expressions', keyPoints: ['float division 10/3=3.333', '?? nullish coalescing', '?. optional chaining'], language: 'javascript' },
  js_control_flow: { title: 'Control Flow', keyPoints: ['if/else with curly braces', 'switch needs break', 'ternary operator'], language: 'javascript' },
  js_loops: { title: 'Loops', keyPoints: ['for...of for arrays', 'for...in for objects', 'break and continue'], language: 'javascript' },
  js_functions: { title: 'Functions & Arrow Functions', keyPoints: ['arrow functions no own this', 'default params', 'rest params ...args'], language: 'javascript' },
  js_arrays: { title: 'Arrays & Array Methods', keyPoints: ['map filter reduce', 'push pop unshift shift', 'splice vs slice'], language: 'javascript' },
  js_objects: { title: 'Objects, Methods & JSON', keyPoints: ['dot vs bracket notation', 'destructuring', 'JSON.stringify/parse'], language: 'javascript' },
  js_strings: { title: 'Strings & Template Literals', keyPoints: ['template literals backtick', 'strings immutable', 'split join trim includes'], language: 'javascript' },
  js_dom: { title: 'DOM Manipulation', keyPoints: ['querySelector querySelectorAll', 'textContent vs innerHTML', 'createElement appendChild'], language: 'javascript' },
  js_events: { title: 'Events & Event Listeners', keyPoints: ['addEventListener', 'e.preventDefault()', 'event delegation'], language: 'javascript' },
  js_es6: { title: 'ES6+ Modern Features', keyPoints: ['destructuring spread rest', 'classes and inheritance', 'import/export modules'], language: 'javascript' },
  js_async: { title: 'Async JavaScript', keyPoints: ['async/await with try/catch', 'Promise.all parallel', 'event loop microtasks'], language: 'javascript' },
  js_error_handling: { title: 'Error Handling & Debugging', keyPoints: ['try/catch/finally', 'custom Error classes', 'console.table debugger'], language: 'javascript' },
  // C
  c_intro: { title: 'Introduction to C', keyPoints: ['main() function', 'printf/scanf', 'algorithm design'], language: 'c' },
  c_variables: { title: 'Data Types & Variables in C', keyPoints: ['int float double char', 'sizeof()', 'type casting'], language: 'c' },
  c_operators: { title: 'Operators in C', keyPoints: ['arithmetic operators', 'logical && || !', 'ternary operator'], language: 'c' },
  c_control_flow: { title: 'Control Structures in C', keyPoints: ['if-else', 'switch-case', 'nested if'], language: 'c' },
  c_loops: { title: 'Loops in C', keyPoints: ['for loop', 'while loop', 'do-while', 'break continue'], language: 'c' },
  c_functions: { title: 'Functions in C', keyPoints: ['return types', 'pass by value', 'recursion'], language: 'c' },
  c_arrays: { title: 'Arrays in C', keyPoints: ['array declaration', '2D arrays', 'string as char array'], language: 'c' },
  c_strings: { title: 'Strings in C', keyPoints: ['char array', 'strcpy strcat strlen', 'null terminator'], language: 'c' },
  c_structures: { title: 'Structures in C', keyPoints: ['struct keyword', 'member access with .', 'typedef'], language: 'c' },
  c_pointers: { title: 'Pointers in C', keyPoints: ['& address-of', '* dereference', 'pointer arithmetic'], language: 'c' },
  c_files: { title: 'File Handling in C', keyPoints: ['FILE pointer', 'fopen fclose', 'fprintf fscanf'], language: 'c' },
  cpp_oop_intro: { title: 'OOP in C++', keyPoints: ['class and object', 'encapsulation', 'inheritance'], language: 'cpp' },
  cpp_basics: { title: 'C++ Basics', keyPoints: ['cin cout', 'namespace std', 'function overloading'], language: 'cpp' },
  cpp_functions: { title: 'Functions in C++', keyPoints: ['overloading', 'default arguments', 'pass by reference'], language: 'cpp' },
  cpp_classes: { title: 'Classes in C++', keyPoints: ['constructor destructor', 'access specifiers', 'this pointer'], language: 'cpp' },
  cpp_arrays_strings: { title: 'Arrays & Strings in C++', keyPoints: ['std::string', 'vector', 'string methods'], language: 'cpp' },
  cpp_templates: { title: 'Templates in C++', keyPoints: ['function templates', 'class templates', 'STL'], language: 'cpp' },
  cpp_operator_overloading: { title: 'Operator Overloading', keyPoints: ['operator keyword', 'friend functions'], language: 'cpp' },
  cpp_inheritance: { title: 'Inheritance in C++', keyPoints: ['base derived class', 'protected access', 'super'], language: 'cpp' },
  cpp_memory: { title: 'Memory Management', keyPoints: ['new delete', 'heap vs stack', 'memory leaks'], language: 'cpp' },
  cpp_virtual: { title: 'Virtual Functions', keyPoints: ['virtual keyword', 'polymorphism', 'pure virtual'], language: 'cpp' },
  cpp_streams: { title: 'Streams in C++', keyPoints: ['ifstream ofstream', 'fstream', 'getline'], language: 'cpp' },
  java_intro: { title: 'Introduction to Java', keyPoints: ['JVM and JDK', 'main method', 'System.out.println'], language: 'java' },
  java_datatypes: { title: 'Data Types & Arrays in Java', keyPoints: ['primitive types', 'arrays int[]', 'type casting'], language: 'java' },
  java_operators: { title: 'Operators in Java', keyPoints: ['integer division', 'modulo', 'ternary operator'], language: 'java' },
  java_control: { title: 'Control Statements in Java', keyPoints: ['if-else', 'switch-case', 'for while do-while'], language: 'java' },
  java_classes: { title: 'Methods & Classes in Java', keyPoints: ['constructor', 'this keyword', 'encapsulation'], language: 'java' },
  java_interfaces: { title: 'Interfaces in Java', keyPoints: ['interface contract', 'implements keyword', 'packages'], language: 'java' },
  java_exceptions: { title: 'Exception Handling in Java', keyPoints: ['try-catch-finally', 'throws keyword', 'custom exceptions'], language: 'java' },
  java_threads: { title: 'Multithreading in Java', keyPoints: ['Thread Runnable', 'start()', 'synchronized'], language: 'java' },
  java_io: { title: 'I/O & Strings in Java', keyPoints: ['Scanner', 'String immutability', 'StringBuilder'], language: 'java' },
  java_collections: { title: 'Collections Framework', keyPoints: ['ArrayList HashMap', 'Iterator', 'Collections.sort'], language: 'java' },
  java_events: { title: 'Event Handling in Java', keyPoints: ['ActionListener', 'addActionListener', 'anonymous classes'], language: 'java' },
  java_swing: { title: 'Swing GUI', keyPoints: ['JFrame JButton JLabel', 'FlowLayout BorderLayout', 'setVisible'], language: 'java' },
  html_structure: { title: 'HTML Structure', keyPoints: ['DOCTYPE', 'semantic tags', 'headings links images'], language: 'html' },
  css_selectors: { title: 'CSS Selectors', keyPoints: ['class id selectors', 'specificity', 'pseudo-classes'], language: 'css' },
  css_flexbox: { title: 'CSS Flexbox', keyPoints: ['display flex', 'justify-content', 'align-items'], language: 'css' },
  css_grid: { title: 'CSS Grid', keyPoints: ['grid-template-columns', 'gap', 'grid-area'], language: 'css' },
  responsive_design: { title: 'Responsive Design', keyPoints: ['media queries', 'mobile-first', 'viewport'], language: 'css' },
  numpy_basics: { title: 'NumPy Basics', keyPoints: ['ndarray', 'shape dtype', 'broadcasting'], language: 'python' },
  pandas_basics: { title: 'Pandas Basics', keyPoints: ['DataFrame Series', 'read_csv', 'groupby'], language: 'python' },
  data_visualization: { title: 'Data Visualization', keyPoints: ['matplotlib', 'plt.plot plt.bar', 'seaborn'], language: 'python' },
  data_cleaning: { title: 'Data Cleaning', keyPoints: ['isnull fillna', 'drop_duplicates', 'astype'], language: 'python' },
  statistical_analysis: { title: 'Statistical Analysis', keyPoints: ['mean median mode', 'standard deviation', 'correlation'], language: 'python' },
}

function getConceptMeta(id: string) {
  if (CONCEPT_LANG[id]) return CONCEPT_LANG[id]
  const title = id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const lang = id.startsWith('js_') ? 'javascript'
    : id.startsWith('c_') ? 'c'
    : id.startsWith('cpp_') ? 'cpp'
    : id.startsWith('java_') ? 'java'
    : id.startsWith('html_') || id.startsWith('css_') || id === 'responsive_design' ? 'html'
    : 'python'
  return { title, keyPoints: [], language: lang }
}

function s3Key(id: string, userId: string) { return `cp_s3_${userId}_${id}` }
function challengeCacheKey(id: string, userId: string) { return `cpc_${userId}_${id}` }
function referenceAnswerKey(challengeId: string, userId: string) { return `cp_ref_answer_${userId}_${challengeId}` }

function loadS3(conceptId: string, userId: string) {
  try {
    const raw = localStorage.getItem(s3Key(conceptId, userId))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export default function Stage3PageClient({ params }: { params: { conceptId: string } }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [startTime] = useState(new Date())
  const { warning, guardProps } = useStrictClipboardGuard('Coding round')
  const { enterExamMode, exitExamMode } = useExamMode()

  // Hide navbar for the entire coding round (fullscreen is managed by ProctoringOverlay)
  useEffect(() => {
    enterExamMode()
    return () => {
      exitExamMode()
      try { if (document.fullscreenElement) document.exitFullscreen() } catch { /* ignore */ }
    }
  }, [enterExamMode, exitExamMode])

  const [activeDiff, setActiveDiff] = useState<Difficulty>('basic')
  const [completedDiffs, setCompletedDiffs] = useState<Difficulty[]>([])
  const [submittedCodes, setSubmittedCodes] = useState<Record<string, string>>({})
  const [submittedResults, setSubmittedResults] = useState<Record<string, { passed: number; total: number }>>({})
  const completedDiffsRef = useRef<Difficulty[]>([])
  const submittedResultsRef = useRef<Record<string, { passed: number; total: number }>>({})
  const [assistantUsage, setAssistantUsage] = useState({
    hintRequests: 0,
    debugRequests: 0,
    logicRequests: 0,
    fullAnswerRequests: 0,
    customQuestionRequests: 0,
  })
  const [isFinishing, setIsFinishing] = useState(false)
  const [showQuitModal, setShowQuitModal] = useState(false)
  const [hasRestoredState, setHasRestoredState] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [referenceSolutions, setReferenceSolutions] = useState<Record<string, string>>({})
  const [loadingReferenceFor, setLoadingReferenceFor] = useState<string | null>(null)
  const leavingRef = useRef(false)
  const generateStartedRef = useRef<string | null>(null)

  useEffect(() => { completedDiffsRef.current = completedDiffs }, [completedDiffs])
  useEffect(() => { submittedResultsRef.current = submittedResults }, [submittedResults])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [startTime])

  // Persist Stage 3 progress on every change
  useEffect(() => {
    if (!hasRestoredState || !user) return
    try {
      localStorage.setItem(s3Key(params.conceptId, user.uid), JSON.stringify({
        activeDiff,
        completedDiffs,
        submittedCodes,
        submittedResults: submittedResultsRef.current,
        assistantUsage,
      }))
    } catch { /* quota */ }
  }, [activeDiff, assistantUsage, completedDiffs, hasRestoredState, params.conceptId, submittedCodes, submittedResults, user])

  const staticChallenges = useMemo(() => CODING_CHALLENGES[params.conceptId] || [], [params.conceptId])
  const meta = useMemo(() => getConceptMeta(params.conceptId), [params.conceptId])

  const [challenges, setChallenges] = useState<CodingChallenge[]>(staticChallenges)
  const [isGenerating, setIsGenerating] = useState(staticChallenges.length === 0)
  const [generateError, setGenerateError] = useState('')

  useEffect(() => {
    if (loading) return
    if (!user) {
      setHasRestoredState(true)
      return
    }

    const saved = loadS3(params.conceptId, user.uid)
    if (saved) {
      setActiveDiff(saved.activeDiff ?? 'basic')
      setCompletedDiffs(saved.completedDiffs ?? [])
      setSubmittedCodes(saved.submittedCodes ?? {})
      setSubmittedResults(saved.submittedResults ?? {})
      setAssistantUsage(saved.assistantUsage ?? {
        hintRequests: 0,
        debugRequests: 0,
        logicRequests: 0,
        fullAnswerRequests: 0,
        customQuestionRequests: 0,
      })
    }

    if (staticChallenges.length > 0) {
      setChallenges(staticChallenges)
      setIsGenerating(false)
      setHasRestoredState(true)
      return
    }

    const cacheKey = challengeCacheKey(params.conceptId, user.uid)
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChallenges(parsed as CodingChallenge[])
          setIsGenerating(false)
          setHasRestoredState(true)
          return
        }
      } catch { /* ignore */ }
    }

    // Guard: only ever start ONE generate call per conceptId. Without this,
    // `meta.keyPoints` is a fresh array reference on each render, which
    // re-triggers the effect and floods the backend with parallel requests
    // until the browser hits ERR_INSUFFICIENT_RESOURCES.
    if (generateStartedRef.current === params.conceptId) return
    generateStartedRef.current = params.conceptId

    setIsGenerating(true)
    aiService.generateChallenges(params.conceptId, meta.title, meta.keyPoints, meta.language)
      .then((generated) => {
        if (generated.length > 0) {
          setChallenges(generated as CodingChallenge[])
          sessionStorage.setItem(cacheKey, JSON.stringify(generated))
        } else {
          setGenerateError('Could not generate challenges. Make sure the backend is running.')
          // Allow retry on next mount/concept change
          generateStartedRef.current = null
        }
      })
      .finally(() => {
        setIsGenerating(false)
        setHasRestoredState(true)
      })
  }, [loading, meta.keyPoints, meta.language, meta.title, params.conceptId, staticChallenges, user])

  const challenge = challenges.find((c) => c.difficulty === activeDiff) || challenges[0]
  const answerUnlocked = elapsed >= ANSWER_REVEAL_SECONDS
  const secondsUntilAnswer = Math.max(0, ANSWER_REVEAL_SECONDS - elapsed)

  const difficulties: { id: Difficulty; label: string; emoji: string }[] = [
    { id: 'basic', label: 'Basic', emoji: 'B' },
    { id: 'medium', label: 'Medium', emoji: 'M' },
    { id: 'hard', label: 'Hard', emoji: 'H' },
  ]

  const isUnlocked = (diff: Difficulty) => {
    const idx = DIFF_ORDER.indexOf(diff)
    return idx === 0 || completedDiffs.includes(DIFF_ORDER[idx - 1])
  }

  const isCurrentPassed = completedDiffs.includes(activeDiff)
  const nextDiff = DIFF_ORDER[DIFF_ORDER.indexOf(activeDiff) + 1] as Difficulty | undefined
  const allDone = completedDiffs.length === DIFF_ORDER.filter(d => challenges.some(c => c.difficulty === d)).length

  useEffect(() => {
    if (!user || !challenge || !answerUnlocked) return

    const storageKey = referenceAnswerKey(challenge.id, user.uid)
    const cached = sessionStorage.getItem(storageKey)
    if (cached === '__unavailable__') {
      setReferenceSolutions((prev) => prev[challenge.id] ? prev : { ...prev, [challenge.id]: '__unavailable__' })
      return
    }
    if (cached) {
      setReferenceSolutions((prev) => prev[challenge.id] ? prev : { ...prev, [challenge.id]: cached })
      return
    }

    if (referenceSolutions[challenge.id] || loadingReferenceFor === challenge.id) return

    setLoadingReferenceFor(challenge.id)
    aiService.generateReferenceSolution(challenge, meta.language)
      .then((solution) => {
        if (!solution) {
          sessionStorage.setItem(storageKey, '__unavailable__')
          setReferenceSolutions((prev) => ({ ...prev, [challenge.id]: '__unavailable__' }))
          return
        }
        sessionStorage.setItem(storageKey, solution)
        setReferenceSolutions((prev) => ({ ...prev, [challenge.id]: solution }))
      })
      .finally(() => setLoadingReferenceFor((current) => current === challenge.id ? null : current))
  }, [answerUnlocked, challenge, loadingReferenceFor, meta.language, referenceSolutions, user])

  const getAvailableDiffs = useCallback(() => (
    DIFF_ORDER.filter((diff) => challenges.some((challengeItem) => challengeItem.difficulty === diff))
  ), [challenges])

  const buildCodeSnapshot = useCallback(() => {
    const snapshot: Record<string, string> = { ...submittedCodes }

    if (user) {
      challenges.forEach((challengeItem) => {
        try {
          const savedCode = localStorage.getItem(getCodingCodeStorageKey(challengeItem.id, user.uid))
          if (savedCode && savedCode.trim()) {
            snapshot[challengeItem.difficulty] = savedCode
          }
        } catch { /* localStorage can be blocked */ }
      })
    }

    return snapshot
  }, [challenges, submittedCodes, user])

  const persistStage3Snapshot = useCallback((reason?: 'terminated' | 'quit', completedOverride = completedDiffs) => {
    if (!user) return
    try {
      localStorage.setItem(s3Key(params.conceptId, user.uid), JSON.stringify({
        activeDiff,
        completedDiffs: completedOverride,
        submittedCodes: buildCodeSnapshot(),
        submittedResults,
        assistantUsage,
        reason,
        lastSavedAt: new Date().toISOString(),
      }))
    } catch { /* quota */ }
  }, [activeDiff, assistantUsage, buildCodeSnapshot, completedDiffs, params.conceptId, submittedResults, user])

  const saveCodeSnapshotToFirestore = useCallback(async () => {
    if (!user) return

    const codeSnapshot = buildCodeSnapshot()
    const writes = getAvailableDiffs().map((diff) => {
      const challengeItem = challenges.find((item) => item.difficulty === diff)
      const code = codeSnapshot[diff]
      if (!challengeItem || !code?.trim()) return null

      const result = submittedResultsRef.current[diff]
      const totalTests = result?.total ?? challengeItem.visibleTestCases.length
      const testsPassed = result?.passed ?? 0

      return saveCodeSubmission(user.uid, {
        uid: user.uid,
        challengeId: challengeItem.id,
        conceptId: params.conceptId,
        code,
        language: meta.language,
        testsPassed,
        totalTests,
        status: result ? (testsPassed === totalTests ? 'accepted' : 'wrong_answer') : 'pending',
        submittedAt: new Date(),
      })
    }).filter((write): write is Promise<string> => Boolean(write))

    await Promise.allSettled(writes)
  }, [buildCodeSnapshot, challenges, getAvailableDiffs, meta.language, params.conceptId, submittedResults, user])

  const saveCodingStatsSnapshot = useCallback(async (completedOverride = completedDiffs) => {
    if (!user) return

    const availableDiffs = getAvailableDiffs()
    const totals = availableDiffs.reduce((acc, diff) => {
      const result = submittedResultsRef.current[diff]
      return {
        passedTests: acc.passedTests + (result?.passed ?? 0),
        totalTests: acc.totalTests + (result?.total ?? 0),
      }
    }, { passedTests: 0, totalTests: 0 })

    const completedCount = completedOverride.filter((diff) => availableDiffs.includes(diff)).length

    await saveCodingStats(user.uid, params.conceptId, {
      conceptId: params.conceptId,
      totalChallenges: availableDiffs.length,
      completedChallenges: completedCount,
      codingQuestionsCorrect: completedCount,
      passedTests: totals.passedTests,
      totalTests: totals.totalTests,
      percentage: totals.totalTests > 0 ? Math.round((totals.passedTests / totals.totalTests) * 100) : 0,
      aiHelpRequests: Object.values(assistantUsage).reduce((sum, value) => sum + value, 0),
      hintRequests: assistantUsage.hintRequests,
      debugRequests: assistantUsage.debugRequests,
      logicRequests: assistantUsage.logicRequests,
      fullAnswerRequests: assistantUsage.fullAnswerRequests,
      customQuestionRequests: assistantUsage.customQuestionRequests,
      completedAt: new Date(),
    })
  }, [assistantUsage, completedDiffs, getAvailableDiffs, params.conceptId, submittedResults, user])

  const redirectToDashboard = useCallback(() => {
    try { router.replace('/dashboard') } catch { /* ignore */ }
    window.setTimeout(() => window.location.replace('/dashboard'), 700)
  }, [router])

  const handleSubmit = async (code: string, passed: number, total: number) => {
    setSubmittedCodes(prev => ({ ...prev, [activeDiff]: code }))
    const nextResults = { ...submittedResultsRef.current, [activeDiff]: { passed, total } }
    submittedResultsRef.current = nextResults
    setSubmittedResults(nextResults)
    if (passed === total) {
      const nextCompleted = completedDiffsRef.current.includes(activeDiff)
        ? completedDiffsRef.current
        : [...completedDiffsRef.current, activeDiff]
      completedDiffsRef.current = nextCompleted
      setCompletedDiffs(nextCompleted)
    }
    if (!user) return
    try {
      await saveCodeSubmission(user.uid, {
        uid: user.uid,
        challengeId: challenge?.id || '',
        conceptId: params.conceptId,
        code,
        language: meta.language,
        testsPassed: passed,
        totalTests: total,
        status: passed === total ? 'accepted' : 'wrong_answer',
        submittedAt: new Date(),
      })
    } catch { /* silent */ }
  }

  // ProctoringOverlay handles the countdown + redirect; this just exits exam mode
  const handleViolationTerminate = useCallback(() => {
    if (leavingRef.current) return
    leavingRef.current = true
    exitExamMode()
    try { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}) } catch { /* ignore */ }
  }, [exitExamMode])

  const handleChallengeNext = () => {
    // Only consider difficulties that actually have a challenge available.
    const availableDiffs = DIFF_ORDER.filter(d => challenges.some(c => c.difficulty === d))
    const doneSet = new Set(completedDiffsRef.current)
    // This button only appears after the current challenge passed inside
    // CodingChallengePanel. Mark it done here too, because parent state can
    // still be one render behind when the student clicks Next immediately.
    doneSet.add(activeDiff)
    const optimisticCompleted = availableDiffs.filter(d => doneSet.has(d))
    completedDiffsRef.current = optimisticCompleted
    setCompletedDiffs(optimisticCompleted)
    const everythingDone = availableDiffs.every(d => doneSet.has(d))

    if (everythingDone) {
      handleFinish(optimisticCompleted)
      return
    }
    // Pick the next available difficulty AFTER activeDiff. If none, fall back
    // to the first unfinished available difficulty.
    const currentIdx = availableDiffs.indexOf(activeDiff)
    const nextAvail = currentIdx >= 0 ? availableDiffs.slice(currentIdx + 1).find(d => !doneSet.has(d)) : undefined
    const next = nextAvail ?? availableDiffs.find(d => !doneSet.has(d))
    if (next && next !== activeDiff) {
      setActiveDiff(next)
      return
    }
    // Nothing left to do
    handleFinish()
  }

  const handleFinish = async (completedOverride = completedDiffsRef.current) => {
    if (isFinishing || leavingRef.current) return
    setIsFinishing(true)
    leavingRef.current = true  // prevent violation handler from redirecting to dashboard
    persistStage3Snapshot(undefined, completedOverride)
    exitExamMode()
    try { if (document.fullscreenElement) await document.exitFullscreen() } catch { /* ignore */ }

    const goComplete = () => {
      // Static export serves directory routes from /path/, so the trailing
      // slash is required - without it /complete returns 404.
      const url = `/learn/${params.conceptId}/complete/`
      try { router.push(url) } catch { /* ignore */ }
      window.setTimeout(() => window.location.assign(url), 600)
    }

    if (user) {
      // Race the saves against a 2.5s cap so a slow/throttled backend
      // can never trap the student on the coding screen.
      await Promise.race([
        Promise.allSettled([
          saveCodeSnapshotToFirestore(),
          saveCodingStatsSnapshot(completedOverride),
          markStageComplete(user.uid, params.conceptId, 3, 150),
        ]),
        new Promise((resolve) => window.setTimeout(resolve, 2500)),
      ])
    }
    goComplete()
  }

  const handleBackAttempt = useCallback(() => {
    if (leavingRef.current || isFinishing) return
    setShowQuitModal(true)
  }, [isFinishing])

  const handleQuitExam = useCallback(async () => {
    if (leavingRef.current) return
    leavingRef.current = true
    setShowQuitModal(false)
    persistStage3Snapshot('quit')

    const saveWork = Promise.allSettled([
      saveCodeSnapshotToFirestore(),
      saveCodingStatsSnapshot(),
    ])

    await Promise.race([
      saveWork,
      new Promise((resolve) => window.setTimeout(resolve, 1200)),
    ])

    redirectToDashboard()
  }, [persistStage3Snapshot, redirectToDashboard, saveCodeSnapshotToFirestore, saveCodingStatsSnapshot])

  // -- Generating state --
  if (isGenerating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-5 p-8 max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-yellow-500 flex items-center justify-center mx-auto shadow-lg">
            <div className="w-8 h-8 rounded-full border-4 border-black/20 border-t-black animate-spin" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Building Your Challenges</h2>
            <p className="text-gray-500 text-sm mt-1">Cody AI is crafting 3 coding challenges for <span className="font-semibold text-gray-700">{meta.title}</span>...</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-bounce [animation-delay:0ms]" />
            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-bounce [animation-delay:150ms]" />
            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-bounce [animation-delay:300ms]" />
          </div>
          <p className="text-xs text-gray-400">This takes about 45-60 seconds the first time</p>
        </div>
      </div>
    )
  }

  // -- No challenges --
  if (challenges.length === 0 || !challenge) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4 p-8 max-w-sm">
          <div className="text-5xl text-yellow-500 font-black">!</div>
          <h2 className="text-xl font-bold text-gray-900">Backend unavailable</h2>
          <p className="text-gray-500 text-sm">
            {generateError?.includes('502') || generateError?.includes('fetch')
              ? 'The AI server is offline. Please make sure the backend is running on your Mac, then try again.'
              : generateError || 'Could not generate challenges for this concept.'}
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 text-left">
            <p className="font-bold mb-1">If the backend is down:</p>
            <p>Run <code className="bg-amber-100 px-1 rounded">./scripts/start-mac-backend.sh</code> on your Mac to start it.</p>
          </div>
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => { setIsGenerating(true); setGenerateError(''); window.location.reload() }}
              className="px-6 py-2.5 bg-yellow-500 text-black font-bold text-sm rounded-xl hover:bg-yellow-400 transition-colors">
              Try Again
            </button>
            <button type="button" onClick={() => { exitExamMode(); router.push(`/concept/${params.conceptId}`) }}
              className="text-sm text-gray-500 hover:text-gray-700">
              Back to Concept
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ProctoringOverlay
      scopeLabel="Coding Round"
      showStatusBar
      onTerminate={handleViolationTerminate}
      onBackAttempt={handleBackAttempt}
    >
    <div className="fixed inset-0 z-[100] bg-gray-50 flex flex-col pt-6" {...guardProps}>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center gap-4 shrink-0 z-10">
        <button type="button" onClick={handleBackAttempt} className="flex items-center gap-1 text-gray-400 hover:text-gray-700 transition-colors group shrink-0">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-x-0.5 transition-transform"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          <span className="text-xs font-medium hidden sm:inline">Back</span>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-yellow-600 bg-yellow-50 border border-yellow-200 px-2.5 py-0.5 rounded-full">Stage 3 - Coding Practice</span>
          </div>
          <h1 className="text-sm font-bold text-gray-900 mt-0.5">{meta.title}</h1>
        </div>
        <div className="hidden sm:block shrink-0"><StageProgress currentStage={3} completedStages={[1, 2]} /></div>
        {allDone && (
          <button type="button" onClick={() => handleFinish()} disabled={isFinishing}
            className="shrink-0 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs rounded-full transition-all disabled:opacity-50 flex items-center gap-1.5">
            {isFinishing ? <><span className="w-3 h-3 rounded-full border-2 border-black/30 border-t-black animate-spin" />Saving...</> : 'View Summary'}
          </button>
        )}
      </div>

      {warning && (
        <div className="px-4 sm:px-6 py-2 bg-red-50 border-b border-red-100 shrink-0">
          <p className="text-xs font-semibold text-red-600">{warning}</p>
        </div>
      )}

      {/* Difficulty tabs */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-2.5 flex items-center gap-2 shrink-0">
        <div className="flex gap-1.5">
          {difficulties.map((d) => {
            const hasChallenge = challenges.some((c) => c.difficulty === d.id)
            if (!hasChallenge) return null
            const isDone = completedDiffs.includes(d.id)
            const unlocked = isUnlocked(d.id)
            const isActive = activeDiff === d.id
            return (
              <button type="button" key={d.id} onClick={() => unlocked && setActiveDiff(d.id)} disabled={!unlocked}
                className={cn('flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all',
                  isActive && isDone ? 'bg-green-500 text-white shadow-sm' :
                  isActive ? 'bg-yellow-500 text-black shadow-sm' :
                  isDone ? 'bg-green-100 text-green-700 border border-green-200' :
                  unlocked ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-gray-50 text-gray-300 cursor-not-allowed')}>
                {isDone ? <Check className="w-3.5 h-3.5" /> : !unlocked ? <LockIcon className="w-3.5 h-3.5" /> : <span>{d.emoji}</span>}
                {d.label}
              </button>
            )
          })}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-gray-400">{completedDiffs.length}/{difficulties.filter(d => challenges.some(c => c.difficulty === d.id)).length} done</span>
        </div>
      </div>

      {/* Success banner */}
      <AnimatePresence>
        {isCurrentPassed && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="shrink-0 bg-green-50 border-b border-green-200 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Check className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-green-800">{activeDiff.charAt(0).toUpperCase() + activeDiff.slice(1)} challenge passed!</p>
                <p className="text-xs text-green-600">{submittedResults[activeDiff]?.passed}/{submittedResults[activeDiff]?.total} test cases passed</p>
              </div>
            </div>
            {nextDiff && challenges.some(c => c.difficulty === nextDiff) && !allDone ? (
              <button type="button" onClick={handleChallengeNext}
                className="px-5 py-2 bg-green-500 hover:bg-green-600 text-white font-bold text-sm rounded-full transition-colors">
                Next: {nextDiff.charAt(0).toUpperCase() + nextDiff.slice(1)} &rarr;
              </button>
            ) : allDone ? (
              <button type="button" onClick={() => handleFinish()} disabled={isFinishing}
                className="px-5 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm rounded-full transition-colors">
                View Full Summary &rarr;
              </button>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="flex-1 overflow-hidden min-h-0">
          <CodingChallengePanel
            key={`${params.conceptId}-${activeDiff}`}
            challenge={challenge}
            language={meta.language}
            initialCode={submittedCodes[activeDiff]}
            storageScope={user?.uid || 'student'}
            answerUnlocked={answerUnlocked}
            secondsUntilAnswer={secondsUntilAnswer}
            referenceSolution={referenceSolutions[challenge.id] ?? null}
            onCodeChange={(code) => setSubmittedCodes((prev) => ({ ...prev, [activeDiff]: code }))}
            onSubmit={handleSubmit}
            onNext={handleChallengeNext}
            nextLabel={allDone ? 'View Summary' : nextDiff ? `Next: ${nextDiff.charAt(0).toUpperCase() + nextDiff.slice(1)}` : 'Next'}
            nextDisabled={isFinishing}
          />
        </div>
        <div className="hidden xl:flex w-72 shrink-0 border-l border-gray-200 overflow-hidden">
          <AICodingAssistant
            conceptTitle={meta.title}
            problemTitle={challenge.title}
            problemStatement={challenge.problemStatement}
            currentCode={submittedCodes[activeDiff] || challenge.starterCode}
            startTime={startTime}
            language={meta.language}
            referenceSolution={referenceSolutions[challenge.id] ?? null}
            answerUnlocked={answerUnlocked}
            onInteraction={(type) => {
              setAssistantUsage((prev) => ({
                ...prev,
                hintRequests: prev.hintRequests + (type === 'hint' ? 1 : 0),
                debugRequests: prev.debugRequests + (type === 'debug' ? 1 : 0),
                logicRequests: prev.logicRequests + (type === 'logic' ? 1 : 0),
                fullAnswerRequests: prev.fullAnswerRequests + (type === 'full-answer' ? 1 : 0),
                customQuestionRequests: prev.customQuestionRequests + (type === 'custom-question' ? 1 : 0),
              }))
            }}
          />
        </div>
      </div>

      <AnimatePresence>
        {showQuitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[260] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.92, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 10 }}
              className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 space-y-5"
            >
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center mx-auto text-2xl">!</div>
                <h2 className="text-lg font-black text-gray-900">Quit Coding Round?</h2>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Your current code will be auto-saved. You can continue now or quit and return to the dashboard.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowQuitModal(false)}
                  className="py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors"
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={handleQuitExam}
                  className="py-3 rounded-xl bg-red-500 text-white text-sm font-black hover:bg-red-600 transition-colors"
                >
                  Quit Exam
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
    </ProctoringOverlay>
  )
}
