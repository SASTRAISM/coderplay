'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface ProctoringState {
  violations: number
  isFullscreen: boolean
}

export interface ProctoringOptions {
  enabled?: boolean
  onAutoSubmit?: () => void
  onBackAttempt?: () => void
  requireFullscreen?: boolean
}

export function useProctoring(options: ProctoringOptions = {}) {
  const {
    enabled = true,
    onAutoSubmit,
    onBackAttempt,
    requireFullscreen = true,
  } = options

  const violationsRef = useRef(0)
  const terminatedRef = useRef(false)
  const lastViolationAtRef = useRef(0)
  const autoSubmitRef = useRef(onAutoSubmit)
  useEffect(() => { autoSubmitRef.current = onAutoSubmit }, [onAutoSubmit])
  const backAttemptRef = useRef(onBackAttempt)
  useEffect(() => { backAttemptRef.current = onBackAttempt }, [onBackAttempt])

  const [violations, setViolations] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Only tab-switch triggers a violation. Everything else is silently blocked.
  const recordViolation = useCallback(() => {
    if (terminatedRef.current) return

    const now = Date.now()
    if (now - lastViolationAtRef.current < 1200) return
    lastViolationAtRef.current = now

    const count = violationsRef.current + 1
    violationsRef.current = count
    setViolations(Math.min(count, 2))

    if (count >= 2) {
      terminatedRef.current = true
      // Remove beforeunload before navigating so browser doesn't show "Leave site?"
      window.onbeforeunload = null
      autoSubmitRef.current?.()
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    // Back button: push dummy state then handle attempt
    window.history.pushState(null, '', window.location.href)
    const onPopState = () => {
      window.history.pushState(null, '', window.location.href)
      if (backAttemptRef.current) {
        backAttemptRef.current()
        return
      }
      // Back button = tab-switch-level violation
      recordViolation()
    }
    window.addEventListener('popstate', onPopState)

    // Prevent accidental tab close -- but skip once terminated so redirect works
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (terminatedRef.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)

    // -- ONLY violation trigger: tab / window switch --------------------------
    const onVisibility = () => {
      if (document.hidden) recordViolation()
    }
    document.addEventListener('visibilitychange', onVisibility)

    // -- Silent key blocking -- NO violation, NO popup -------------------------
    const onKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey

      // Copy / paste / cut -- silently block
      if (ctrl) {
        const lk = e.key.toLowerCase()
        if (lk === 'c' || lk === 'v' || lk === 'x' || lk === 'u') {
          e.preventDefault()
        }
        // DevTools shortcuts (Ctrl+Shift+I/J/C) -- silently block
        if (e.shiftKey && (lk === 'i' || lk === 'j' || lk === 'c')) {
          e.preventDefault()
        }
        return
      }

      // ESC -- block silently (prevents fullscreen exit at OS level where possible)
      if (e.key === 'Escape') {
        e.preventDefault()
        return
      }

      // All F-keys (F1-F12 including DevTools F12) -- block silently
      if (e.key.startsWith('F') && e.key.length <= 3 && !isNaN(Number(e.key.slice(1)))) {
        e.preventDefault()
        return
      }
    }
    document.addEventListener('keydown', onKeyDown, true)

    // Clipboard -- silently block
    const noClip = (e: ClipboardEvent) => e.preventDefault()
    document.addEventListener('copy', noClip)
    document.addEventListener('paste', noClip)
    document.addEventListener('cut', noClip)

    // Context menu + drag -- silently block
    const noCtx = (e: MouseEvent) => e.preventDefault()
    document.addEventListener('contextmenu', noCtx)
    const noDrag = (e: DragEvent) => e.preventDefault()
    document.addEventListener('dragstart', noDrag)
    document.addEventListener('drop', noDrag)

    // Fullscreen tracking -- only update state, no violation on exit
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onFsChange)

    return () => {
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('copy', noClip)
      document.removeEventListener('paste', noClip)
      document.removeEventListener('cut', noClip)
      document.removeEventListener('contextmenu', noCtx)
      document.removeEventListener('dragstart', noDrag)
      document.removeEventListener('drop', noDrag)
      document.removeEventListener('fullscreenchange', onFsChange)
    }
  }, [enabled, recordViolation])

  const enterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } catch { /* some browsers block */ }
  }, [])

  const exitFullscreen = useCallback(async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen() } catch { /* ignore */ }
  }, [])

  return {
    violations,
    isFullscreen,
    isTerminated: terminatedRef.current,
    enterFullscreen,
    exitFullscreen,
  }
}
