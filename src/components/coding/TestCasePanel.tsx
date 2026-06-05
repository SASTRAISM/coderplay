'use client'

import { useState } from 'react'
import { Lock, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TestCase } from '@/types'

interface TestResult {
  input: string
  expectedOutput: string
  actualOutput?: string
  passed?: boolean
}

interface TestCasePanelProps {
  visibleTestCases: TestCase[]
  hiddenTestCount?: number
  testResults?: TestResult[]
  isRunning?: boolean
}

export function TestCasePanel({ visibleTestCases, hiddenTestCount = 0, testResults, isRunning }: TestCasePanelProps) {
  const [activeTab, setActiveTab] = useState<'cases' | 'results'>('cases')

  const passedCount = testResults?.filter((r) => r.passed).length ?? 0
  const totalVisible = visibleTestCases.length

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden h-full flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-gray-50/50">
        <button
          onClick={() => setActiveTab('cases')}
          className={cn(
            'px-4 py-3 text-xs font-semibold transition-colors border-b-2',
            activeTab === 'cases'
              ? 'border-yellow-500 text-yellow-700 bg-white'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          Test Cases ({totalVisible})
        </button>
        {testResults && (
          <button
            onClick={() => setActiveTab('results')}
            className={cn(
              'px-4 py-3 text-xs font-semibold transition-colors border-b-2 flex items-center gap-1.5',
              activeTab === 'results'
                ? 'border-yellow-500 text-yellow-700 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            Results
            <span className={cn(
              'text-xs font-bold px-1.5 py-0.5 rounded-full',
              passedCount === totalVisible ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            )}>
              {passedCount}/{totalVisible}
            </span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isRunning ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin" />
            <p className="text-sm text-gray-500">Running test cases?</p>
          </div>
        ) : activeTab === 'cases' ? (
          <>
            {visibleTestCases.map((tc, i) => (
              <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-600">Test Case {i + 1}</span>
                </div>
                <div className="p-3 space-y-2">
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-1">Input</p>
                    <pre className="text-xs bg-gray-950 text-green-400 rounded-lg p-2 overflow-x-auto">{tc.input || '(no input)'}</pre>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-1">Expected Output</p>
                    <pre className="text-xs bg-gray-950 text-blue-400 rounded-lg p-2 overflow-x-auto">{tc.expectedOutput}</pre>
                  </div>
                  {tc.explanation && <p className="text-xs text-gray-400 italic">{tc.explanation}</p>}
                </div>
              </div>
            ))}
            {hiddenTestCount > 0 && (
              <div className="border border-dashed border-gray-200 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 flex items-center justify-center gap-1"><Lock className="w-3 h-3 inline-block align-middle" /> +{hiddenTestCount} hidden test cases</p>
                <p className="text-xs text-gray-300 mt-0.5">These run on submission only</p>
              </div>
            )}
          </>
        ) : (
          testResults?.map((r, i) => (
            <div
              key={i}
              className={cn(
                'border rounded-xl overflow-hidden',
                r.passed ? 'border-green-200' : 'border-red-200'
              )}
            >
              <div className={cn('px-3 py-1.5 border-b flex items-center gap-2', r.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200')}>
                <span>{r.passed ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-500" />}</span>
                <span className="text-xs font-semibold text-gray-700">Test Case {i + 1}</span>
                <span className={cn('text-xs ml-auto font-bold', r.passed ? 'text-green-600' : 'text-red-600')}>
                  {r.passed ? 'Passed' : 'Failed'}
                </span>
              </div>
              <div className="p-3 space-y-2">
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-1">Your Output</p>
                  <pre className={cn('text-xs rounded-lg p-2 overflow-x-auto', r.passed ? 'bg-green-950 text-green-300' : 'bg-red-950 text-red-300')}>
                    {r.actualOutput || '(no output)'}
                  </pre>
                </div>
                {!r.passed && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-1">Expected</p>
                    <pre className="text-xs bg-gray-950 text-blue-400 rounded-lg p-2 overflow-x-auto">{r.expectedOutput}</pre>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}