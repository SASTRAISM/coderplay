'use client'

import { useState, useRef, useEffect, forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Lightbulb, ChevronRight, MessageSquare, BookOpen, Code2, Maximize2, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAIStatus } from '@/hooks/useAIStatus'
import type { ChatMessage } from '@/types'

// -- Markdown renderer ---------------------------------------------------------
function renderMarkdown(text: string): React.ReactNode[] {
  const blocks = text.split(/(```[\s\S]*?```)/g)
  return blocks.flatMap((block, bi): React.ReactNode[] => {
    if (block.startsWith('```')) {
      const langLine = block.match(/^```([^\n]*)/)
      const lang = langLine?.[1]?.trim() || ''
      const inner = block.replace(/^```[^\n]*\n?/, '').replace(/```$/, '')
      return [
        <div key={`code-${bi}`} className="my-3 rounded-xl overflow-hidden border border-gray-800 shadow-sm">
          {lang && (
            <div className="bg-gray-800 px-3 py-1 flex items-center justify-between">
              <span className="text-xs font-mono text-gray-400 uppercase">{lang}</span>
            </div>
          )}
          <pre className="bg-gray-950 text-green-400 text-xs font-mono p-3 overflow-x-auto leading-5 whitespace-pre">
            <code>{inner.trimEnd()}</code>
          </pre>
        </div>
      ]
    }

    const lines = block.split('\n')
    const nodes: React.ReactNode[] = []

    lines.forEach((line, li) => {
      const key = `${bi}-${li}`

      if (line.trim() === '') {
        nodes.push(<div key={key} className="h-1.5" />)
        return
      }

      const renderInline = (str: string, base: string): React.ReactNode => {
        const parts = str.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
        return (
          <span className={base}>
            {parts.map((p, pi) => {
              if (p.startsWith('**') && p.endsWith('**'))
                return <strong key={pi} className="font-semibold text-gray-900">{p.slice(2, -2)}</strong>
              if (p.startsWith('`') && p.endsWith('`'))
                return <code key={pi} className="bg-yellow-50 text-yellow-900 border border-yellow-200 rounded px-1 py-0.5 text-xs font-mono">{p.slice(1, -1)}</code>
              return p
            })}
          </span>
        )
      }

      if (/^[-->]\s/.test(line)) {
        const content = line.replace(/^[-->]\s/, '')
        nodes.push(
          <div key={key} className="flex gap-2 my-0.5 pl-1">
            <span className="text-yellow-500 font-bold shrink-0 mt-0.5 text-xs">&gt;</span>
            {renderInline(content, 'text-sm leading-relaxed text-gray-700')}
          </div>
        )
        return
      }

      if (/^\d+\.\s/.test(line)) {
        const num = line.match(/^(\d+)\.\s/)![1]
        const content = line.replace(/^\d+\.\s/, '')
        nodes.push(
          <div key={key} className="flex gap-2 my-0.5 pl-1">
            <span className="text-yellow-600 font-bold shrink-0 w-4 text-xs">{num}.</span>
            {renderInline(content, 'text-sm leading-relaxed text-gray-700')}
          </div>
        )
        return
      }

      if (/^#{1,3}\s/.test(line)) {
        const content = line.replace(/^#{1,3}\s/, '')
        nodes.push(<p key={key} className="font-bold text-gray-900 mt-3 mb-1 text-sm">{content}</p>)
        return
      }

      if (/^[A-Z][A-Z\s&/()]+:$/.test(line.trim())) {
        nodes.push(<p key={key} className="font-bold text-gray-800 mt-2 mb-0.5 text-xs uppercase tracking-wide">{line.trim()}</p>)
        return
      }

      nodes.push(<p key={key} className="text-sm leading-relaxed text-gray-700">{renderInline(line, '')}</p>)
    })

    return nodes
  })
}

// -- Suggested questions -------------------------------------------------------
const GENERIC_SUGGESTIONS = [
  'Show me a code example',
  'What is a common mistake?',
  'How is this used in real projects?',
  'Can you simplify that?',
]

interface AIChatProps {
  messages: ChatMessage[]
  isTyping?: boolean
  onSendMessage: (text: string) => void
  onExplainAgain: () => void
  onGiveHint: () => void
  onGotIt: () => void
  canAdvance?: boolean
  advanceHint?: string
  disabled?: boolean
  stage?: 1 | 3
  suggestedQuestions?: string[]
}

// -- Message bubble ------------------------------------------------------------
const MessageBubble = forwardRef<HTMLDivElement, { msg: ChatMessage }>(function MessageBubble({ msg }, ref) {
  const isAI = msg.role === 'ai'
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('flex gap-2.5', isAI ? 'justify-start' : 'justify-end')}
    >
      {isAI && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black text-xs font-black shrink-0 mt-0.5 shadow-sm">
          AI
        </div>
      )}
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3 shadow-sm',
          isAI
            ? 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
            : 'bg-yellow-500 text-black rounded-tr-sm'
        )}
      >
        <div className="text-sm">
          {isAI
            ? renderMarkdown(msg.content)
            : <span className="whitespace-pre-wrap font-medium">{msg.content}</span>}
        </div>
        <p className={cn('text-xs mt-1.5', isAI ? 'text-gray-300' : 'text-yellow-800/70')}>
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      {!isAI && (
        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">
          YOU
        </div>
      )}
    </motion.div>
  )
})

// -- Typing indicator ----------------------------------------------------------
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2.5 justify-start"
    >
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black text-xs font-black shrink-0 shadow-sm">
        AI
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5 shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-bounce [animation-delay:300ms]" />
      </div>
    </motion.div>
  )
}

// -- Main component ------------------------------------------------------------
export function AIChat({
  messages,
  isTyping,
  onSendMessage,
  onExplainAgain,
  onGiveHint,
  onGotIt,
  canAdvance = true,
  advanceHint,
  disabled,
  stage = 1,
  suggestedQuestions,
}: AIChatProps) {
  const [input, setInput] = useState('')
  const [shownSuggestions, setShownSuggestions] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const prevMsgCountRef = useRef(messages.length)
  const aiStatus = useAIStatus(true, 25_000)

  useEffect(() => {
    const isNewMessage = messages.length !== prevMsgCountRef.current
    prevMsgCountRef.current = messages.length

    if (isNewMessage || isTyping) {
      // New message added or typing indicator appeared -- always scroll to bottom
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    // Streaming content update -- only scroll if user is already near the bottom
    const el = scrollRef.current
    if (el) {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      if (distanceFromBottom < 120) {
        bottomRef.current?.scrollIntoView({ behavior: 'instant' })
      }
    }
  }, [messages, isTyping])

  // Hide suggestions after first student message
  useEffect(() => {
    const hasStudentMsg = messages.some(m => m.role === 'user')
    if (hasStudentMsg) setShownSuggestions(false)
  }, [messages])

  const handleSend = (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || disabled) return
    onSendMessage(msg)
    setInput('')
    setShownSuggestions(false)
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const suggestions = suggestedQuestions?.length ? suggestedQuestions : GENERIC_SUGGESTIONS

  return (
    <div className={cn(
      'flex flex-col bg-gray-50/50 transition-all duration-200',
      isExpanded
        ? 'fixed inset-0 z-50 h-screen w-screen rounded-none'
        : 'h-full'
    )}>
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-gray-100 bg-white shrink-0 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2 w-2">
            {aiStatus.state === 'online' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />}
            <span className={cn('relative inline-flex rounded-full h-2 w-2', aiStatus.dotClassName)} />
          </span>
          <span className="text-xs font-semibold text-gray-600 truncate">
            Cody AI -- {stage === 1 ? 'Learning Mentor' : 'Coding Mentor'}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span title={aiStatus.detail} className={cn('text-xs font-bold border px-2.5 py-0.5 rounded-full', aiStatus.badgeClassName)}>
            {aiStatus.label}
          </span>
          <span className="text-xs font-bold text-yellow-700 bg-yellow-50 border border-yellow-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            {stage === 1 ? <><BookOpen className="w-3 h-3" /> Stage 1 &mdash; Learn</> : <><Code2 className="w-3 h-3" /> Stage 3 &mdash; Practice</>}
          </span>
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            title={isExpanded ? 'Exit fullscreen' : 'Expand chat'}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
        </AnimatePresence>
        {isTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Suggested questions -- shown before first message */}
      <AnimatePresence>
        {shownSuggestions && stage === 1 && !disabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pt-3 pb-2 bg-white border-t border-gray-100 shrink-0"
          >
            <p className="text-xs text-gray-400 mb-2 font-medium">Quick questions to get started:</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.slice(0, 4).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSend(q)}
                  disabled={disabled}
                  className="text-xs px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-gray-600 hover:bg-yellow-50 hover:border-yellow-300 hover:text-yellow-800 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick actions (Stage 1) */}
      {stage === 1 && (
        <div className="px-4 pb-3 flex gap-2 flex-wrap bg-white border-t border-gray-50 pt-3 shrink-0">
          <button
            type="button"
            onClick={onExplainAgain}
            disabled={disabled}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full border border-yellow-300 text-yellow-700 bg-yellow-50 hover:bg-yellow-100 transition-colors disabled:opacity-40"
          >
            <RefreshCw className="w-3 h-3" /> Explain Again
          </button>
          <button
            type="button"
            onClick={onGiveHint}
            disabled={disabled}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full border border-gray-200 text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-40"
          >
            <Lightbulb className="w-3 h-3" /> Hint
          </button>
          <button
            type="button"
            onClick={onGotIt}
            disabled={disabled || !canAdvance}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full bg-yellow-500 hover:bg-yellow-400 text-black transition-colors disabled:opacity-40 ml-auto shadow-sm"
          >
            {canAdvance ? <><ChevronRight className="w-3 h-3" /> Next Step</> : <><MessageSquare className="w-3 h-3" /> Answer First</>}
          </button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-100 bg-white shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={stage === 1 ? 'Ask Cody anything about this concept...' : 'Ask for help or a hint...'}
            disabled={disabled}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all disabled:opacity-50 bg-gray-50 max-h-24"
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim() || disabled}
            className="w-10 h-10 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0 shadow-sm"
            aria-label="Send message"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <div className="flex items-center justify-between gap-3 mt-1.5 px-1">
          <p className="text-xs text-gray-400">Enter to send . Shift+Enter for new line</p>
          {stage === 1 && advanceHint && (
            <p className="text-xs text-yellow-700 font-medium text-right">{advanceHint}</p>
          )}
        </div>
      </div>
    </div>
  )
}
