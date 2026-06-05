'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { python } from '@codemirror/lang-python'
import { javascript } from '@codemirror/lang-javascript'
import { java } from '@codemirror/lang-java'
import { cpp } from '@codemirror/lang-cpp'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView, keymap } from '@codemirror/view'
import { indentWithTab } from '@codemirror/commands'

// Dynamic import to avoid SSR issues with CodeMirror
const CodeMirror = dynamic(() => import('@uiw/react-codemirror').then(m => m.default), {
  ssr: false,
  loading: () => (
    <div className="flex-1 bg-gray-950 p-4 text-gray-400 text-sm font-mono">Loading editor...</div>
  ),
})

interface CodeEditorProps {
  value: string
  onChange: (val: string) => void
  language?: string
  onRun?: () => void
  onSubmit?: () => void
  isRunning?: boolean
  isSubmitting?: boolean
  readOnly?: boolean
}

const LANGUAGES = ['Python', 'JavaScript', 'Java', 'C', 'C++']

function getLanguageExtension(lang: string) {
  switch (lang.toLowerCase()) {
    case 'python':  return python()
    case 'javascript': return javascript()
    case 'java':    return java()
    case 'c':
    case 'c++':
    case 'cpp':     return cpp()
    default:        return python()
  }
}

export function CodeEditor({
  value,
  onChange,
  language = 'Python',
  onRun,
  onSubmit,
  isRunning,
  isSubmitting,
  readOnly,
}: CodeEditorProps) {
  const [selectedLang, setSelectedLang] = useState(language)

  const extensions = [
    getLanguageExtension(selectedLang),
    keymap.of([indentWithTab]),
    EditorView.lineWrapping,
    EditorView.theme({
      '&': { height: '100%' },
      '.cm-scroller': { overflow: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '13px', lineHeight: '1.75' },
      '.cm-content': { padding: '16px 0' },
      '.cm-line': { padding: '0 16px' },
    }),
  ]

  const handleChange = useCallback((val: string) => {
    if (!readOnly) onChange(val)
  }, [readOnly, onChange])

  const lineCount = value.split('\n').length
  const charCount = value.length

  return (
    <div className="flex flex-col h-full bg-gray-950 rounded-xl overflow-hidden border border-gray-800">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <select
            title="Select programming language"
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
            className="ml-3 bg-gray-800 text-gray-300 text-xs rounded-md px-2 py-1 border border-gray-700 focus:outline-none focus:border-yellow-500"
          >
            {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1"
          >
            Clear
          </button>
          {onRun && (
            <button
              type="button"
              onClick={onRun}
              disabled={isRunning}
              className="text-xs font-semibold px-4 py-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isRunning ? (
                <><span className="w-3 h-3 rounded-full border-2 border-gray-400 border-t-white animate-spin" /> Running...</>
              ) : (
                <><span>{'>'}</span> Run</>
              )}
            </button>
          )}
          {onSubmit && (
            <button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
              className="text-xs font-semibold px-4 py-1.5 rounded-md bg-yellow-500 hover:bg-yellow-400 text-black transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          )}
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-hidden">
        <CodeMirror
          value={value}
          onChange={handleChange}
          extensions={extensions}
          theme={oneDark}
          readOnly={readOnly}
          height="100%"
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightSpecialChars: true,
            foldGutter: false,
            dropCursor: false,
            allowMultipleSelections: false,
            indentOnInput: true,
            syntaxHighlighting: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: false,
            crosshairCursor: false,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            defaultKeymap: true,
            searchKeymap: false,
            historyKeymap: true,
            foldKeymap: false,
            completionKeymap: true,
            lintKeymap: false,
          }}
        />
      </div>

      {/* Footer */}
      <div className="px-4 py-1.5 bg-gray-900 border-t border-gray-800 flex items-center justify-between shrink-0">
        <span className="text-xs text-gray-600">{lineCount} lines . {charCount} chars</span>
        <span className="text-xs text-gray-600">Tab to indent . Ctrl+Z to undo</span>
      </div>
    </div>
  )
}
