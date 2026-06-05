'use client'

import type { ClipboardEvent, DragEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'

type ClipboardAction = 'copy' | 'cut' | 'paste' | 'drop' | 'shortcut'

function getWarning(scopeLabel: string, action: ClipboardAction) {
  switch (action) {
    case 'copy':
      return `${scopeLabel} is in strict mode. Copy is disabled here. Learn it by doing it yourself.`
    case 'cut':
      return `${scopeLabel} is in strict mode. Cut is disabled here.`
    case 'paste':
      return `${scopeLabel} is in strict mode. Please type the answer yourself instead of pasting it.`
    case 'drop':
      return `${scopeLabel} is in strict mode. Drag and drop is disabled here.`
    default:
      return `${scopeLabel} is in strict mode. Copy, cut, and paste shortcuts are disabled here.`
  }
}

export function useStrictClipboardGuard(scopeLabel: string) {
  const [warning, setWarning] = useState('')

  useEffect(() => {
    if (!warning) return
    const timer = window.setTimeout(() => setWarning(''), 2800)
    return () => window.clearTimeout(timer)
  }, [warning])

  const blockAction = useCallback((event: { preventDefault: () => void; stopPropagation: () => void }, action: ClipboardAction) => {
    event.preventDefault()
    event.stopPropagation()
    setWarning(getWarning(scopeLabel, action))
  }, [scopeLabel])

  const guardProps = useMemo(() => ({
    onCopyCapture: (event: ClipboardEvent<HTMLElement>) => blockAction(event, 'copy'),
    onCutCapture: (event: ClipboardEvent<HTMLElement>) => blockAction(event, 'cut'),
    onPasteCapture: (event: ClipboardEvent<HTMLElement>) => blockAction(event, 'paste'),
    onDropCapture: (event: DragEvent<HTMLElement>) => blockAction(event, 'drop'),
    // NOTE: deliberately NOT blocking onKeyDownCapture here. The capture-phase
    // copy/cut/paste/drop handlers above already block clipboard shortcuts
    // safely. A keydown capture handler can interfere with normal typing in
    // child <textarea> elements (e.g. the code editor) -- keep this off.
  }), [blockAction])

  return {
    warning,
    guardProps,
  }
}