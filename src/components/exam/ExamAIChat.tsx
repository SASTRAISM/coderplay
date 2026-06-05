'use client'

import { useState, useRef, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { aiService } from '@/lib/ai/aiService'
import { useAIStatus } from '@/hooks/useAIStatus'
import { cn } from '@/lib/utils'

function renderMarkdown(text: string): React.ReactNode[] {
  const blocks = text.split(/(```[\s\S]*?```)/g)
  return blocks.flatMap((block, bi): React.ReactNode[] => {
    if (block.startsWith('```')) {
      const langLine = block.match(/^```([^\n]*)/)
      const lang = langLine?.[1]?.trim() || ''
      const inner = block.replace(/^```[^\n]*\n?/, '').replace(/```$/, '')
      return [
        <div key={`code-${bi}`} className="my-2 rounded-xl overflow-hidden border border-gray-800">
          {lang && (
            <div className="bg-gray-800 px-3 py-1">
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
      if (line.trim() === '') { nodes.push(<div key={key} className="h-1" />); return }
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
      if (/^[-*] /.test(line)) {
        nodes.push(
          <div key={key} className="flex gap-2 my-0.5 pl-1">
            <span className="text-yellow-500 font-bold shrink-0 mt-0.5 text-xs">&gt;</span>
            {renderInline(line.replace(/^[-*] /, ''), 'text-sm leading-relaxed text-gray-700')}
          </div>
        )
        return
      }
      if (/^\d+\.\s/.test(line)) {
        const num = line.match(/^(\d+)\.\s/)![1]
        nodes.push(
          <div key={key} className="flex gap-2 my-0.5 pl-1">
            <span className="text-yellow-600 font-bold shrink-0 w-4 text-xs">{num}.</span>
            {renderInline(line.replace(/^\d+\.\s/, ''), 'text-sm leading-relaxed text-gray-700')}
          </div>
        )
        return
      }
      if (/^#{1,3}\s/.test(line)) {
        nodes.push(<p key={key} className="font-bold text-gray-900 mt-2 mb-0.5 text-sm">{line.replace(/^#{1,3}\s/, '')}</p>)
        return
      }
      nodes.push(<p key={key} className="text-sm leading-relaxed text-gray-700">{renderInline(line, '')}</p>)
    })
    return nodes
  })
}

interface Message {
  role: 'user' | 'ai'
  content: string
}

interface ExamAIChatProps {
  conceptTitle: string
  conceptKeyPoints: string[]
  language: string
  currentQuestion?: string
  isOpen: boolean
  onClose: () => void
}

export function ExamAIChat({
  conceptTitle,
  conceptKeyPoints,
  language,
  currentQuestion,
  isOpen,
  onClose,
}: ExamAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const aiStatus = useAIStatus(isOpen, 20_000)

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'ai',
        content: `Hi! I'm Cody. I'm here to help you **understand concepts** -- not to give you the answer directly.\n\nAsk me anything about **${conceptTitle}** and I'll explain it clearly with examples. What would you like to understand better?`,
      }])
    }
  }, [isOpen, conceptTitle, messages.length])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100)
  }, [isOpen])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setStreaming(true)
    setMessages(prev => [...prev, { role: 'ai', content: '' }])

    let full = ''
    try {
      await aiService.streamChat(
        {
          type: 'exam-help',
          conceptTitle,
          conceptKeyPoints,
          language,
          currentQuestion: currentQuestion || '',
          message: text,
          mode: 'explain-not-answer',
        },
        (chunk) => {
          full += chunk
          setMessages(prev => {
            const copy = [...prev]
            copy[copy.length - 1] = { role: 'ai', content: full }
            return copy
          })
        }
      )
    } catch {
      setMessages(prev => {
        const copy = [...prev]
        copy[copy.length - 1] = { role: 'ai', content: "Sorry, I couldn't connect to the AI right now. Try again." }
        return copy
      })
    } finally {
      setStreaming(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-sm bg-white flex flex-col shadow-2xl border-l border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-yellow-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-yellow-400 flex items-center justify-center text-sm font-black text-black">C</div>
            <div>
              <p className="text-sm font-bold text-gray-900">Cody AI Helper</p>
              <p className="text-xs text-gray-500">Explains concepts * Never reveals answers</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors p-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Warning banner */}
        <div className="px-3 py-2 bg-amber-50 border-b border-amber-100">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs text-amber-700 font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3 inline-block align-middle shrink-0" /> Cody will explain concepts and approach -- not the direct answer.</p>
            <span title={aiStatus.detail} className={cn('shrink-0 text-[10px] font-bold border px-2 py-0.5 rounded-full', aiStatus.badgeClassName)}>
              {aiStatus.label}
            </span>
          </div>
        </div>

        {aiStatus.state === 'offline' && (
          <div className="px-3 py-2 bg-red-50 border-b border-red-100">
            <p className="text-xs text-red-700 font-semibold">Cody is offline. You can keep working; try again after the backend reconnects.</p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                msg.role === 'user'
                  ? 'bg-yellow-400 text-black font-medium rounded-br-sm'
                  : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'
              }`}>
                {msg.role === 'ai'
                  ? <>{renderMarkdown(msg.content)}{streaming && i === messages.length - 1 && <span className="inline-block w-1.5 h-4 bg-yellow-400 ml-1 animate-pulse rounded-sm" />}</>
                  : <span className="whitespace-pre-wrap">{msg.content}</span>
                }
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-gray-100 bg-white">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Ask about the concept..."
              rows={2}
              className="flex-1 resize-none px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!input.trim() || streaming}
              className="px-3 py-2 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-black rounded-xl transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
