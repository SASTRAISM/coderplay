'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, Bug, Compass, Unlock, Lock, Bot } from 'lucide-react'
import { aiService } from '@/lib/ai/aiService'
import { cn } from '@/lib/utils'
import { useAIStatus } from '@/hooks/useAIStatus'

function renderMarkdown(text: string): React.ReactNode[] {
  const blocks = text.split(/(```[\s\S]*?```)/g)
  return blocks.flatMap((block, bi): React.ReactNode[] => {
    if (block.startsWith('```')) {
      const langLine = block.match(/^```([^\n]*)/)
      const lang = langLine?.[1]?.trim() || ''
      const inner = block.replace(/^```[^\n]*\n?/, '').replace(/```$/, '')
      return [
        <div key={`code-${bi}`} className="my-2 rounded-lg overflow-hidden border border-gray-700">
          {lang && <div className="bg-gray-700 px-2 py-0.5"><span className="text-xs font-mono text-gray-400 uppercase">{lang}</span></div>}
          <pre className="bg-gray-900 text-green-400 text-xs font-mono p-2 overflow-x-auto leading-5 whitespace-pre"><code>{inner.trimEnd()}</code></pre>
        </div>
      ]
    }
    const lines = block.split('\n')
    const nodes: React.ReactNode[] = []
    lines.forEach((line, li) => {
      const key = `${bi}-${li}`
      if (line.trim() === '') { nodes.push(<div key={key} className="h-1" />); return }
      const renderInline = (str: string): React.ReactNode => {
        const parts = str.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
        return <span>{parts.map((p, pi) => {
          if (p.startsWith('**') && p.endsWith('**')) return <strong key={pi} className="font-semibold">{p.slice(2, -2)}</strong>
          if (p.startsWith('`') && p.endsWith('`')) return <code key={pi} className="bg-gray-700 text-yellow-300 rounded px-1 text-xs font-mono">{p.slice(1, -1)}</code>
          return p
        })}</span>
      }
      if (/^[-->]\s/.test(line)) {
        nodes.push(<div key={key} className="flex gap-1.5 my-0.5"><span className="text-yellow-400 shrink-0 text-xs mt-0.5">{'>'}</span>{renderInline(line.replace(/^[-->]\s/, ''))}</div>)
      } else if (/^\d+\.\s/.test(line)) {
        const num = line.match(/^(\d+)\.\s/)![1]
        nodes.push(<div key={key} className="flex gap-1.5 my-0.5"><span className="text-yellow-400 shrink-0 text-xs w-3">{num}.</span>{renderInline(line.replace(/^\d+\.\s/, ''))}</div>)
      } else if (/^#{1,3}\s/.test(line)) {
        nodes.push(<p key={key} className="font-semibold mt-2 mb-0.5 text-xs">{line.replace(/^#{1,3}\s/, '')}</p>)
      } else {
        nodes.push(<p key={key} className="leading-relaxed">{renderInline(line)}</p>)
      }
    })
    return nodes
  })
}

interface AICodingAssistantProps {
  conceptTitle: string
  problemTitle: string
  problemStatement?: string
  currentCode: string
  startTime: Date
  language: string
  referenceSolution?: string | null
  answerUnlocked?: boolean
  onInteraction?: (type: 'hint' | 'debug' | 'logic' | 'full-answer' | 'custom-question') => void
}

interface Message { role: 'ai' | 'user'; text: string; timestamp: Date; id?: string }

const FULL_ANSWER_WAIT_LABEL = 300 // 5 minutes

export function AICodingAssistant({
  conceptTitle,
  problemTitle,
  problemStatement,
  currentCode,
  startTime,
  language,
  referenceSolution,
  answerUnlocked,
  onInteraction,
}: AICodingAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [input, setInput] = useState('')
  const aiStatus = useAIStatus(true, 25_000)

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [startTime])

  const canRequestFullAnswer =
    elapsed >= FULL_ANSWER_WAIT_LABEL
  const remaining = Math.max(0, FULL_ANSWER_WAIT_LABEL - elapsed)
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')

  // Streams Ollama tokens directly into the last message bubble
  const streamAIMessage = async (payload: Record<string, unknown>) => {
    setIsTyping(true)
    const msgId = `ai_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    let firstChunk = true

    await aiService.streamChat(payload, (chunk) => {
      if (firstChunk) {
        firstChunk = false
        setIsTyping(false)
        setMessages((prev) => [...prev, { role: 'ai', text: chunk, timestamp: new Date(), id: msgId }])
      } else {
        setMessages((prev) => prev.map((m) =>
          m.id === msgId ? { ...m, text: m.text + chunk } : m
        ))
      }
    })

    if (firstChunk) {
      setIsTyping(false)
      setMessages((prev) => [...prev, { role: 'ai', text: 'Sorry, I had trouble responding. Please try again!', timestamp: new Date() }])
    }
  }

  const handleHint = async () => {
    onInteraction?.('hint')
    setMessages((prev) => [...prev, { role: 'user', text: 'Give me a hint', timestamp: new Date() }])
    await streamAIMessage({
      type: 'hint',
      conceptTitle: problemTitle,
      conceptKeyPoints: problemStatement ? [problemStatement] : [],
      language,
      code: currentCode || '# (no code yet)',
    })
  }

  const handleDebug = async () => {
    onInteraction?.('debug')
    if (!currentCode || currentCode.trim() === '# Write your code here\n' || currentCode.trim() === '// Write your code here') {
      setMessages((prev) => [...prev,
        { role: 'user', text: 'Help me debug my code', timestamp: new Date() },
        { role: 'ai', text: "I don't see any code yet! Write your attempt first, then click Debug Help and I'll review it for you.", timestamp: new Date() },
      ])
      return
    }
    setMessages((prev) => [...prev, { role: 'user', text: 'Help me debug my code', timestamp: new Date() }])
    await streamAIMessage({
      type: 'guidance',
      conceptTitle: problemTitle,
      language,
      question: problemStatement || problemTitle,
      currentAttempt: currentCode,
    })
  }

  const handleLogic = async () => {
    onInteraction?.('logic')
    setMessages((prev) => [...prev, { role: 'user', text: 'Explain the logic approach', timestamp: new Date() }])
    await streamAIMessage({
      type: 'guidance',
      conceptTitle: problemTitle,
      language,
      question: problemStatement || problemTitle,
      currentAttempt: currentCode || '# (no code yet)',
    })
  }

  const handleFullAnswer = async () => {
    if (!canRequestFullAnswer) return
    onInteraction?.('full-answer')
    setMessages((prev) => [...prev, { role: 'user', text: 'Show me the complete solution', timestamp: new Date() }])

    // If a pre-generated reference solution is available, show it directly
    if (referenceSolution && referenceSolution !== '__unavailable__') {
      setMessages((prev) => [...prev, {
        role: 'ai',
        text: `Here is the complete reference solution:\n\n\`\`\`${language}\n${referenceSolution}\n\`\`\`\n\nStudy this carefully and compare it with your own code. Understanding *why* each line works is more important than copying it.`,
        timestamp: new Date(),
      }])
      return
    }

    // Otherwise stream a fresh solution from AI
    await streamAIMessage({
      type: 'solution',
      language,
      challengeTitle: problemTitle,
      problemStatement: problemStatement || problemTitle,
      inputFormat: '',
      outputFormat: '',
      constraints: [],
      examples: [],
      starterCode: '',
      visibleTestCases: [],
    })
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    onInteraction?.('custom-question')
    setMessages((prev) => [...prev, { role: 'user', text, timestamp: new Date() }])
    // Include problem statement and current code so AI answers in context
    const contextNote = problemStatement
      ? `The student is solving: "${problemTitle}"\nProblem: ${problemStatement}\nCurrent code:\n${currentCode || '(no code yet)'}\n\nStudent asks: ${text}`
      : text
    await streamAIMessage({
      type: 'student-question',
      conceptTitle: problemTitle,
      language,
      message: contextNote,
      conceptKeyPoints: problemStatement ? [problemStatement] : [problemTitle],
    })
  }

  return (
    <div className="flex flex-col h-full bg-white border border-gray-100 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-yellow-500 flex items-center justify-center text-black text-xs font-black">T</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-800">Coding Assistant</p>
              <span title={aiStatus.detail} className={cn('text-[10px] font-bold border px-2 py-0.5 rounded-full', aiStatus.badgeClassName)}>
                {aiStatus.label}
              </span>
            </div>
            <p className="text-xs text-gray-400 truncate">Hints, logic support, and debugging for beginners</p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="p-3 border-b border-gray-100 grid grid-cols-2 gap-2">
        <button type="button" onClick={handleHint} disabled={isTyping} className="flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-3 rounded-lg border border-yellow-200 text-yellow-700 bg-yellow-50 hover:bg-yellow-100 transition-colors disabled:opacity-50"><Lightbulb className="w-3 h-3" /> Get Hint</button>
        <button type="button" onClick={handleDebug} disabled={isTyping} className="flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-3 rounded-lg border border-gray-200 text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-50"><Bug className="w-3 h-3" /> Debug Help</button>
        <button type="button" onClick={handleLogic} disabled={isTyping} className="flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-3 rounded-lg border border-gray-200 text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-50"><Compass className="w-3 h-3" /> Logic Guide</button>
        <button
          type="button"
          onClick={handleFullAnswer}
          disabled={!canRequestFullAnswer || isTyping}
          className={cn(
            'flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-3 rounded-lg border transition-colors disabled:opacity-50 relative',
            canRequestFullAnswer
              ? 'border-gray-800 text-gray-800 bg-white hover:bg-gray-50'
              : 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
          )}
        >
          {canRequestFullAnswer ? <><Unlock className="w-3 h-3" /> Answer Panel Ready</> : <><Lock className="w-3 h-3" /> {mm}:{ss} left</>}
        </button>
      </div>

      {!canRequestFullAnswer && (
        <div className="px-3 py-2 bg-amber-50 border-b border-amber-100">
          <p className="text-xs text-amber-700 text-center">
            The reference answer appears after {mm}:{ss}. Use hints and debugging first so you get the most learning value.
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <div className="mb-2 flex justify-center"><Bot className="w-8 h-8 text-gray-300" /></div>
            <p className="text-xs">Use the buttons above or ask me anything!</p>
          </div>
        )}
        <AnimatePresence>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('flex gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {m.role === 'ai' && <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-black text-xs font-black shrink-0 mt-0.5">T</div>}
              <div className={cn(
                'max-w-[80%] text-xs leading-relaxed rounded-xl px-3 py-2',
                m.role === 'ai' ? 'bg-gray-50 border border-gray-100 text-gray-700 rounded-tl-sm' : 'bg-yellow-500 text-black rounded-tr-sm'
              )}>
                {m.role === 'ai' ? renderMarkdown(m.text) : m.text}
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-black text-xs font-black shrink-0">T</div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 flex gap-1">
                <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-100 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask anything about the problem..."
          className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-400 transition-colors"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          className="text-xs font-semibold px-3 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg transition-colors disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  )
}
