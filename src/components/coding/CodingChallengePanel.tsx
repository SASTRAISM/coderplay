'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { getBackendUrl } from '@/lib/backendUrl'
import { cn } from '@/lib/utils'
import type { CodingChallenge } from '@/types'

function getBlankStarter(language: string): string {
  const lang = language.toLowerCase()
  if (lang === 'python') return '# Write your code here\n'
  if (lang === 'java') return '// Write your code here\n'
  return '// Write your code here\n'
}

const LANG_DISPLAY: Record<string, string> = {
  python: 'Python 3.10', javascript: 'JavaScript', java: 'Java',
  c: 'C', cpp: 'C++', html: 'HTML', css: 'CSS',
}

interface ExecResult {
  input?: string
  expected?: string
  actual?: string
  stdout?: string
  stderr?: string
  exitCode?: number
  timedOut?: boolean
  passed?: boolean
}

interface CodingChallengePanelProps {
  challenge: CodingChallenge
  language?: string
  onSubmit?: (code: string, passed: number, total: number) => void
  onCodeChange?: (code: string) => void
  onNext?: () => void
  nextLabel?: string
  nextDisabled?: boolean
  initialCode?: string
  storageScope?: string
  answerUnlocked?: boolean
  secondsUntilAnswer?: number
  referenceSolution?: string | null
}

type ProblemTab = 'problem' | 'examples' | 'hints'
type ConsoleTab = 'testcases' | 'output' | 'results'

export const getCodingCodeStorageKey = (challengeId: string, scope: string) => `cp_code_${scope}_${challengeId}`

function sanitizeInitialCode(challenge: CodingChallenge, candidate: string | null | undefined, language = 'python'): string {
  const isAIChallenge = challenge.id.startsWith('ai_')
  const blankStarter = getBlankStarter(language)

  // AI challenges always start blank -- never show generated starter (it's the answer)
  if (isAIChallenge) {
    const value = candidate && candidate !== challenge.starterCode ? candidate : blankStarter
    return value
  }

  // Static challenges: use saved code only if it differs from the starterCode
  // (i.e. the student has actually edited it). If localStorage still has the
  // old complete-solution starter, fall back to the current starterCode.
  const value = candidate || challenge.starterCode
  // If what's saved is identical to the current starterCode, just use starterCode
  // (handles the case where starterCode was updated to add TODOs)
  return value
}

// Simple inline math renderer: replaces $...$ and $$...$$ with styled spans
function renderMath(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  // Split on $$...$$ first (block math), then $...$ (inline math)
  const blockRe = /\$\$([^$]+)\$\$/g
  const inlineRe = /\$([^$\n]+)\$/g

  let processed = text
  let key = 0

  // Replace $$ block math
  const segments: { text: string; type: 'text' | 'block' | 'inline' }[] = []
  let last = 0
  let m: RegExpExecArray | null
  blockRe.lastIndex = 0
  while ((m = blockRe.exec(text)) !== null) {
    if (m.index > last) segments.push({ text: text.slice(last, m.index), type: 'text' })
    segments.push({ text: m[1], type: 'block' })
    last = m.index + m[0].length
  }
  if (last < text.length) segments.push({ text: text.slice(last), type: 'text' })

  // Now process inline math inside text segments
  const final: { text: string; type: 'text' | 'block' | 'inline' }[] = []
  for (const seg of segments) {
    if (seg.type !== 'text') { final.push(seg); continue }
    let last2 = 0
    inlineRe.lastIndex = 0
    while ((m = inlineRe.exec(seg.text)) !== null) {
      if (m.index > last2) final.push({ text: seg.text.slice(last2, m.index), type: 'text' })
      final.push({ text: m[1], type: 'inline' })
      last2 = m.index + m[0].length
    }
    if (last2 < seg.text.length) final.push({ text: seg.text.slice(last2), type: 'text' })
  }

  return final.map((seg, i) => {
    if (seg.type === 'block') {
      return (
        <span key={i} className="block text-center font-mono text-sm text-blue-300 bg-gray-800/60 rounded px-3 py-1.5 my-1.5 border border-gray-700/50">
          {seg.text.trim()}
        </span>
      )
    }
    if (seg.type === 'inline') {
      return (
        <span key={i} className="font-mono text-blue-300 bg-gray-800/60 px-1 py-0.5 rounded text-xs border border-gray-700/40">
          {seg.text}
        </span>
      )
    }
    return <span key={i}>{seg.text}</span>
  })
}

// Render problem statement with math, bullet points, and line breaks
function ProblemRenderer({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div className="space-y-1.5 text-sm text-gray-300 leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={i} className="h-2" />
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={i} className="flex gap-2 items-start pl-2">
              <span className="text-yellow-400 mt-0.5 shrink-0">-</span>
              <span>{renderMath(trimmed.slice(2))}</span>
            </div>
          )
        }
        return <p key={i}>{renderMath(line)}</p>
      })}
    </div>
  )
}

export function CodingChallengePanel({
  challenge,
  language = 'python',
  onSubmit,
  onCodeChange,
  onNext,
  nextLabel = 'Next',
  nextDisabled = false,
  initialCode,
  storageScope = 'student',
  answerUnlocked = false,
  secondsUntilAnswer = 0,
  referenceSolution = null,
}: CodingChallengePanelProps) {
  // --- ALL useState/useRef declarations first (React Rules of Hooks) ---
  const [code, setCode] = useState(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem(getCodingCodeStorageKey(challenge.id, storageScope)) : null
      return sanitizeInitialCode(challenge, initialCode || saved, language)
    } catch {
      return sanitizeInitialCode(challenge, initialCode, language)
    }
  })
  const [problemTab, setProblemTab] = useState<ProblemTab>('problem')
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>('testcases')
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [runOutput, setRunOutput] = useState<ExecResult | null>(null)
  const [testResults, setTestResults] = useState<ExecResult[] | null>(null)
  const [submitSummary, setSubmitSummary] = useState<{ passed: number; total: number } | null>(null)
  const [compileError, setCompileError] = useState('')
  const [customInput, setCustomInput] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [consoleHeight, setConsoleHeight] = useState(220)
  const [activeLine, setActiveLine] = useState(1)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const onCodeChangeRef = useRef(onCodeChange)
  const isDraggingRef = useRef(false)
  const dragStartYRef = useRef(0)
  const dragStartHeightRef = useRef(220)

  // --- useEffect calls after all state declarations ---
  useEffect(() => {
    try {
      const saved = localStorage.getItem(getCodingCodeStorageKey(challenge.id, storageScope))
      setCode(sanitizeInitialCode(challenge, saved, language))
    } catch {
      setCode(getBlankStarter(language))
    }
    setTestResults(null)
    setSubmitSummary(null)
    setRunOutput(null)
    setCompileError('')
    setConsoleTab('testcases')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge.id])

  useEffect(() => { onCodeChangeRef.current = onCodeChange }, [onCodeChange])

  useEffect(() => {
    onCodeChangeRef.current?.(code)
    try { localStorage.setItem(getCodingCodeStorageKey(challenge.id, storageScope), code) } catch { /* quota */ }
  }, [challenge.id, code, storageScope])

  useEffect(() => {
    const t = window.setTimeout(() => textareaRef.current?.focus(), 100)
    return () => window.clearTimeout(t)
  }, [challenge.id])

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingRef.current = true
    dragStartYRef.current = e.clientY
    dragStartHeightRef.current = consoleHeight

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return
      const delta = dragStartYRef.current - ev.clientY
      const newHeight = Math.min(500, Math.max(80, dragStartHeightRef.current + delta))
      setConsoleHeight(newHeight)
    }
    const onMouseUp = () => {
      isDraggingRef.current = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [consoleHeight])

  const lang = language.toLowerCase()
  const displayLang = LANG_DISPLAY[lang] || language

  const diffColor = challenge.difficulty === 'basic'
    ? 'text-green-400'
    : challenge.difficulty === 'medium'
    ? 'text-yellow-400'
    : 'text-red-400'

  const passedCount = testResults?.filter((r) => r.passed).length ?? 0
  const totalVisible = challenge.visibleTestCases.length
  const totalSubmitted = submitSummary?.total ?? totalVisible
  const submittedPassed = submitSummary?.passed ?? passedCount
  const allPassed = submitSummary !== null
    ? submitSummary.total > 0 && submitSummary.passed === submitSummary.total
    : testResults !== null && passedCount === totalVisible

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = e.currentTarget
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const next = code.substring(0, start) + '    ' + code.substring(end)
      setCode(next)
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = start + 4
        setActiveLine(ta.value.substring(0, ta.selectionStart).split('\n').length)
      }, 0)
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleRun()
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  const normalizeStdin = (raw: string): string => raw.trimEnd()

  const handleRun = async () => {
    if (isRunning || isSubmitting) return
    setIsRunning(true)
    setCompileError('')
    setRunOutput(null)
    setConsoleTab('output')
    const effectiveStdin = customInput.trim()
      ? customInput
      : normalizeStdin(challenge.visibleTestCases[0]?.input || '')
    try {
      const res = await fetch(`${getBackendUrl()}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: lang, stdin: effectiveStdin }),
      })
      const data = await res.json()
      if (data.compilationError) {
        setCompileError(data.compilationError)
      } else if (data.results?.[0]) {
        setRunOutput(data.results[0])
      } else {
        setRunOutput({ stderr: data.error || 'Unexpected response from server', exitCode: 1 })
      }
    } catch {
      setRunOutput({ stderr: 'Cannot connect to execution server.', exitCode: 1 })
    } finally {
      setIsRunning(false)
    }
  }

  const handleSubmit = async () => {
    if (isRunning || isSubmitting) return
    setIsSubmitting(true)
    setCompileError('')
    setTestResults(null)
    setSubmitSummary(null)
    setConsoleTab('results')
    try {
      const allTestCases = [...challenge.visibleTestCases, ...challenge.hiddenTestCases].map(tc => ({
        ...tc,
        input: normalizeStdin(tc.input),
      }))
      const res = await fetch(`${getBackendUrl()}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: lang, testCases: allTestCases }),
      })
      const data = await res.json()
      if (data.compilationError) {
        setCompileError(data.compilationError)
        setConsoleTab('output')
      } else if (Array.isArray(data.results)) {
        const visibleCount = challenge.visibleTestCases.length
        const visibleResults = data.results.slice(0, visibleCount)
        const allResults = data.results as ExecResult[]
        const allPassedCount = allResults.filter((r: ExecResult) => r.passed).length
        const allCount = allResults.length
        setTestResults(visibleResults)
        setSubmitSummary({ passed: allPassedCount, total: allCount })
        onSubmit?.(code, allPassedCount, allCount)
      } else {
        setCompileError(data.error || 'Unexpected server response')
        setConsoleTab('output')
      }
    } catch {
      setCompileError('Cannot connect to execution server.')
      setConsoleTab('output')
    } finally {
      setIsSubmitting(false)
    }
  }

  const lines = code.split('\n')

  return (
    <div className="h-full flex overflow-hidden bg-[#0d1117]">

      {/* LEFT: Problem description panel -- dark theme like image 2 */}
      <div className="w-[42%] min-w-[300px] max-w-[520px] flex flex-col bg-[#0d1117] border-r border-gray-800 shrink-0">

        {/* Problem header */}
        <div className="px-5 py-4 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn('text-xs font-bold capitalize', diffColor)}>
              {challenge.difficulty === 'basic' ? 'Easy' : challenge.difficulty === 'medium' ? 'Medium' : 'Hard'}
            </span>
            {allPassed && (
              <span className="text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">Solved</span>
            )}
            {submitSummary && !allPassed && (
              <span className="text-xs text-gray-500">{submittedPassed}/{totalSubmitted} passed</span>
            )}
          </div>
          <h2 className="text-base font-bold text-white leading-snug">{challenge.title}</h2>
        </div>

        {/* Problem tabs */}
        <div className="flex border-b border-gray-800 bg-[#0d1117] shrink-0">
          {([
            { id: 'problem', label: 'Description' },
            { id: 'examples', label: 'Tutorial' },
            { id: 'hints', label: 'Hints' },
          ] as { id: ProblemTab; label: string }[]).map((t) => (
            <button key={t.id} type="button" onClick={() => setProblemTab(t.id)}
              className={cn('px-5 py-3 text-xs font-semibold border-b-2 transition-colors',
                problemTab === t.id
                  ? 'border-yellow-500 text-yellow-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300')}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Problem body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {problemTab === 'problem' && (
            <>
              <ProblemRenderer text={challenge.problemStatement} />

              <div className="space-y-3 pt-1">
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Input</h4>
                  <p className="text-sm text-gray-300 leading-relaxed">{challenge.inputFormat}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Output</h4>
                  <p className="text-sm text-gray-300 leading-relaxed">{challenge.outputFormat}</p>
                </div>
                {challenge.constraints.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Constraints</h4>
                    <ul className="space-y-1">
                      {challenge.constraints.map((c, i) => (
                        <li key={i} className="text-xs font-mono text-gray-300">{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Sample I/O table like image 2 */}
              {challenge.examples.length > 0 && (
                <div className="pt-1">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Sample Input &amp; Output</h4>
                  <div className="border border-gray-800 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-2 bg-gray-800/40">
                      <div className="px-3 py-2 text-xs font-semibold text-gray-400 border-r border-gray-800">Sample Input</div>
                      <div className="px-3 py-2 text-xs font-semibold text-gray-400">Sample Output</div>
                    </div>
                    {challenge.examples.map((ex, i) => (
                      <div key={i} className="grid grid-cols-2 border-t border-gray-800 min-w-0">
                        <div className="px-3 py-2 font-mono text-sm text-green-400 border-r border-gray-800 whitespace-pre-wrap break-all overflow-hidden">{ex.input || '(none)'}</div>
                        <div className="px-3 py-2 font-mono text-sm text-blue-400 whitespace-pre-wrap break-all overflow-hidden">{ex.output ?? ex.expectedOutput}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {problemTab === 'examples' && (
            <div className="space-y-4">
              {challenge.examples.map((ex, i) => (
                <div key={i} className="border border-gray-800 rounded-xl overflow-hidden">
                  <div className="bg-gray-800/40 px-3 py-1.5 border-b border-gray-800">
                    <span className="text-xs font-semibold text-gray-400">Example {i + 1}</span>
                  </div>
                  <div className="p-3 space-y-2">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Input</p>
                      <pre className="text-xs font-mono text-green-400 bg-gray-900/60 rounded p-2 whitespace-pre-wrap">{ex.input || '(no input)'}</pre>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Output</p>
                      <pre className="text-xs font-mono text-blue-400 bg-gray-900/60 rounded p-2">{ex.output ?? ex.expectedOutput}</pre>
                    </div>
                    {ex.explanation && <p className="text-xs text-gray-500 italic leading-relaxed">{ex.explanation}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {problemTab === 'hints' && (
            <div className="space-y-3">
              {challenge.hints.length === 0
                ? <p className="text-center text-xs text-gray-500 py-8">No hints for this challenge.</p>
                : challenge.hints.map((h, i) => (
                  <div key={i} className="flex gap-3 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                    <span className="text-sm shrink-0 font-bold text-yellow-500">!</span>
                    <p className="text-sm text-gray-300 leading-relaxed">{h}</p>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Editor + Console -- dark, VS-Code-like */}
      <div className="flex-1 min-w-0 flex flex-col bg-[#1e1e1e] overflow-hidden">

        {/* Editor toolbar -- matches image 2 top bar */}
        <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#3c3c3c] px-3 py-1 rounded border border-gray-700">
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              <span className="text-gray-200 text-xs font-medium">{displayLang}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button"
              onClick={() => { setShowInput(!showInput); if (!showInput) setConsoleTab('output') }}
              className={cn('text-xs px-3 py-1 rounded border transition-colors',
                showInput
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                  : 'border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600')}>
              Input
            </button>
            <button type="button" onClick={() => setCode(getBlankStarter(language))}
              className="text-xs px-3 py-1 rounded border border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-colors">
              Reset
            </button>
            <button type="button" onClick={handleRun} disabled={isRunning || isSubmitting}
              className="flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-white border border-gray-600 transition-colors disabled:opacity-40">
              {isRunning
                ? <><span className="w-3 h-3 rounded-full border-2 border-gray-400 border-t-white animate-spin" /> Running...</>
                : <><span className="text-green-400 text-sm">&#9654;</span> Run</>}
            </button>
            <button type="button" onClick={handleSubmit} disabled={isRunning || isSubmitting}
              className={cn(
                'flex items-center gap-1.5 text-xs font-bold px-4 py-1.5 rounded transition-colors disabled:opacity-40',
                allPassed ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600' : 'bg-yellow-500 hover:bg-yellow-400 text-black'
              )}>
              {isSubmitting
                ? <><span className="w-3 h-3 rounded-full border-2 border-black/30 border-t-black animate-spin" /> Judging...</>
                : allPassed ? 'Resubmit' : 'Submit'}
            </button>
            {allPassed && onNext && (
              <button type="button" onClick={onNext} disabled={nextDisabled}
                className="flex items-center gap-1.5 text-xs font-black px-4 py-1.5 rounded bg-green-500 hover:bg-green-600 text-white transition-colors disabled:opacity-40">
                {nextLabel}
              </button>
            )}
          </div>
        </div>

        {/* Custom stdin input */}
        {showInput && (
          <div className="shrink-0 px-4 py-2.5 bg-[#252526] border-b border-gray-800">
            <p className="text-xs text-gray-500 mb-1.5 font-medium">Custom stdin (used by Run):</p>
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="One value per line..."
              rows={2}
              className="w-full text-xs font-mono bg-[#1e1e1e] text-gray-200 border border-gray-700 rounded p-2 resize-none focus:outline-none focus:border-yellow-500 placeholder-gray-600"
            />
          </div>
        )}

        {/* Code editor */}
        <div
          className="flex-1 min-h-0 flex overflow-hidden cursor-text"
          onClick={() => textareaRef.current?.focus()}
        >
          {/* Line numbers -- synced scroll, active line highlighted */}
          <div
            ref={lineNumbersRef}
            className="select-none bg-[#1e1e1e] text-right pr-3 pl-2 pt-4 font-mono text-xs leading-[1.6rem] shrink-0 border-r border-gray-800/50 min-w-[2.8rem] overflow-hidden"
          >
            {lines.map((_, i) => (
              <div
                key={i}
                className={`h-[1.6rem] ${i + 1 === activeLine ? 'text-gray-200' : 'text-gray-600'}`}
              >
                {i + 1}
              </div>
            ))}
          </div>
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleEditorKeyDown}
            onKeyUp={(e) => {
              const ta = e.currentTarget
              const lineNum = ta.value.substring(0, ta.selectionStart).split('\n').length
              setActiveLine(lineNum)
            }}
            onClick={(e) => {
              const ta = e.currentTarget
              const lineNum = ta.value.substring(0, ta.selectionStart).split('\n').length
              setActiveLine(lineNum)
            }}
            onScroll={(e) => {
              if (lineNumbersRef.current) {
                lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop
              }
            }}
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
            tabIndex={0}
            aria-label="Code editor"
            className="ide-textarea flex-1 min-w-0 bg-[#1e1e1e] text-gray-200 font-mono text-sm leading-[1.6rem] pt-4 pb-4 px-4 resize-none focus:outline-none caret-yellow-400 overflow-auto"
          />
        </div>

        {/* Status bar */}
        <div className="shrink-0 h-6 bg-[#007acc] flex items-center justify-between px-4">
          <span className="text-xs text-white/80 font-mono">
            {lines.length} lines
          </span>
          <span className="text-xs text-white/70">
            Ctrl+Enter: Run &nbsp;|&nbsp; Ctrl+Shift+Enter: Submit
          </span>
        </div>

        {/* Drag handle */}
        <div
          onMouseDown={handleDividerMouseDown}
          className="shrink-0 h-1.5 bg-gray-800 hover:bg-yellow-500/50 cursor-row-resize flex items-center justify-center transition-colors group"
        >
          <div className="w-8 h-0.5 rounded-full bg-gray-600 group-hover:bg-yellow-400 transition-colors" />
        </div>

        {/* Console -- resizable drawer */}
        <div
          className="shrink-0 flex flex-col bg-[#1e1e1e] border-t border-gray-800"
          ref={(el) => { if (el) el.style.height = `${consoleHeight}px` }}
        >
          {/* Console tabs */}
          <div className="shrink-0 flex items-center bg-[#252526] border-b border-gray-800 px-2">
            {([
              { id: 'testcases', label: 'Testcase' },
              { id: 'output', label: 'Output' },
              ...(testResults !== null ? [{ id: 'results', label: allPassed ? `Results (${submittedPassed}/${totalSubmitted})` : `Results (${submittedPassed}/${totalSubmitted})` }] : []),
            ] as { id: ConsoleTab; label: string }[]).map((t) => (
              <button key={t.id} type="button" onClick={() => setConsoleTab(t.id)}
                className={cn('px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors',
                  consoleTab === t.id
                    ? 'border-yellow-500 text-yellow-400'
                    : 'border-transparent text-gray-500 hover:text-gray-300')}>
                {t.label}
              </button>
            ))}
            {(isRunning || isSubmitting) && (
              <div className="ml-auto flex items-center gap-1.5 pr-2 text-xs text-gray-500">
                <span className="w-3 h-3 rounded-full border-2 border-gray-700 border-t-yellow-400 animate-spin" />
                {isRunning ? 'Running...' : 'Judging...'}
              </div>
            )}
          </div>

          {/* Console body */}
          <div className="flex-1 overflow-y-auto p-3 bg-[#1e1e1e]">

            {/* Testcase tab -- shows visible test cases as tabs (Case 1, Case 2 ...) */}
            {consoleTab === 'testcases' && (
              <div className="space-y-0">
                <TestCaseTabs testCases={challenge.visibleTestCases} hiddenCount={challenge.hiddenTestCases.length} />
              </div>
            )}

            {/* Output tab */}
            {consoleTab === 'output' && (
              <div className="space-y-2 font-mono text-xs">
                {compileError && (
                  <div className="bg-red-950/40 border border-red-800/40 rounded p-3">
                    <p className="text-red-400 font-bold mb-1 not-italic font-sans text-xs">Compilation Error</p>
                    <pre className="text-red-300 whitespace-pre-wrap">{compileError}</pre>
                  </div>
                )}
                {!compileError && !runOutput && !isRunning && (
                  <p className="text-gray-600 text-center py-6 font-sans text-xs">
                    Press <kbd className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-gray-300">Run</kbd> to execute your code
                  </p>
                )}
                {runOutput && !compileError && (
                  <>
                    {runOutput.timedOut && (
                      <div className="bg-orange-950/40 border border-orange-800/40 rounded px-3 py-2">
                        <p className="text-orange-400 font-sans font-bold text-xs">Time Limit Exceeded</p>
                      </div>
                    )}
                    {runOutput.stdout ? (
                      <div>
                        <p className="text-gray-500 font-sans mb-1 text-xs">Output:</p>
                        <pre className="text-green-400 whitespace-pre-wrap leading-6">{runOutput.stdout}</pre>
                      </div>
                    ) : !runOutput.stderr && !runOutput.timedOut && (
                      <p className="text-gray-600 font-sans">(no output)</p>
                    )}
                    {runOutput.stderr && (
                      <div>
                        <p className="text-red-400 font-sans mb-1 text-xs">Error:</p>
                        <pre className="text-red-300 whitespace-pre-wrap leading-6">{runOutput.stderr}</pre>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Results tab */}
            {consoleTab === 'results' && testResults && (
              <div className="space-y-2">
                <div className={cn('flex items-center gap-2.5 px-3 py-2.5 rounded font-semibold text-sm',
                  allPassed
                    ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                    : 'bg-red-500/10 border border-red-500/20 text-red-400')}>
                  <span className="font-black">{allPassed ? 'Accepted' : 'Wrong Answer'}</span>
                  <span className="text-xs font-normal ml-auto text-gray-400">{submittedPassed}/{totalSubmitted} test cases</span>
                  {allPassed && onNext && (
                    <button type="button" onClick={onNext} disabled={nextDisabled}
                      className="shrink-0 px-3 py-1 rounded bg-green-500 hover:bg-green-600 text-white text-xs font-black transition-colors disabled:opacity-40">
                      {nextLabel}
                    </button>
                  )}
                </div>

                {testResults.map((r, i) => (
                  <div key={i} className={cn('border rounded overflow-hidden',
                    r.passed ? 'border-green-800/40' : 'border-red-800/40')}>
                    <div className={cn('flex items-center gap-2 px-3 py-1.5 border-b text-xs font-semibold',
                      r.passed ? 'bg-green-900/20 border-green-800/30 text-green-400' : 'bg-red-900/20 border-red-800/30 text-red-400')}>
                      <span>{r.passed ? 'Passed' : 'Failed'}</span>
                      <span className="text-gray-500 font-normal">Case {i + 1}</span>
                      {r.timedOut && <span className="ml-auto text-orange-400">TLE</span>}
                    </div>
                    <div className="p-3 space-y-2 font-mono text-xs">
                      {r.input && (
                        <div>
                          <p className="text-gray-500 font-sans mb-0.5 text-xs">Input</p>
                          <pre className="text-gray-300 whitespace-pre-wrap">{r.input}</pre>
                        </div>
                      )}
                      <div className={cn('grid gap-3', r.passed ? 'grid-cols-1' : 'grid-cols-2')}>
                        <div>
                          <p className="text-gray-500 font-sans mb-0.5 text-xs">Your Output</p>
                          <pre className={cn('whitespace-pre-wrap', r.passed ? 'text-green-400' : 'text-red-300')}>{r.actual || '(empty)'}</pre>
                        </div>
                        {!r.passed && (
                          <div>
                            <p className="text-gray-500 font-sans mb-0.5 text-xs">Expected</p>
                            <pre className="text-blue-400 whitespace-pre-wrap">{r.expected}</pre>
                          </div>
                        )}
                      </div>
                      {r.stderr && (
                        <div>
                          <p className="text-red-400 font-sans mb-0.5 text-xs">Error</p>
                          <pre className="text-red-300 whitespace-pre-wrap">{r.stderr}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Testcase tabs component -- shows Case 1, Case 2, + tabs like image 2
function TestCaseTabs({ testCases, hiddenCount }: {
  testCases: { input: string; expectedOutput: string; explanation?: string }[]
  hiddenCount: number
}) {
  const [activeCase, setActiveCase] = useState(0)
  const tc = testCases[activeCase]

  return (
    <div>
      <div className="flex items-center gap-1 mb-3 flex-wrap">
        {testCases.map((_, i) => (
          <button key={i} type="button" onClick={() => setActiveCase(i)}
            className={cn('px-3 py-1 rounded text-xs font-semibold border transition-colors',
              activeCase === i
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-transparent border-gray-700 text-gray-500 hover:text-gray-300')}>
            Case {i + 1}
          </button>
        ))}
        {hiddenCount > 0 && (
          <span className="text-xs text-gray-600 ml-1">+{hiddenCount} hidden</span>
        )}
      </div>
      {tc && (
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Input</p>
            <div className="bg-[#2d2d2d] rounded p-3 font-mono text-sm text-gray-200 whitespace-pre min-h-[2.5rem]">
              {tc.input || '(no input)'}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Expected Output</p>
            <div className="bg-[#2d2d2d] rounded p-3 font-mono text-sm text-gray-200 whitespace-pre min-h-[2.5rem]">
              {tc.expectedOutput}
            </div>
          </div>
          {tc.explanation && (
            <p className="text-xs text-gray-500 italic">{tc.explanation}</p>
          )}
        </div>
      )}
    </div>
  )
}
