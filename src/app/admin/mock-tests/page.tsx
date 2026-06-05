'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart2, Timer, HelpCircle, Calendar, Lock, Zap, Users, Star, Clock, ClipboardList, Paperclip } from 'lucide-react'
import { collection, getDocs, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { getBackendUrl } from '@/lib/backendUrl'

// --- Types --------------------------------------------------------------------

interface MCQOption {
  id: string
  text: string
}

interface PlacementQuestion {
  id: string
  type: 'mcq' | 'coding'
  question: string
  year?: number
  company?: string
  sourceLabel?: string
  difficulty?: string
  topic?: string
  options?: MCQOption[]
  correctAnswer?: string
  explanation?: string
  marks: number
  inputFormat?: string
  outputFormat?: string
  examples?: Array<{ input: string; output: string }>
  constraints?: string
}

interface PlacementSection {
  name: string
  marks: number
  questions: PlacementQuestion[]
}

type StoredDate = string | number | Date | { seconds?: number; toDate?: () => Date; toMillis?: () => number } | null | undefined

interface PlacementTest {
  id: string
  title: string
  company?: string
  prompt: string
  totalMarks: number
  duration: number
  scheduledAt: string | null
  activeFrom?: string | null
  activeTo?: string | null
  createdAt: StoredDate
  status: 'generating' | 'ready' | 'active' | 'closed'
  sections: PlacementSection[]
  yearsIncluded?: number[]
  pdfQuestionsCount?: number
}

interface EvalQuestion {
  id: string
  question: string
  type: 'mcq' | 'coding'
  studentAnswer?: string | null
  correctAnswer?: string
  isCorrect?: boolean
  marks: number
  marksEarned: number
  explanation?: string
  feedback?: string
  correctApproach?: string
  studentCode?: string
}

interface EvalSection {
  name: string
  score: number
  maxScore: number
  questions: EvalQuestion[]
}

interface Evaluation {
  totalScore: number
  maxScore: number
  percentage: number
  grade: string
  passed: boolean
  sections: EvalSection[]
  aiSummary: string
}

interface Submission {
  uid: string
  testId: string
  studentName: string
  regNo?: string
  score: number
  totalMarks: number
  timeTaken: number
  submittedAt: { seconds?: number } | string | null
  status: string
  evaluation?: Evaluation
}

type TestTab = 'info' | 'questions' | 'results'

// --- Helpers ------------------------------------------------------------------

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

function submittedAt(sub: Submission): string {
  if (!sub.submittedAt) return '--'
  if (typeof sub.submittedAt === 'string') return new Date(sub.submittedAt).toLocaleString()
  if (typeof sub.submittedAt === 'object' && sub.submittedAt.seconds) {
    return new Date(sub.submittedAt.seconds * 1000).toLocaleString()
  }
  return '--'
}

function toMillis(value: StoredDate): number {
  if (!value) return 0
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'string' || typeof value === 'number') {
    const time = new Date(value).getTime()
    return Number.isNaN(time) ? 0 : time
  }
  if (typeof value.toMillis === 'function') return value.toMillis()
  if (typeof value.toDate === 'function') return value.toDate().getTime()
  if (typeof value.seconds === 'number') return value.seconds * 1000
  return 0
}

function difficultyBg(d?: string): string {
  if (d === 'Easy') return 'bg-green-100 text-green-700'
  if (d === 'Hard') return 'bg-red-100 text-red-700'
  return 'bg-yellow-100 text-yellow-700'
}

function statusCycle(current: PlacementTest['status']): PlacementTest['status'] {
  if (current === 'ready') return 'active'
  if (current === 'active') return 'closed'
  return 'ready'
}

function statusBg(s: string): string {
  if (s === 'active') return 'bg-green-100 text-green-700'
  if (s === 'ready') return 'bg-blue-100 text-blue-700'
  if (s === 'closed') return 'bg-gray-100 text-gray-500'
  return 'bg-yellow-100 text-yellow-700'
}

function questionSourceLabel(q: { company?: string; year?: number; sourceLabel?: string }): string {
  if (q.sourceLabel) return q.sourceLabel
  if (q.company && q.year) return `${q.company} ${q.year} Question`
  if (q.year) return `${q.year} Question`
  if (q.company) return `${q.company} Question`
  return ''
}

// --- Sub-components -----------------------------------------------------------

function QuestionViewer({ sections }: { sections: PlacementSection[] }) {
  const [openSection, setOpenSection] = useState<number | null>(0)
  const [openQuestion, setOpenQuestion] = useState<string | null>(null)

  return (
    <div className="space-y-3">
      {sections.map((sec, si) => (
        <div key={si} className="border border-gray-100 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setOpenSection(openSection === si ? null : si)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-gray-800">{sec.name}</span>
              <span className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-500">
                {sec.questions.length} questions
              </span>
              <span className="text-xs text-gray-400">{sec.marks} marks</span>
            </div>
            <span className="text-gray-400 text-xs">{openSection === si ? '^' : 'v'}</span>
          </button>

          <AnimatePresence>
            {openSection === si && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="divide-y divide-gray-50">
                  {sec.questions.map((q, qi) => (
                    <div key={qi} className="p-4">
                      <button
                        type="button"
                        onClick={() => setOpenQuestion(openQuestion === q.id ? null : q.id)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xs font-black text-gray-400 mt-0.5 w-6 shrink-0">
                            {qi + 1}.
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              {q.type === 'coding' ? (
                                <span className="text-xs font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">CODE</span>
                              ) : (
                                <span className="text-xs font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">MCQ</span>
                              )}
                              {q.difficulty && (
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${difficultyBg(q.difficulty)}`}>
                                  {q.difficulty}
                                </span>
                              )}
                              {questionSourceLabel(q) && (
                                <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">
                                  {questionSourceLabel(q)}
                                </span>
                              )}
                              {q.topic && <span className="text-xs text-gray-400">{q.topic}</span>}
                              <span className="text-xs font-bold text-gray-400 ml-auto">{q.marks}M</span>
                            </div>
                            <p className="text-sm text-gray-800 leading-relaxed line-clamp-2">{q.question}</p>
                          </div>
                          <span className="text-gray-300 text-xs shrink-0">{openQuestion === q.id ? '^' : 'v'}</span>
                        </div>
                      </button>

                      <AnimatePresence>
                        {openQuestion === q.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 ml-9 space-y-3">
                              {q.type === 'mcq' && q.options && (
                                <div className="space-y-1">
                                  {q.options.map(opt => (
                                    <div
                                      key={opt.id}
                                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                                        opt.id === q.correctAnswer
                                          ? 'bg-green-50 border border-green-200 font-bold text-green-800'
                                          : 'bg-gray-50 text-gray-600'
                                      }`}
                                    >
                                      <span className="font-bold">{opt.id.toUpperCase()}.</span>
                                      {opt.text}
                                      {opt.id === q.correctAnswer && (
                                        <span className="ml-auto text-xs font-black text-green-600">+ Correct</span>
                                      )}
                                    </div>
                                  ))}
                                  {q.explanation && (
                                    <div className="mt-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                                      <p className="text-xs font-bold text-blue-700 mb-0.5">Explanation</p>
                                      <p className="text-xs text-blue-800">{q.explanation}</p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {q.type === 'coding' && (
                                <div className="space-y-2">
                                  {q.inputFormat && (
                                    <p className="text-xs text-gray-500"><span className="font-bold">Input:</span> {q.inputFormat}</p>
                                  )}
                                  {q.outputFormat && (
                                    <p className="text-xs text-gray-500"><span className="font-bold">Output:</span> {q.outputFormat}</p>
                                  )}
                                  {q.examples?.map((ex, ei) => (
                                    <div key={ei} className="font-mono text-xs bg-gray-900 text-green-400 p-3 rounded-xl">
                                      <div><span className="text-gray-400">Input: </span>{ex.input}</div>
                                      <div><span className="text-gray-400">Output: </span>{ex.output}</div>
                                    </div>
                                  ))}
                                  {q.constraints && (
                                    <p className="text-xs text-gray-500"><span className="font-bold">Constraints:</span> {q.constraints}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}

function SubmissionsViewer({ submissions, test }: { submissions: Submission[]; test: PlacementTest }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const downloadCSV = () => {
    const sorted = [...submissions].sort((a, b) => b.score - a.score)
    const headers = [
      '#', 'Student Name', 'Registration No', 'Score', 'Total Marks', 'Percentage',
      'Grade', 'Result', 'Time Taken', 'Submitted At',
      ...test.sections.map(s => s.name),
    ]
    const rows = sorted.map((sub, i) => {
      const pct = sub.totalMarks > 0 ? ((sub.score / sub.totalMarks) * 100).toFixed(1) : '0'
      const passed = sub.evaluation?.passed ?? (sub.score / sub.totalMarks >= 0.5)
      const sectionScores = test.sections.map(sec => {
        const es = sub.evaluation?.sections.find(s => s.name === sec.name)
        return es ? `${es.score}/${es.maxScore}` : '-'
      })
      return [
        i + 1,
        sub.studentName || '-',
        sub.regNo || '-',
        sub.score,
        sub.totalMarks,
        `${pct}%`,
        sub.evaluation?.grade || '-',
        passed ? 'PASS' : 'FAIL',
        formatTime(sub.timeTaken || 0),
        submittedAt(sub),
        ...sectionScores,
      ]
    })

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob(['' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${test.title.replace(/\s+/g, '_')}_results.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No submissions yet for this test.
      </div>
    )
  }

  const sorted = [...submissions].sort((a, b) => b.score - a.score)
  const avgScore = Math.round(submissions.reduce((a, s) => a + s.score, 0) / submissions.length)
  const passCount = submissions.filter(s => s.evaluation?.passed ?? (s.score / s.totalMarks >= 0.5)).length

  return (
    <div className="space-y-4">
      {/* Download button */}
      <button
        type="button"
        onClick={downloadCSV}
        className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors"
      >
        v Download Results as Excel (.csv)
      </button>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <div className="text-lg font-black text-gray-900">{submissions.length}</div>
          <div className="text-xs text-gray-400">Submissions</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <div className="text-lg font-black text-gray-900">{avgScore}/{test.totalMarks}</div>
          <div className="text-xs text-gray-400">Avg Score</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <div className={`text-lg font-black ${passCount === submissions.length ? 'text-green-600' : passCount === 0 ? 'text-red-500' : 'text-orange-500'}`}>
            {passCount}/{submissions.length}
          </div>
          <div className="text-xs text-gray-400">Passed</div>
        </div>
      </div>

      {/* Table */}
      <div className="border border-gray-100 rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[2rem_1fr_1fr_5rem_4rem_4rem_3rem] gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wide">
          <div>#</div>
          <div>Student</div>
          <div>Reg No</div>
          <div>Score</div>
          <div>%</div>
          <div>Result</div>
          <div />
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-50">
          {sorted.map((sub, i) => {
            const pct = sub.totalMarks > 0 ? ((sub.score / sub.totalMarks) * 100).toFixed(1) : '0'
            const passed = sub.evaluation?.passed ?? (sub.score / sub.totalMarks >= 0.5)
            const grade = sub.evaluation?.grade || '?'
            const isOpen = expanded === sub.uid

            return (
              <div key={sub.uid}>
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : sub.uid)}
                  className="w-full grid grid-cols-[2rem_1fr_1fr_5rem_4rem_4rem_3rem] gap-2 px-4 py-3 hover:bg-gray-50 transition-colors text-left items-center"
                >
                  <div className="text-xs text-gray-400 font-bold">{i + 1}</div>
                  <div>
                    <p className="text-sm font-bold text-gray-800 truncate">{sub.studentName || '--'}</p>
                    <p className="text-xs text-gray-400">{submittedAt(sub)}</p>
                  </div>
                  <div className="text-xs text-gray-600 font-medium">{sub.regNo || '--'}</div>
                  <div>
                    <span className={`text-sm font-black ${passed ? 'text-green-600' : 'text-red-500'}`}>
                      {sub.score}/{sub.totalMarks}
                    </span>
                    <p className="text-xs text-gray-400">Grade {grade} . {formatTime(sub.timeTaken || 0)}</p>
                  </div>
                  <div className="text-sm font-bold text-gray-600">{pct}%</div>
                  <div>
                    <span className={`text-xs font-black px-2 py-1 rounded-lg ${passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {passed ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-300 text-right">{isOpen ? '^' : 'v'}</div>
                </button>

                {/* Expanded: section breakdown */}
                <AnimatePresence>
                  {isOpen && sub.evaluation && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 space-y-3 bg-gray-50/50 border-t border-gray-100">
                        {/* Section scores */}
                        <div className="grid grid-cols-3 gap-2">
                          {sub.evaluation.sections.map((sec, si) => (
                            <div key={si} className="bg-white border border-gray-100 rounded-xl p-2.5 text-center">
                              <div className="text-sm font-black text-gray-800">{sec.score}/{sec.maxScore}</div>
                              <div className="text-xs text-gray-400 truncate">{sec.name}</div>
                            </div>
                          ))}
                        </div>

                        {sub.evaluation.aiSummary && (
                          <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3">
                            <p className="text-xs font-bold text-yellow-700 mb-1">AI Summary</p>
                            <p className="text-xs text-gray-700 italic">{sub.evaluation.aiSummary}</p>
                          </div>
                        )}

                        {/* Per-question breakdown */}
                        {sub.evaluation.sections.map((sec, si) => (
                          <div key={si}>
                            <p className="text-xs font-bold text-gray-500 uppercase mb-1.5">{sec.name}</p>
                            <div className="space-y-1">
                              {sec.questions.map((eq, qi) => (
                                <div key={qi} className="flex items-start gap-2 text-xs bg-white border border-gray-100 rounded-lg px-3 py-2">
                                  <span className={`mt-0.5 w-4 h-4 shrink-0 rounded-full flex items-center justify-center font-black ${eq.type === 'coding' ? (eq.marksEarned > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600') : (eq.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600')}`}>
                                    {eq.type === 'coding' ? (eq.marksEarned > 0 ? '~' : 'x') : (eq.isCorrect ? '+' : 'x')}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-gray-700 leading-snug">{eq.question}</p>
                                    {eq.type === 'mcq' && (
                                      <div className="mt-0.5 flex gap-3 text-xs">
                                        {eq.studentAnswer
                                          ? <span className={eq.isCorrect ? 'text-green-600 font-medium' : 'text-red-500'}>Your: {eq.studentAnswer.toUpperCase()}</span>
                                          : <span className="text-gray-400 italic">Not answered</span>
                                        }
                                        {!eq.isCorrect && eq.correctAnswer && (
                                          <span className="text-green-600 font-medium">Correct: {eq.correctAnswer.toUpperCase()}</span>
                                        )}
                                      </div>
                                    )}
                                    {eq.type === 'coding' && (
                                      <div className="mt-1 space-y-1">
                                        {eq.studentCode && (
                                          <pre className="bg-gray-900 text-green-400 text-xs p-2 rounded-lg overflow-x-auto max-h-32 leading-relaxed">{eq.studentCode}</pre>
                                        )}
                                        {eq.feedback && <p className="text-orange-600 italic">{eq.feedback}</p>}
                                        {eq.correctApproach && <p className="text-green-700">Approach: {eq.correctApproach}</p>}
                                      </div>
                                    )}
                                  </div>
                                  <span className="shrink-0 font-black text-gray-600">{eq.marksEarned}/{eq.marks}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// --- Main Page ----------------------------------------------------------------

export default function AdminMockTestsPage() {
  const [tests, setTests] = useState<PlacementTest[]>([])
  const [submissions, setSubmissions] = useState<Record<string, Submission[]>>({})
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedTest, setSelectedTest] = useState<PlacementTest | null>(null)
  const [activeTab, setActiveTab] = useState<TestTab>('info')
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [totalMarks, setTotalMarks] = useState(100)
  const [duration, setDuration] = useState(180)
  const [scheduledAt, setScheduledAt] = useState('')
  const [activeFrom, setActiveFrom] = useState('')
  const [activeTo, setActiveTo] = useState('')
  const [subjects, setSubjects] = useState(['aptitude', 'verbal', 'coding'])
  const [companyName, setCompanyName] = useState('TCS')
  const [generateError, setGenerateError] = useState('')
  const [generateNotice, setGenerateNotice] = useState('')
  const [sectionConfig, setSectionConfig] = useState<Record<string, { questions: number; marksPerQ: number }>>({
    aptitude: { questions: 25, marksPerQ: 2 },
    verbal: { questions: 12, marksPerQ: 1 },
    coding: { questions: 3, marksPerQ: 15 },
    logical: { questions: 10, marksPerQ: 2 },
    technical: { questions: 10, marksPerQ: 2 },
  })
  const requestedQuestionCount = subjects.reduce((sum, subject) => sum + (sectionConfig[subject]?.questions || 0), 0)

  // PDF upload state
  const [pdfFiles, setPdfFiles] = useState<File[]>([])
  const [pdfParsing, setPdfParsing] = useState(false)
  const [pdfParsedCount, setPdfParsedCount] = useState<number | null>(null)

  // -- Fetch data -------------------------------------------------------------

  useEffect(() => {
    async function fetchData() {
      try {
        const [testsSnap, subsSnap] = await Promise.all([
          getDocs(collection(db, 'placementTests')),
          getDocs(collection(db, 'placementSubmissions')),
        ])

        const t: PlacementTest[] = []
        testsSnap.forEach(d => t.push({ id: d.id, ...d.data() } as PlacementTest))
        t.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
        setTests(t)

        const subMap: Record<string, Submission[]> = {}
        subsSnap.forEach(d => {
          const data = d.data() as Submission
          if (!subMap[data.testId]) subMap[data.testId] = []
          subMap[data.testId].push(data)
        })
        setSubmissions(subMap)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // -- Generate test ----------------------------------------------------------

  const handleGenerate = async () => {
    if (!title.trim()) return
    setGenerating(true)
    setGenerateError('')
    setGenerateNotice('')
    setPdfParsedCount(null)

    // Build the prompt automatically from company + subjects -- no admin input needed
    const autoPrompt = `${companyName} placement mock test: ${title}. Subjects: ${subjects.join(', ')}.`

    try {
      // Step 1: Parse PDF questions if any files are uploaded
      let pdfQuestions: PlacementQuestion[] = []
      if (pdfFiles.length > 0) {
        setPdfParsing(true)
        try {
          const formData = new FormData()
          pdfFiles.forEach(f => formData.append('pdfs', f))
          formData.append('companyName', companyName)
          const pdfRes = await fetch(`${getBackendUrl()}/api/admin/parse-pdf-questions`, {
            method: 'POST',
            headers: { 'X-Admin-Code': 'admin1115' },
            body: formData,
          })
          const pdfData = await pdfRes.json().catch(() => ({}))
          if (pdfRes.ok && pdfData.success) {
            pdfQuestions = pdfData.questions || []
            setPdfParsedCount(pdfQuestions.length)
          } else {
            setGenerateNotice(`PDF parsing skipped: ${pdfData.error || 'unknown error'}`)
          }
        } catch (pdfErr) {
          setGenerateNotice('PDF parsing failed -- generating without PDF questions.')
        } finally {
          setPdfParsing(false)
        }
      }

      // Step 2: Generate test with Grok (+ merge PDF questions server-side)
      const res = await fetch(`${getBackendUrl()}/api/admin/generate-placement-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Code': 'admin1115' },
        body: JSON.stringify({
          prompt: autoPrompt,
          title,
          totalMarks,
          duration,
          subjects,
          scheduledAt: scheduledAt || null,
          activeFrom: activeFrom || null,
          activeTo: activeTo || null,
          companyName,
          sectionConfig,
          pdfQuestions,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        const suffix = data.code === 'AI_QUEUE_BUSY'
          ? ' Tip: wait for current AI jobs to finish, or lower the question counts before retrying.'
          : ''
        throw new Error(`${data.error || `Generation failed (${res.status})`}${suffix}`)
      }
      if (data.warning) setGenerateNotice(data.warning)

      const newTest: PlacementTest = {
        ...data.test,
        prompt: autoPrompt,
        status: 'ready',
        activeFrom: activeFrom || null,
        activeTo: activeTo || null,
        createdAt: new Date().toISOString(),
      }

      await setDoc(doc(db, 'placementTests', newTest.id), {
        ...newTest,
        createdAt: serverTimestamp(),
      })

      setTests(prev => [newTest, ...prev])
      setTitle('')
      setScheduledAt('')
      setActiveFrom('')
      setActiveTo('')
      setCompanyName('TCS')
      setPdfFiles([])
      setPdfParsedCount(null)
      setSectionConfig({
        aptitude: { questions: 25, marksPerQ: 2 },
        verbal: { questions: 12, marksPerQ: 1 },
        coding: { questions: 3, marksPerQ: 15 },
        logical: { questions: 10, marksPerQ: 2 },
        technical: { questions: 10, marksPerQ: 2 },
      })
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Failed to generate test')
    } finally {
      setGenerating(false)
    }
  }

  // -- Status toggle ----------------------------------------------------------

  const handleStatusToggle = async (test: PlacementTest) => {
    const nextStatus = statusCycle(test.status)
    setStatusUpdating(test.id)
    try {
      await updateDoc(doc(db, 'placementTests', test.id), { status: nextStatus })
      setTests(prev => prev.map(t => t.id === test.id ? { ...t, status: nextStatus } : t))
      if (selectedTest?.id === test.id) {
        setSelectedTest(prev => prev ? { ...prev, status: nextStatus } : prev)
      }
    } catch {
      // non-critical
    } finally {
      setStatusUpdating(null)
    }
  }

  // -- Select test ------------------------------------------------------------

  const handleSelectTest = (test: PlacementTest) => {
    if (selectedTest?.id === test.id) {
      setSelectedTest(null)
    } else {
      setSelectedTest(test)
      setActiveTab('info')
    }
  }

  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Placement Mock Tests</h1>
        <p className="text-sm text-gray-500 mt-1">Create AI-generated placement tests with previous-year questions and schedule them for students.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* -- Left: Create form --------------------------------------------- */}
        <div className="lg:col-span-1 bg-white border border-gray-100 rounded-2xl p-5 space-y-4 h-fit sticky top-6">
          <h2 className="text-base font-bold text-gray-900">Create New Test</h2>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Company</label>
            <div className="flex flex-wrap gap-2">
              {['TCS', 'Infosys', 'Wipro', 'Cognizant', 'HCL', 'Amazon', 'Accenture'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCompanyName(c)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${companyName === c ? 'bg-yellow-400 border-yellow-400 text-black' : 'border-gray-200 text-gray-500 hover:border-yellow-300'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Test Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={`e.g. ${companyName} Mock Test 1`}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Total Marks</label>
              <input
                type="number"
                value={totalMarks}
                onChange={e => setTotalMarks(Number(e.target.value))}
                min={50}
                max={200}
                title="Total marks for the test"
                placeholder="100"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Duration (min)</label>
              <input
                type="number"
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                min={30}
                max={360}
                title="Test duration in minutes"
                placeholder="180"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Subjects</label>
            <div className="flex flex-wrap gap-2">
              {['aptitude', 'coding', 'verbal', 'logical', 'technical'].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${subjects.includes(s) ? 'bg-yellow-400 border-yellow-400 text-black' : 'border-gray-200 text-gray-500 hover:border-yellow-300'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {subjects.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Question Configuration</label>
              <div className="space-y-2">
                {subjects.map(subject => (
                  <div key={subject} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                    <p className="text-xs font-bold text-gray-700 capitalize mb-2">{subject}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Questions</p>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          title={`Number of questions for ${subject}`}
                          value={sectionConfig[subject]?.questions ?? 10}
                          onChange={e => setSectionConfig(prev => ({
                            ...prev,
                            [subject]: { ...(prev[subject] || { questions: 10, marksPerQ: 2 }), questions: Number(e.target.value) }
                          }))}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Marks/Q</p>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          title={`Marks per question for ${subject}`}
                          value={sectionConfig[subject]?.marksPerQ ?? 2}
                          onChange={e => setSectionConfig(prev => ({
                            ...prev,
                            [subject]: { ...(prev[subject] || { questions: 10, marksPerQ: 2 }), marksPerQ: Number(e.target.value) }
                          }))}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 text-right font-medium">
                      = {(sectionConfig[subject]?.questions ?? 10) * (sectionConfig[subject]?.marksPerQ ?? 2)} marks
                    </p>
                  </div>
                ))}
                <p className="text-xs font-bold text-gray-700 text-right">
                  Total: {subjects.reduce((sum, s) => sum + (sectionConfig[s]?.questions ?? 10) * (sectionConfig[s]?.marksPerQ ?? 2), 0)} marks
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Schedule (optional)</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              title="Schedule test date and time"
              placeholder="Schedule date and time"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Active Window (optional)</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-gray-400 mb-1">From</p>
                <input
                  type="datetime-local"
                  value={activeFrom}
                  onChange={e => setActiveFrom(e.target.value)}
                  title="Active from date and time"
                  placeholder="Active from"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">To</p>
                <input
                  type="datetime-local"
                  value={activeTo}
                  onChange={e => setActiveTo(e.target.value)}
                  title="Active to date and time"
                  placeholder="Active to"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">Students can only access the test within this window.</p>
          </div>

          {/* PDF Upload */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">PDF Questions (optional)</label>
            <div className="relative">
              <label
                htmlFor="pdf-upload"
                className={`flex flex-col items-center justify-center gap-2 w-full border-2 border-dashed rounded-xl py-4 px-3 cursor-pointer transition-colors ${
                  pdfFiles.length > 0 ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 hover:border-yellow-300 bg-gray-50'
                }`}
              >
                {pdfFiles.length > 0 ? (
                  <>
                    <ClipboardList className="w-5 h-5 text-yellow-600" />
                    <span className="text-xs font-bold text-yellow-700">{pdfFiles.length} PDF{pdfFiles.length > 1 ? 's' : ''} selected</span>
                    <span className="text-xs text-gray-400">{pdfFiles.map(f => f.name).join(', ')}</span>
                    {pdfParsedCount !== null && (
                      <span className="text-xs font-bold text-green-600">{pdfParsedCount} questions extracted</span>
                    )}
                  </>
                ) : (
                  <>
                    <Paperclip className="w-5 h-5 text-gray-400" />
                    <span className="text-xs font-bold text-gray-500">Click to upload PDF(s)</span>
                    <span className="text-xs text-gray-400">Up to 5 files . 10 MB each</span>
                  </>
                )}
                <input
                  id="pdf-upload"
                  type="file"
                  accept="application/pdf"
                  multiple
                  className="hidden"
                  onChange={e => {
                    const files = Array.from(e.target.files || []).slice(0, 5)
                    setPdfFiles(files)
                    setPdfParsedCount(null)
                  }}
                />
              </label>
              {pdfFiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setPdfFiles([]); setPdfParsedCount(null) }}
                  className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-100 text-red-500 text-xs flex items-center justify-center hover:bg-red-200 transition-colors"
                  title="Remove PDFs"
                >
                  x
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Questions extracted from PDFs will be added to the AI-generated questions.
            </p>
          </div>

          {generateError && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{generateError}</p>
          )}
          {generateNotice && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 px-3 py-2 rounded-lg">{generateNotice}</p>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !title.trim() || subjects.length === 0}
            className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black font-black text-sm rounded-xl transition-colors"
          >
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                {pdfParsing ? 'Reading PDFs...' : `Generating ${requestedQuestionCount} questions...`}
              </span>
            ) : <span className="flex items-center justify-center gap-2"><Zap className="w-4 h-4" /> Generate &amp; Save Test</span>}
          </button>

          {generating && (
            <p className="text-xs text-gray-400 text-center">
              {pdfFiles.length > 0
                ? `Using Grok AI + ${pdfFiles.length} PDF${pdfFiles.length > 1 ? 's' : ''}`
                : 'Using Grok AI . previous-year style labels are added for students'
              }
            </p>
          )}
        </div>

        {/* -- Right: Tests list ---------------------------------------------- */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">
              Tests ({tests.length})
            </h2>
            <p className="text-xs text-gray-400">Click a test to expand details</p>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm py-8">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-yellow-400 rounded-full animate-spin" />
              Loading tests...
            </div>
          ) : tests.length === 0 ? (
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 text-center text-gray-400 text-sm">
              No placement tests created yet. Use the form to generate one.
            </div>
          ) : (
            <div className="space-y-3">
              {tests.map(test => {
                const testSubs = submissions[test.id] || []
                const avgScore = testSubs.length > 0
                  ? Math.round(testSubs.reduce((a, r) => a + r.score, 0) / testSubs.length)
                  : null
                const totalQ = test.sections?.reduce((a, s) => a + (s.questions?.length || 0), 0) || 0
                const isOpen = selectedTest?.id === test.id

                return (
                  <div
                    key={test.id}
                    className={`bg-white border rounded-2xl overflow-hidden transition-all ${isOpen ? 'border-yellow-400 shadow-md' : 'border-gray-100 hover:border-yellow-200'}`}
                  >
                    {/* Test header row */}
                    <button
                      type="button"
                      onClick={() => handleSelectTest(test)}
                      className="w-full px-5 py-4 flex items-start justify-between gap-4 text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900 text-sm">{test.title}</h3>
                          {test.company && (
                            <span className="text-xs font-bold bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                              {test.company}
                            </span>
                          )}
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusBg(test.status)}`}>
                            {test.status}
                          </span>
                        </div>
                        {test.company && (
                          <p className="text-xs text-gray-400 mb-2">
                            {test.company} placement test . {test.sections?.reduce((a, s) => a + (s.questions?.length || 0), 0) || 0} questions
                            {test.pdfQuestionsCount ? ` (${test.pdfQuestionsCount} from PDF)` : ''}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><BarChart2 className="w-3 h-3" /> {test.totalMarks} marks</span>
                          <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> {test.duration} min</span>
                          <span className="flex items-center gap-1"><HelpCircle className="w-3 h-3" /> {totalQ} questions</span>
                          {test.scheduledAt && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(test.scheduledAt).toLocaleDateString()}</span>}
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {testSubs.length} attempts</span>
                          {avgScore !== null && <span className="flex items-center gap-1"><Star className="w-3 h-3" /> Avg: {avgScore}/{test.totalMarks}</span>}
                          {test.activeFrom && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> From: {new Date(test.activeFrom).toLocaleString()}</span>}
                          {test.activeTo && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> To: {new Date(test.activeTo).toLocaleString()}</span>}
                        </div>
                      </div>
                      <span className="text-gray-300 text-sm shrink-0 mt-1">{isOpen ? '^' : 'v'}</span>
                    </button>

                    {/* Expanded panel */}
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-gray-100"
                        >
                          {/* Tabs + status action */}
                          <div className="flex items-center justify-between px-5 pt-3 pb-0">
                            <div className="flex gap-1">
                              {(['info', 'questions', 'results'] as TestTab[]).map(tab => (
                                <button
                                  key={tab}
                                  type="button"
                                  onClick={() => setActiveTab(tab)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${activeTab === tab ? 'bg-yellow-400 text-black' : 'text-gray-500 hover:bg-gray-100'}`}
                                >
                                  {tab === 'results' ? `Results (${testSubs.length})` : tab}
                                </button>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); handleStatusToggle(test) }}
                              disabled={statusUpdating === test.id}
                              className="text-xs font-bold px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                              {statusUpdating === test.id ? (
                                <span className="flex items-center gap-1">
                                  <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                                  Updating...
                                </span>
                              ) : (
                                `-> ${statusCycle(test.status)}`
                              )}
                            </button>
                          </div>

                          <div className="p-5">
                            {/* Tab: Info */}
                            {activeTab === 'info' && (
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-xs text-gray-400 mb-0.5">Total Marks</p>
                                    <p className="font-black text-gray-900">{test.totalMarks}</p>
                                  </div>
                                  <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-xs text-gray-400 mb-0.5">Duration</p>
                                    <p className="font-black text-gray-900">{test.duration} min</p>
                                  </div>
                                  <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-xs text-gray-400 mb-0.5">Questions</p>
                                    <p className="font-black text-gray-900">{totalQ}</p>
                                  </div>
                                  <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-xs text-gray-400 mb-0.5">Submissions</p>
                                    <p className="font-black text-gray-900">{testSubs.length}</p>
                                  </div>
                                  {test.pdfQuestionsCount ? (
                                    <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3 col-span-2">
                                      <p className="text-xs text-yellow-700 mb-0.5">PDF Questions Included</p>
                                      <p className="font-black text-yellow-900">{test.pdfQuestionsCount}</p>
                                    </div>
                                  ) : null}
                                </div>

                                {test.sections && (
                                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Sections</p>
                                    </div>
                                    {test.sections.map(sec => (
                                      <div key={sec.name} className="flex justify-between items-center px-4 py-2.5 border-b border-gray-50 last:border-0">
                                        <span className="text-sm text-gray-700 font-medium">{sec.name}</span>
                                        <div className="flex items-center gap-3 text-xs text-gray-400">
                                          <span>{sec.questions?.length || 0} questions</span>
                                          <span className="font-bold text-gray-600">{sec.marks} marks</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {test.scheduledAt && (
                                  <p className="text-xs text-gray-500">
                                    Scheduled: {new Date(test.scheduledAt).toLocaleString()}
                                  </p>
                                )}
                                {(test.activeFrom || test.activeTo) && (
                                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                                    <p className="text-xs font-bold text-blue-700 mb-1">Active Window</p>
                                    <div className="flex flex-col gap-0.5 text-xs text-blue-800">
                                      {test.activeFrom && <span>From: {new Date(test.activeFrom).toLocaleString()}</span>}
                                      {test.activeTo && <span>To: {new Date(test.activeTo).toLocaleString()}</span>}
                                    </div>
                                  </div>
                                )}
                                {test.yearsIncluded && (
                                  <p className="text-xs text-gray-400">
                                    Years: {test.yearsIncluded.join(', ')}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Tab: Questions */}
                            {activeTab === 'questions' && test.sections && (
                              <QuestionViewer sections={test.sections} />
                            )}

                            {/* Tab: Results */}
                            {activeTab === 'results' && (
                              <SubmissionsViewer submissions={testSubs} test={test} />
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
