'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, ClipboardList, Pin, Lightbulb, PartyPopper } from 'lucide-react'
import { APTITUDE_SUBJECTS, APTITUDE_CONCEPTS } from '@/data/aptitudeData'
import { streamChat } from '@/lib/ai/aiService'
import { notFound } from 'next/navigation'
import MarkdownRenderer from '@/components/shared/MarkdownRenderer'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { useAuth } from '@/hooks/useAuth'

interface Message {
  role: 'user' | 'ai'
  content: string
}

const STEP_TITLES = [
  'Core Concept & Foundation',
  'Key Formulas & Methods',
  'Worked Examples',
  'Exam Traps & Common Mistakes',
  'Speed Tricks & Final Challenge',
]

function getStepMessage(step: number, conceptTitle: string): string {
  const instructions = [
    `STEP 1 OF 5 -- CORE CONCEPT & FOUNDATION for "${conceptTitle}": Explain (1) what exactly this topic is in simple language, (2) why it's tested in TCS/Infosys/Wipro/Cognizant placements, (3) the single most important formula written clearly, (4) one real-life example using Indian context (Rs., mess bills, CGPA). End by asking the student ONE question to verify they understand the core concept (answerable in 1-2 sentences).`,
    `STEP 2 OF 5 -- KEY FORMULAS & METHODS for "${conceptTitle}": List ALL key formulas clearly (label each: Formula 1, Formula 2...). For each: explain when to use it and show one quick numerical example. Include any memory trick if applicable. End with a numerical problem requiring the student to apply one formula. Ask them to show their calculation.`,
    `STEP 3 OF 5 -- WORKED EXAMPLES for "${conceptTitle}": Solve 2 complete examples step by step with actual numbers. Example 1: easy level. Example 2: medium/exam-level. For each show every arithmetic step clearly. End by giving the student ONE medium-difficulty problem to solve themselves and asking them to write out each step.`,
    `STEP 4 OF 5 -- EXAM TRAPS & COMMON MISTAKES for "${conceptTitle}": Cover the top 3 mistakes students make in placement exams. For each mistake: show the WRONG approach vs CORRECT approach side by side. Also mention any tricky phrasing in questions to watch out for. End with a tricky question that has a common trap -- ask what mistake a careless student would make and what the right approach is.`,
    `STEP 5 OF 5 -- SPEED TRICKS & FINAL CHALLENGE for "${conceptTitle}": Teach 2-3 fastest shortcuts that toppers use (prove each works with an example). Show the "30-second method" for the most common question type. Then give ONE hard exam-style question (actual TCS/Infosys difficulty level). Tell the student: "You have 30 seconds! Write your answer and show your method -- this is your final check before the MCQ round!"`,
  ]
  return instructions[step - 1]
}

function getStudentReplyMessage(studentText: string, completedStep: number, conceptTitle: string): string {
  if (completedStep >= 5) {
    return `[You just finished teaching Step 5 of 5 on "${conceptTitle}" and asked a final challenge. The student answered:] "${studentText}" -- Briefly evaluate their answer in 2-3 sentences (say if correct/partially correct/incorrect and why). Then congratulate them warmly for completing all 5 steps and tell them the MCQ round is now unlocked. Encourage them to test themselves!`
  }
  const nextStep = completedStep + 1
  const nextTopics = ['Core Concept & Foundation', 'Key Formulas & Methods', 'Worked Examples', 'Exam Traps & Common Mistakes', 'Speed Tricks & Final Challenge']
  const nextStepInstructions = [
    `STEP 1 OF 5 -- CORE CONCEPT & FOUNDATION for "${conceptTitle}": Explain (1) what exactly this topic is in simple language, (2) why it's tested in TCS/Infosys/Wipro/Cognizant placements, (3) the single most important formula written clearly, (4) one real-life example using Indian context (Rs., mess bills, CGPA). End by asking the student ONE question to verify they understand the core concept (answerable in 1-2 sentences).`,
    `STEP 2 OF 5 -- KEY FORMULAS & METHODS for "${conceptTitle}": List ALL key formulas clearly (label each: Formula 1, Formula 2...). For each: explain when to use it and show one quick numerical example. Include any memory trick if applicable. End with a numerical problem requiring the student to apply one formula. Ask them to show their calculation.`,
    `STEP 3 OF 5 -- WORKED EXAMPLES for "${conceptTitle}": Solve 2 complete examples step by step with actual numbers. Example 1: easy level. Example 2: medium/exam-level. For each show every arithmetic step clearly. End by giving the student ONE medium-difficulty problem to solve themselves and asking them to write out each step.`,
    `STEP 4 OF 5 -- EXAM TRAPS & COMMON MISTAKES for "${conceptTitle}": Cover the top 3 mistakes students make in placement exams. For each mistake: show the WRONG approach vs CORRECT approach side by side. Also mention any tricky phrasing in questions to watch out for. End with a tricky question that has a common trap -- ask what mistake a careless student would make and what the right approach is.`,
    `STEP 5 OF 5 -- SPEED TRICKS & FINAL CHALLENGE for "${conceptTitle}": Teach 2-3 fastest shortcuts that toppers use (prove each works with an example). Show the "30-second method" for the most common question type. Then give ONE hard exam-style question (actual TCS/Infosys difficulty level). Tell the student: "You have 30 seconds! Write your answer and show your method -- this is your final check before the MCQ round!"`,
  ]
  return `[You just finished teaching Step ${completedStep} of 5 on "${conceptTitle}" and probed the student. The student answered:] "${studentText}" -- Briefly evaluate their answer in 2 sentences (correct/incorrect/close). Then smoothly transition: say something like "Great! Let's move to Step ${nextStep} of 5 -- ${nextTopics[nextStep - 1]}." Then immediately teach ${nextStepInstructions[nextStep - 1]}`
}

export default function AptitudeStage1Client({ params }: { params: { subjectId: string; conceptId: string } }) {
  const subject = APTITUDE_SUBJECTS.find(s => s.id === params.subjectId)
  const allConcepts = APTITUDE_CONCEPTS[params.subjectId] || []
  const concept = allConcepts.find(c => c.id === params.conceptId)
  if (!subject || !concept) notFound()

  const { user, loading: authLoading } = useAuth()

  const [currentStep, setCurrentStep] = useState(1)
  const [stepsCompleted, setStepsCompleted] = useState(0)
  const [waitingForStudent, setWaitingForStudent] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [progressLoaded, setProgressLoaded] = useState(false)
  const [savedIndicator, setSavedIndicator] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasLoadedRef = useRef(false)

  // Scroll to bottom whenever messages change
  useEffect(() => {
    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 50)
    return () => clearTimeout(timer)
  }, [messages])

  // Save progress to Firestore (debounced)
  const saveProgress = (
    msgs: Message[],
    sc: number,
    cs: number,
    wfs: boolean,
  ) => {
    if (!user) return
    const id = `${user.uid}_${params.subjectId}_${params.conceptId}`
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        await setDoc(doc(db, 'aptitudeProgress', id), {
          messages: msgs,
          stepsCompleted: sc,
          currentStep: cs,
          waitingForStudent: wfs,
          savedAt: serverTimestamp(),
          subjectId: params.subjectId,
          conceptId: params.conceptId,
        })
        setSavedIndicator(true)
        setTimeout(() => setSavedIndicator(false), 2000)
      } catch (err) {
        console.error('Failed to save aptitude progress:', err)
      }
    }, 800)
  }

  // Start a step: stream the AI explanation for that step
  const startStep = (step: number, currentMessages: Message[]) => {
    setStreaming(true)
    setWaitingForStudent(false)
    const newMessages: Message[] = [...currentMessages, { role: 'ai', content: '' }]
    setMessages(newMessages)
    let full = ''
    streamChat(
      {
        type: 'aptitude-explain',
        conceptTitle: concept!.title,
        conceptKeyPoints: concept!.keyPoints,
        language: 'aptitude',
        subjectTitle: subject!.title,
        message: getStepMessage(step, concept!.title),
      },
      (chunk) => {
        full += chunk
        setMessages(prev => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: 'ai', content: full }
          return copy
        })
      }
    ).finally(() => {
      setStreaming(false)
      setWaitingForStudent(true)
      setMessages(prev => {
        saveProgress(prev, stepsCompleted, step, true)
        return prev
      })
    })
  }

  // Handle student reply to probe question
  const handleStudentReply = (text: string, currentStepsCompleted: number) => {
    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: text },
      { role: 'ai', content: '' },
    ]
    setMessages(newMessages)
    setStreaming(true)
    setWaitingForStudent(false)

    let full = ''
    streamChat(
      {
        type: 'aptitude-explain',
        conceptTitle: concept!.title,
        conceptKeyPoints: concept!.keyPoints,
        language: 'aptitude',
        subjectTitle: subject!.title,
        message: getStudentReplyMessage(text, currentStepsCompleted, concept!.title),
      },
      (chunk) => {
        full += chunk
        setMessages(prev => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: 'ai', content: full }
          return copy
        })
      }
    ).finally(() => {
      setStreaming(false)
      const newCompleted = currentStepsCompleted + 1
      setStepsCompleted(newCompleted)
      if (newCompleted < 5) {
        setCurrentStep(newCompleted + 1)
        setWaitingForStudent(true)
        setMessages(prev => {
          saveProgress(prev, newCompleted, newCompleted + 1, true)
          return prev
        })
      } else {
        // All 5 steps done
        setWaitingForStudent(false)
        setMessages(prev => {
          saveProgress(prev, newCompleted, 5, false)
          return prev
        })
      }
    })
  }

  // Load saved progress -- wait for Firebase auth to resolve first
  useEffect(() => {
    if (authLoading) return
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true

    async function loadProgress() {
      if (!user) {
        setProgressLoaded(true)
        return
      }
      const id = `${user.uid}_${params.subjectId}_${params.conceptId}`
      try {
        const snap = await getDoc(doc(db, 'aptitudeProgress', id))
        if (snap.exists()) {
          const data = snap.data()
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages as Message[])
            const sc = data.stepsCompleted ?? 0
            const cs = data.currentStep ?? 1
            const wfs = sc >= 5 ? false : (data.waitingForStudent ?? false)
            setStepsCompleted(sc)
            setCurrentStep(cs)
            setWaitingForStudent(wfs)
            setProgressLoaded(true)
            return
          }
        }
      } catch (err) {
        console.error('Failed to load aptitude progress:', err)
      }
      setProgressLoaded(true)
    }
    loadProgress()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.uid, params.subjectId, params.conceptId])

  // Auto-start step 1 only if no saved progress
  useEffect(() => {
    if (!progressLoaded) return
    if (messages.length > 0) return // restored from Firestore
    if (streaming) return
    startStep(1, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressLoaded])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')

    if (waitingForStudent) {
      handleStudentReply(text, stepsCompleted)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const mcqUnlocked = stepsCompleted >= 5

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/aptitude/${params.subjectId}`} className="text-gray-400 hover:text-gray-700 text-sm font-medium">
            &larr; Back
          </Link>
          <div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 w-fit">
              <Bot className="w-3 h-3" /> Round 1 -- AI Learning
            </span>
            <h1 className="text-sm font-bold text-gray-900 mt-0.5">{concept!.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {savedIndicator && (
            <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full font-medium">
              + Progress saved
            </span>
          )}
          {mcqUnlocked && (
            <Link
              href={`/aptitude/${params.subjectId}/concept/${params.conceptId}/stage2`}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-bold text-xs rounded-xl transition-colors whitespace-nowrap"
            >
              <span className="flex items-center gap-1"><ClipboardList className="w-3 h-3" /> Take MCQ Test {'>'}</span>
            </Link>
          )}
        </div>
      </div>

      {/* Step Progress Bar */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            {[1, 2, 3, 4, 5].map((s, idx) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 border-2 transition-all ${
                    s <= stepsCompleted
                      ? 'bg-green-400 border-green-400 text-white'
                      : s === currentStep && !mcqUnlocked
                      ? 'bg-yellow-400 border-yellow-400 text-black'
                      : 'bg-gray-100 border-gray-200 text-gray-400'
                  }`}
                >
                  {s <= stepsCompleted ? '+' : s}
                </div>
                {idx < 4 && (
                  <div className={`flex-1 h-0.5 mx-1 rounded-full ${s < stepsCompleted ? 'bg-green-400' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
          <p className="text-xs font-bold text-gray-600">
            {mcqUnlocked
              ? '+ All 5 steps complete -- MCQ round unlocked!'
              : `Step ${currentStep} of 5: ${STEP_TITLES[currentStep - 1]}`}
          </p>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-3xl mx-auto w-full">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'ai' && (
                <div className="w-8 h-8 rounded-xl bg-yellow-400 flex items-center justify-center text-sm font-black text-black mr-2 shrink-0 mt-1">
                  C
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-yellow-400 text-black font-medium rounded-br-sm whitespace-pre-wrap'
                    : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'
                }`}
              >
                {msg.role === 'ai' ? (
                  <div>
                    <MarkdownRenderer text={msg.content} />
                    {streaming && i === messages.length - 1 && (
                      <span className="inline-block w-1.5 h-4 bg-yellow-400 ml-1 animate-pulse rounded-sm" />
                    )}
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Key Points banner */}
      <div className="bg-amber-50 border-t border-amber-100 px-4 py-2 flex items-center gap-2 overflow-x-auto">
        <span className="text-xs font-bold text-amber-700 shrink-0 flex items-center gap-1"><Pin className="w-3 h-3" /> Key Points:</span>
        {concept!.keyPoints.map(kp => (
          <span key={kp} className="text-xs text-amber-800 bg-white border border-amber-200 px-2 py-0.5 rounded-full shrink-0 font-medium">
            {kp}
          </span>
        ))}
      </div>

      {/* Quick reply chips */}
      {waitingForStudent && !streaming && (
        <div className="border-t border-gray-100 bg-amber-50/40 px-4 py-2">
          <div className="max-w-3xl mx-auto flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs text-amber-700 font-bold shrink-0 flex items-center gap-1"><Lightbulb className="w-3 h-3" /> Quick reply:</span>
            {[
              'Let me think...',
              "I'm not sure, can you explain more?",
              'I understand, please continue',
              'Can you give another example?',
            ].map(q => (
              <button
                key={q}
                type="button"
                onClick={() => { setInput(q); setTimeout(() => inputRef.current?.focus(), 50) }}
                className="text-xs text-amber-800 bg-white border border-amber-200 px-3 py-1.5 rounded-full whitespace-nowrap hover:bg-amber-100 transition-colors shrink-0 font-medium"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="bg-white border-t border-gray-100 p-4">
        <div className="max-w-3xl mx-auto flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder={
              waitingForStudent
                ? 'Type your answer to Cody\'s question...'
                : streaming
                ? 'Cody is explaining...'
                : mcqUnlocked
                ? 'All steps complete! Head to the MCQ test.'
                : 'Waiting for Cody...'
            }
            disabled={!waitingForStudent || streaming}
            rows={2}
            className="flex-1 resize-none px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50 disabled:bg-gray-50"
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!input.trim() || streaming || !waitingForStudent}
            className="px-4 py-3 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-black rounded-2xl transition-colors font-bold text-sm"
          >
            Send
          </button>
        </div>

        {/* MCQ unlock CTA */}
        {mcqUnlocked && (
          <div className="max-w-3xl mx-auto mt-3 flex items-center justify-between gap-3 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-bold text-purple-800 flex items-center gap-1"><PartyPopper className="w-4 h-4" /> All 5 steps complete!</p>
              <p className="text-xs text-purple-600 mt-0.5">You&apos;ve mastered the concept. Test yourself with the MCQ round!</p>
            </div>
            <Link
              href={`/aptitude/${params.subjectId}/concept/${params.conceptId}/stage2`}
              className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-purple-500 hover:bg-purple-600 text-white font-bold text-sm rounded-xl transition-colors"
            >
              <span className="flex items-center gap-1"><ClipboardList className="w-4 h-4" /> MCQ Test {'>'}</span>
            </Link>
          </div>
        )}

        {!mcqUnlocked && !streaming && !waitingForStudent && messages.length === 0 && (
          <p className="text-xs text-gray-400 text-center mt-2">Cody is preparing your explanation...</p>
        )}
        {!mcqUnlocked && streaming && (
          <p className="text-xs text-gray-400 text-center mt-2">Cody is explaining step {currentStep} of 5...</p>
        )}
        {!mcqUnlocked && waitingForStudent && !streaming && (
          <p className="text-xs text-amber-600 text-center mt-2 font-medium">
            Answer Cody&apos;s question above to proceed to step {stepsCompleted + 2 <= 5 ? stepsCompleted + 2 : 'final'}.
          </p>
        )}
      </div>
    </div>
  )
}
