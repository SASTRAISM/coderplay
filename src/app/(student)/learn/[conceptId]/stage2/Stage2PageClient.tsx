'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Bot } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { ASSESSMENT_QUESTIONS } from '@/data/assessmentQuestions'
import { QuestionCard } from '@/components/assessment/QuestionCard'
import type { SafeQuestion } from '@/components/assessment/QuestionCard'
import { AssessmentSummary } from '@/components/assessment/AssessmentSummary'
import { StageProgress } from '@/components/learning/StageProgress'
import { markStageComplete, saveAssessmentStats, submitAssessment } from '@/lib/firebase/firestore'
import { aiService } from '@/lib/ai/aiService'
import { tokenizeQuestions, checkAnswer as serverCheckAnswer } from '@/lib/assessService'
import { ExamAIChat } from '@/components/exam/ExamAIChat'
import { ProctoringOverlay } from '@/components/exam/ProctoringOverlay'
import type { AssessmentQuestion, UserAnswer } from '@/types'

// Derive concept metadata from conceptId
const CONCEPT_META: Record<string, { title: string; keyPoints: string[]; language: string }> = {
  // JavaScript
  js_intro: { title: 'Introduction to JavaScript', keyPoints: ['JS runs in browsers and Node.js', 'console.log() for output', 'script tag linking', 'case-sensitive language', 'interpreted at runtime'], language: 'javascript' },
  js_variables: { title: 'Variables -- var, let & const', keyPoints: ['const by default, let when reassignment needed', 'let/const block scope vs var function scope', 'hoisting: var is undefined, let/const throw error', 'camelCase naming convention', 'const objects can still be mutated'], language: 'javascript' },
  js_datatypes: { title: 'Data Types & Type Coercion', keyPoints: ['7 primitives: Number String Boolean undefined null Symbol BigInt', 'typeof null is "object" -- a JS bug', 'Always use === not ==', '"5"+2 is "52" but "5"-2 is 3', 'Falsy: 0 "" null undefined NaN false'], language: 'javascript' },
  js_operators: { title: 'Operators & Expressions', keyPoints: ['JS division always returns float: 10/3=3.333', 'Always use === and !==', '?? only falls back for null/undefined not 0 or ""', '?. prevents errors on null property access', 'Ternary: condition ? valueIfTrue : valueIfFalse'], language: 'javascript' },
  js_control_flow: { title: 'Control Flow -- if, switch & Ternary', keyPoints: ['Always use curly braces in if/else', 'switch needs break or falls through', 'Falsy: false 0 "" null undefined NaN', 'Ternary for simple conditions only', 'Use && as guard: condition && doSomething()'], language: 'javascript' },
  js_loops: { title: 'Loops -- for, while, for...of & for...in', keyPoints: ['for: when iteration count is known', 'for...of: loops over array values', 'for...in: loops over object keys', 'do...while runs at least once', 'break exits; continue skips to next'], language: 'javascript' },
  js_functions: { title: 'Functions & Arrow Functions', keyPoints: ['Declarations hoisted; expressions and arrows are not', 'Arrow functions have no own this', 'Default params: function greet(name = "Student") {}', 'Rest params (...args) collect extra args into array', 'Closures: inner functions remember outer variables'], language: 'javascript' },
  js_arrays: { title: 'Arrays & Array Methods', keyPoints: ['map() transforms each element -- returns NEW array', 'filter() keeps matching elements -- returns NEW array', 'reduce() accumulates into single value', 'push/pop modify END; unshift/shift modify START', 'splice() mutates original; slice() returns copy'], language: 'javascript' },
  js_objects: { title: 'Objects, Methods & JSON', keyPoints: ['Dot notation for known keys; bracket for dynamic keys', 'Methods use this; arrow functions lack own this', 'Destructuring: const { name, age } = person', 'Spread copies: const copy = { ...original, key: val }', 'JSON.stringify() object->string; JSON.parse() back'], language: 'javascript' },
  js_strings: { title: 'Strings & Template Literals', keyPoints: ['Template literals: `Hello ${name}!`', 'Strings are immutable -- methods return new strings', 'slice() supports negative indices; substring() does not', 'split() string->array; join() array->string', 'trim() removes whitespace; includes() checks substring'], language: 'javascript' },
  js_dom: { title: 'DOM Manipulation', keyPoints: ['querySelector returns first match; querySelectorAll returns all', 'textContent safe; innerHTML can be risky with user input', 'classList.add/remove/toggle manages CSS classes', 'createElement() + appendChild() adds dynamic content', 'dataset gives access to data-* attributes'], language: 'javascript' },
  js_events: { title: 'Events & Event Listeners', keyPoints: ['addEventListener preferred over onclick attributes', 'e.preventDefault() stops default browser action', 'Events bubble UP -- stopPropagation() stops it', 'Event delegation: listen on parent, handle child events', 'DOMContentLoaded fires after HTML parsed'], language: 'javascript' },
  js_es6: { title: 'ES6+ Modern Features', keyPoints: ['Destructuring extracts from arrays/objects in one line', 'Spread (...) expands; Rest (...) collects remaining items', 'Classes are syntactic sugar over prototypes', 'import/export for modular code', 'Optional chaining ?. and nullish coalescing ??'], language: 'javascript' },
  js_async: { title: 'Async JavaScript -- Promises & async/await', keyPoints: ['JS is single-threaded; async handled via event loop', 'async/await is syntactic sugar over Promises', 'Promise.all() runs tasks in parallel', 'await only works inside async functions', 'Microtasks (Promise .then) run before macrotasks (setTimeout)'], language: 'javascript' },
  js_error_handling: { title: 'Error Handling & Debugging', keyPoints: ['try/catch/finally: try=risky, catch=handle, finally=always', 'throw creates error; instanceof checks type caught', 'Custom error classes extend Error', 'Re-throw errors you cannot handle: throw e in catch', 'console.table() console.time() debugger for DevTools'], language: 'javascript' },
  // C
  c_intro: { title: 'Introduction to C', keyPoints: ['main() function', 'printf/scanf', '#include headers', 'compilation with gcc', 'Algorithm design'], language: 'c' },
  c_variables: { title: 'Data Types & Variables in C', keyPoints: ['int, float, double, char', 'const and #define', 'sizeof() operator', 'type casting', 'implicit vs explicit conversion'], language: 'c' },
  c_operators: { title: 'Operators in C', keyPoints: ['arithmetic operators', 'relational operators', 'logical operators &&, ||, !', 'bitwise operators', 'ternary operator'], language: 'c' },
  c_control_flow: { title: 'Control Structures in C', keyPoints: ['if-else branching', 'switch-case with break', 'nested conditions', 'goto statement', 'comma operator'], language: 'c' },
  c_loops: { title: 'Loops in C', keyPoints: ['for loop syntax', 'while loop', 'do-while loop', 'break and continue', 'nested loops'], language: 'c' },
  c_functions: { title: 'Functions in C', keyPoints: ['function declaration and definition', 'return types', 'pass by value', 'recursive functions', 'scope of variables'], language: 'c' },
  c_arrays: { title: 'Arrays in C', keyPoints: ['array declaration and initialization', 'index starts at 0', '2D arrays', 'array as function argument', 'string as char array'], language: 'c' },
  c_strings: { title: 'Strings in C', keyPoints: ['char array vs string literal', 'null terminator \\0', 'strcpy, strcat, strlen, strcmp', 'gets/fgets for input', 'sprintf and sscanf'], language: 'c' },
  c_structures: { title: 'Structures in C', keyPoints: ['struct keyword', 'accessing members with .', 'typedef for convenience', 'array of structures', 'nested structures'], language: 'c' },
  c_pointers: { title: 'Pointers in C', keyPoints: ['& address-of operator', '* dereference operator', 'pointer arithmetic', 'pointer to array', 'NULL pointer'], language: 'c' },
  c_files: { title: 'File Handling in C', keyPoints: ['FILE pointer', 'fopen modes r/w/a', 'fprintf and fscanf', 'fclose to close files', 'feof to detect end of file'], language: 'c' },
  cpp_oop_intro: { title: 'OOP Concepts in C++', keyPoints: ['class and object', 'encapsulation', 'inheritance', 'polymorphism', 'abstraction'], language: 'cpp' },
  cpp_basics: { title: 'C++ Basics', keyPoints: ['cin/cout vs scanf/printf', 'namespace std', 'bool data type', 'references vs pointers', 'function overloading'], language: 'cpp' },
  cpp_functions: { title: 'Functions in C++', keyPoints: ['function overloading', 'default arguments', 'inline functions', 'pass by reference', 'const parameters'], language: 'cpp' },
  cpp_classes: { title: 'Classes in C++', keyPoints: ['class definition', 'constructor and destructor', 'access specifiers public/private/protected', 'this pointer', 'static members'], language: 'cpp' },
  cpp_arrays_strings: { title: 'Arrays & Strings in C++', keyPoints: ['array declaration', 'std::string class', 'string methods: length, substr, find', 'vector as dynamic array', 'range-based for loop'], language: 'cpp' },
  cpp_templates: { title: 'Templates in C++', keyPoints: ['function templates', 'class templates', 'template parameters', 'STL containers use templates', 'template specialization'], language: 'cpp' },
  cpp_operator_overloading: { title: 'Operator Overloading in C++', keyPoints: ['operator keyword', 'overloading +, -, ==', 'friend functions', 'assignment operator overloading', 'stream operators << >>'], language: 'cpp' },
  cpp_inheritance: { title: 'Inheritance in C++', keyPoints: ['base and derived class', 'single and multiple inheritance', 'protected access', 'constructor chaining', 'method overriding'], language: 'cpp' },
  cpp_memory: { title: 'Memory Management in C++', keyPoints: ['new and delete operators', 'heap vs stack memory', 'memory leaks', 'smart pointers unique_ptr', 'RAII principle'], language: 'cpp' },
  cpp_virtual: { title: 'Virtual Functions in C++', keyPoints: ['virtual keyword', 'runtime polymorphism', 'vtable mechanism', 'pure virtual functions', 'abstract classes'], language: 'cpp' },
  cpp_streams: { title: 'Streams in C++', keyPoints: ['ifstream and ofstream', 'fstream for read/write', 'open, read, close', 'getline function', 'file modes ios::app'], language: 'cpp' },
  java_intro: { title: 'Introduction to Java', keyPoints: ['JVM and JDK', 'Write Once Run Anywhere', 'public static void main', 'System.out.println', 'javac to compile'], language: 'java' },
  java_datatypes: { title: 'Data Types & Arrays in Java', keyPoints: ['primitive types int float double char boolean', 'type casting', 'array declaration int[]', '2D arrays', 'String is an object'], language: 'java' },
  java_operators: { title: 'Operators in Java', keyPoints: ['integer division truncates', 'modulo % operator', 'pre vs post increment', 'logical && || !', 'ternary operator'], language: 'java' },
  java_control: { title: 'Control Statements in Java', keyPoints: ['if-else if-else', 'switch-case with break', 'for loop and enhanced for', 'while and do-while', 'break and continue'], language: 'java' },
  java_classes: { title: 'Methods & Classes in Java', keyPoints: ['class blueprint and object', 'constructor same name as class', 'this keyword', 'static vs instance members', 'encapsulation with getters/setters'], language: 'java' },
  java_interfaces: { title: 'Interfaces & Packages in Java', keyPoints: ['interface as contract', 'implements keyword', 'multiple interface implementation', 'package declaration', 'import statement'], language: 'java' },
  java_exceptions: { title: 'Exception Handling in Java', keyPoints: ['try-catch-finally', 'checked vs unchecked exceptions', 'throws keyword', 'throw to raise exception', 'custom Exception class'], language: 'java' },
  java_threads: { title: 'Multithreading in Java', keyPoints: ['Thread class and Runnable interface', 'start() vs run()', 'thread states', 'synchronized keyword', 'wait and notify'], language: 'java' },
  java_io: { title: 'I/O & String Handling in Java', keyPoints: ['Scanner for console input', 'String immutability', 'StringBuilder for mutable strings', 'String methods: substring, split, charAt', 'BufferedReader for file reading'], language: 'java' },
  java_collections: { title: 'Collections Framework in Java', keyPoints: ['List ArrayList LinkedList', 'Set HashSet TreeSet', 'Map HashMap TreeMap', 'Iterator and for-each', 'Collections.sort with Comparator'], language: 'java' },
  java_events: { title: 'Event Handling in Java', keyPoints: ['event source and listener', 'ActionListener interface', 'addActionListener method', 'anonymous inner classes', 'MouseListener and KeyListener'], language: 'java' },
  java_swing: { title: 'Swing GUI in Java', keyPoints: ['JFrame main window', 'JButton JLabel JTextField', 'FlowLayout BorderLayout GridLayout', 'JMenuBar and JMenu', 'setVisible and pack'], language: 'java' },
  html_structure: { title: 'HTML Structure', keyPoints: ['DOCTYPE and html tag', 'head and body elements', 'semantic tags: header nav main footer', 'headings h1-h6', 'links and images'], language: 'html' },
  css_selectors: { title: 'CSS Selectors', keyPoints: ['element class and id selectors', 'specificity rules', 'combinators: descendant child adjacent', 'pseudo-classes :hover :first-child', 'attribute selectors'], language: 'css' },
  css_flexbox: { title: 'CSS Flexbox', keyPoints: ['display: flex', 'flex-direction row/column', 'justify-content and align-items', 'flex-wrap for wrapping', 'flex-grow flex-shrink flex-basis'], language: 'css' },
  css_grid: { title: 'CSS Grid', keyPoints: ['display: grid', 'grid-template-columns and rows', 'gap property', 'grid-area naming', 'auto-fill and auto-fit'], language: 'css' },
  responsive_design: { title: 'Responsive Design', keyPoints: ['viewport meta tag', 'media queries @media', 'mobile-first approach', 'relative units rem em %', 'flexbox and grid for responsive layouts'], language: 'css' },
  numpy_basics: { title: 'NumPy Basics', keyPoints: ['ndarray creation', 'shape and dtype', 'array operations broadcasting', 'slicing and indexing', 'np.zeros np.ones np.arange'], language: 'python' },
  pandas_basics: { title: 'Pandas Basics', keyPoints: ['DataFrame and Series', 'read_csv and read_excel', 'loc and iloc for selection', 'groupby and aggregation', 'handling missing values'], language: 'python' },
  data_visualization: { title: 'Data Visualization', keyPoints: ['matplotlib pyplot', 'plt.plot for line chart', 'plt.bar for bar chart', 'plt.scatter for scatter plot', 'seaborn for statistical plots'], language: 'python' },
  data_cleaning: { title: 'Data Cleaning', keyPoints: ['detecting missing values isnull()', 'fillna and dropna', 'removing duplicates drop_duplicates()', 'data type conversion astype()', 'string cleaning str.strip() str.lower()'], language: 'python' },
  statistical_analysis: { title: 'Statistical Analysis', keyPoints: ['mean median mode', 'standard deviation and variance', 'correlation and covariance', 'scipy.stats for hypothesis testing', 'normal distribution and z-score'], language: 'python' },
}

function getConceptMeta(conceptId: string) {
  if (CONCEPT_META[conceptId]) return CONCEPT_META[conceptId]
  // Derive from conceptId as fallback
  const title = conceptId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const lang = conceptId.startsWith('js_') ? 'javascript'
    : conceptId.startsWith('c_') ? 'c'
    : conceptId.startsWith('cpp_') ? 'cpp'
    : conceptId.startsWith('java_') ? 'java'
    : conceptId.startsWith('html_') || conceptId.startsWith('css_') || conceptId === 'responsive_design' ? 'html'
    : 'python'
  return { title, keyPoints: [], language: lang }
}

function s2Key(id: string, userId: string) { return `cp_s2_${userId}_${id}` }
function questionCacheKey(id: string, userId: string) { return `cpq_${userId}_${id}` }

// Remove duplicate options (same text) that the AI sometimes generates
function dedupeOptions(q: AssessmentQuestion): AssessmentQuestion {
  if (!q.options || q.options.length === 0) return q
  const seen = new Set<string>()
  const deduped = q.options.filter(opt => {
    const key = opt.text.trim().toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  // Re-assign ids a, b, c, d in order so correctAnswer still matches
  const remap: Record<string, string> = {}
  const labels = ['a', 'b', 'c', 'd']
  const reindexed = deduped.map((opt, i) => {
    const newId = labels[i] ?? opt.id
    remap[opt.id] = newId
    return { ...opt, id: newId }
  })
  const remapAnswer = (ans: string | string[]): string | string[] => {
    if (Array.isArray(ans)) return ans.map(a => remap[a] ?? a)
    return remap[ans] ?? ans
  }
  return { ...q, options: reindexed, correctAnswer: remapAnswer(q.correctAnswer as string | string[]) as never }
}

function loadS2(conceptId: string, userId: string) {
  try {
    const raw = localStorage.getItem(s2Key(conceptId, userId))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveS2(conceptId: string, userId: string, data: object) {
  try { localStorage.setItem(s2Key(conceptId, userId), JSON.stringify(data)) } catch { /* quota */ }
}

export default function Stage2PageClient({ params }: { params: { conceptId: string } }) {
  const { user, profile, loading } = useAuth()

  const staticQuestions = useMemo(() => ASSESSMENT_QUESTIONS[params.conceptId] || [], [params.conceptId])
  const meta = useMemo(() => getConceptMeta(params.conceptId), [params.conceptId])

  const [questions, setQuestions] = useState<AssessmentQuestion[]>([])
  const [safeQuestions, setSafeQuestions] = useState<SafeQuestion[]>([])
  const [isGenerating, setIsGenerating] = useState(true)
  const [generateError, setGenerateError] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<UserAnswer[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [aiFeedback, setAIFeedback] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [hasRestoredState, setHasRestoredState] = useState(false)
  const [aiChatOpen, setAIChatOpen] = useState(false)
  const terminatedRef = useRef(false)

  useEffect(() => {
    if (loading) return
    if (!user) {
      setIsGenerating(staticQuestions.length === 0)
      setHasRestoredState(true)
      return
    }

    // If a complete static set (10+) exists, always use it -- AI questions can have wrong answers
    if (staticQuestions.length >= 10) {
      // Restore progress (currentIndex, answers) but force the question set to static
      const saved = loadS2(params.conceptId, user.uid)
      if (saved) {
        setCurrentIndex(saved.currentIndex ?? 0)
        setAnswers(saved.answers ?? [])
        setIsComplete(saved.isComplete ?? false)
        setAIFeedback(saved.aiFeedback ?? '')
      }
      setQuestions(staticQuestions)
      setIsGenerating(false)
      setHasRestoredState(true)
      return
    }

    const saved = loadS2(params.conceptId, user.uid)
    if (saved) {
      setCurrentIndex(saved.currentIndex ?? 0)
      setAnswers(saved.answers ?? [])
      setIsComplete(saved.isComplete ?? false)
      setAIFeedback(saved.aiFeedback ?? '')
      if (Array.isArray(saved.questionSet) && saved.questionSet.length > 0) {
        setQuestions(saved.questionSet as AssessmentQuestion[])
        setIsGenerating(false)
        setHasRestoredState(true)
        return
      }
    }

    const cacheKey = questionCacheKey(params.conceptId, user.uid)
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setQuestions(parsed as AssessmentQuestion[])
          setIsGenerating(false)
          setHasRestoredState(true)
          return
        }
      } catch { /* ignore */ }
    }

    setIsGenerating(true)
    setGenerateError('')

    aiService.generateQuestions(
      params.conceptId,
      meta.title,
      meta.keyPoints,
      meta.language,
      {
        id: user.uid,
        name: profile?.displayName || user.displayName || 'Student',
        variationSeed: `${user.uid}_${params.conceptId}`,
      },
    ).then((generated) => {
      if (generated.length > 0) {
        const cleaned = (generated as AssessmentQuestion[]).map(dedupeOptions)
        setQuestions(cleaned)
        sessionStorage.setItem(cacheKey, JSON.stringify(cleaned))
        return
      }

      if (staticQuestions.length > 0) {
        setQuestions(staticQuestions)
        return
      }

      setGenerateError('Could not generate questions. Make sure the backend is running.')
    }).finally(() => {
      setIsGenerating(false)
      setHasRestoredState(true)
    })
  }, [loading, meta.keyPoints, meta.language, meta.title, params.conceptId, profile?.displayName, staticQuestions, user])

  const currentQuestion = questions[currentIndex]
  const currentSafeQuestion = safeQuestions[currentIndex]
  const totalQuestions = questions.length

  // Must be declared before any early returns (React Rules of Hooks)
  // ProctoringOverlay handles the countdown + redirect; this just clears saved progress
  const handleViolationTerminate = useCallback(() => {
    if (terminatedRef.current) return
    terminatedRef.current = true
    // Do NOT clear saved progress -- student should resume from where they left off when they return
  }, [])

  const handleRetake = () => {
    if (user) {
      try { localStorage.removeItem(s2Key(params.conceptId, user.uid)) } catch { /* ignore */ }
      try { sessionStorage.removeItem(questionCacheKey(params.conceptId, user.uid)) } catch { /* ignore */ }
    }
    setAnswers([])
    setCurrentIndex(0)
    setIsComplete(false)
    setAIFeedback('')
    setGenerateError('')

    // Prefer static questions on retake too -- AI may produce wrong answers
    if (staticQuestions.length >= 10) {
      setQuestions(staticQuestions)
      setIsGenerating(false)
      return
    }

    setIsGenerating(true)
    aiService.generateQuestions(
      params.conceptId,
      meta.title,
      meta.keyPoints,
      meta.language,
      user ? { id: user.uid, name: profile?.displayName || user.displayName || 'Student', variationSeed: `${user.uid}_${params.conceptId}_retake_${Date.now()}` } : undefined,
    ).then((generated) => {
      if (generated.length > 0) {
        setQuestions((generated as AssessmentQuestion[]).map(dedupeOptions))
      } else if (staticQuestions.length > 0) {
        setQuestions(staticQuestions)
      } else {
        setGenerateError('Could not generate questions. Make sure the backend is running.')
      }
    }).finally(() => {
      setIsGenerating(false)
    })
  }

  // Persist quiz progress whenever state changes
  useEffect(() => {
    if (!hasRestoredState || !user) return
    saveS2(params.conceptId, user.uid, { currentIndex, answers, isComplete, aiFeedback, questionSet: questions })
  }, [answers, aiFeedback, currentIndex, hasRestoredState, isComplete, params.conceptId, questions, user])

  useEffect(() => {
    if (questions.length === 0) return
    if (currentIndex <= questions.length - 1) return
    setCurrentIndex(Math.max(0, questions.length - 1))
  }, [currentIndex, questions.length])

  // Tokenize questions whenever the question set changes -- strips correctAnswer from client state
  useEffect(() => {
    if (questions.length === 0) return
    tokenizeQuestions(questions).then(setSafeQuestions).catch(() => {
      // Fallback: show questions without correctAnswer (can't highlight on submit, but no answer leak)
      setSafeQuestions(questions.map(({ correctAnswer: _ca, ...rest }) => ({ ...rest, answerToken: '' })))
    })
  }, [questions])

  const [pendingAnswers, setPendingAnswers] = useState<UserAnswer[]>([])
  const isNavigatingRef = useRef(false)

  const handleAnswer = (answer: string | string[], isCorrect: boolean) => {
    const ua: UserAnswer = {
      questionId: currentQuestion.id,
      answer,
      isCorrect,
      timeSpent: 30,
    }
    // Replace any existing answer for this question (prevents duplicates on restore)
    const filtered = answers.filter((a) => a.questionId !== currentQuestion.id)
    const newAnswers = [...filtered, ua]
    setAnswers(newAnswers)
    setPendingAnswers(newAnswers)
  }

  const handleNext = async () => {
    if (isNavigatingRef.current) return
    isNavigatingRef.current = true
    const newAnswers = pendingAnswers.length > 0 ? pendingAnswers : answers
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1)
      // Reset after short delay so rapid clicks on different questions are still blocked
      setTimeout(() => { isNavigatingRef.current = false }, 400)
    } else {
      const score = newAnswers.filter((a) => a.isCorrect).length
      setIsSaving(true)
      try {
        const feedback = await aiService.generateAssessmentFeedback(score, totalQuestions, meta.title)
        setAIFeedback(feedback)
        if (user) {
          const assessmentStats = {
            conceptId: params.conceptId,
            score,
            totalQuestions,
            correctAnswers: score,
            wrongAnswers: totalQuestions - score,
            percentage: totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0,
            questionSet: questions,
            completedAt: new Date(),
          }
          await submitAssessment(user.uid, {
            uid: user.uid,
            conceptId: params.conceptId,
            score,
            totalQuestions,
            answers: newAnswers,
            xpEarned: score * 10,
            questionSet: questions,
            completedAt: new Date(),
          })
          await saveAssessmentStats(user.uid, params.conceptId, assessmentStats)
          await markStageComplete(user.uid, params.conceptId, 2, score * 10)
        }
      } catch { /* silent */ }
      finally {
        setIsSaving(false)
        setIsComplete(true)
        isNavigatingRef.current = false
      }
    }
  }

  // -- Generating state ------------------------------------------------------
  if (isGenerating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-5 p-8 max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-yellow-500 flex items-center justify-center mx-auto shadow-lg">
            <div className="w-8 h-8 rounded-full border-4 border-black/20 border-t-black animate-spin" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Generating Your Quiz</h2>
            <p className="text-gray-500 text-sm mt-1">Cody AI is crafting 15 questions just for <span className="font-semibold text-gray-700">{meta.title}</span>...</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-bounce [animation-delay:0ms]" />
            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-bounce [animation-delay:150ms]" />
            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-bounce [animation-delay:300ms]" />
          </div>
          <p className="text-xs text-gray-400">This takes about 30-60 seconds the first time</p>
        </div>
      </div>
    )
  }

  // -- Error / empty state ---------------------------------------------------
  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4 p-8 max-w-sm">
          <div className="text-4xl font-black text-yellow-400">!</div>
          <h2 className="text-xl font-bold text-gray-900">Quiz unavailable</h2>
          <p className="text-gray-500 text-sm">{generateError || 'Could not load or generate questions for this concept.'}</p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => { setIsGenerating(true); setGenerateError(''); window.location.reload() }}
              className="px-6 py-2.5 bg-yellow-500 text-black font-bold text-sm rounded-xl hover:bg-yellow-400 transition-colors"
            >
              Try Again
            </button>
            <Link href={`/concept/${params.conceptId}`} className="text-sm text-gray-500 hover:text-gray-700">
              Back to Concept
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // -- Main quiz UI ----------------------------------------------------------
  return (
    <ProctoringOverlay scopeLabel="Assessment" onTerminate={handleViolationTerminate}>
      <div className="h-full bg-gray-50 flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <Link href={`/concept/${params.conceptId}`} className="flex items-center gap-1 text-gray-400 hover:text-gray-700 transition-colors group shrink-0">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-x-0.5 transition-transform"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              <span className="text-xs font-medium hidden sm:inline">Back</span>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-yellow-600 bg-yellow-50 border border-yellow-200 px-2.5 py-0.5 rounded-full flex items-center gap-1"><FileText className="w-3 h-3" /> Stage 2 -- Assessment</span>
              </div>
              <h1 className="text-sm font-bold text-gray-900 mt-0.5">{meta.title}</h1>
            </div>
          </div>
          <div className="hidden sm:block">
            <StageProgress currentStage={2} completedStages={[1]} />
          </div>
          {!isComplete && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAIChatOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs font-bold rounded-full hover:bg-yellow-100 transition-colors"
              >
                <Bot className="w-3.5 h-3.5" /> Ask Cody
              </button>
              <div className="text-right">
                <p className="text-xs text-gray-400">No skipping</p>
                <p className="text-sm font-bold text-gray-900">{currentIndex + 1} / {totalQuestions}</p>
              </div>
            </div>
          )}
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 w-full">
          <AnimatePresence mode="wait">
            {isSaving ? (
              <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 space-y-4">
                <div className="w-12 h-12 rounded-full border-4 border-yellow-200 border-t-yellow-500 animate-spin mx-auto" />
                <p className="text-gray-600 font-medium">Calculating your results...</p>
              </motion.div>
            ) : isComplete ? (
              <motion.div key="summary" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <AssessmentSummary
                  score={answers.filter((a) => a.isCorrect).length}
                  totalQuestions={totalQuestions}
                  xpEarned={answers.filter((a) => a.isCorrect).length * 10}
                  conceptId={params.conceptId}
                  aiFeedback={aiFeedback}
                  onRetake={handleRetake}
                />
              </motion.div>
            ) : (
              <motion.div key={currentIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500 flex items-center justify-center shrink-0"><FileText className="w-5 h-5 text-black" /></div>
                  <div>
                    <p className="text-xs font-bold text-yellow-800 mb-0.5">Knowledge Assessment -- {totalQuestions} Questions</p>
                    <p className="text-xs text-yellow-700">
                      All questions are about <span className="font-semibold">{meta.title}</span> -- no skipping.
                      <button type="button" onClick={() => setAIChatOpen(true)} className="ml-2 underline text-yellow-800 font-semibold">Ask Cody AI for help</button>
                    </p>
                  </div>
                </div>
                {!(currentSafeQuestion ?? currentQuestion) ? null : <QuestionCard
                  question={currentSafeQuestion ?? currentQuestion}
                  questionNumber={currentIndex + 1}
                  totalQuestions={totalQuestions}
                  onCheckAnswer={async (answer) => {
                    const sq = safeQuestions[currentIndex]
                    if (sq?.answerToken) {
                      return serverCheckAnswer(sq.answerToken, answer, sq.id)
                    }
                    // Fallback: never reached if backend is up
                    return { correct: false }
                  }}
                  onAnswer={handleAnswer}
                  onNext={handleNext}
                  isLastQuestion={currentIndex === totalQuestions - 1}
                />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* AI Chat -- concept help only, never reveals answers */}
      <ExamAIChat
        conceptTitle={meta.title}
        conceptKeyPoints={meta.keyPoints}
        language={meta.language}
        currentQuestion={currentQuestion?.question}
        isOpen={aiChatOpen}
        onClose={() => setAIChatOpen(false)}
      />
    </ProctoringOverlay>
  )
}
