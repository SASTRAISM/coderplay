'use client'

import { useState } from 'react'
import { collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore'
import { AlertTriangle } from 'lucide-react'
import { db } from '@/lib/firebase/config'

const KEEP_EMAIL = 'sastraism@gmail.com'

interface CleanupLog {
  type: 'info' | 'success' | 'error' | 'warn'
  message: string
}

export default function AdminCleanupPage() {
  const [logs, setLogs] = useState<CleanupLog[]>([])
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const log = (type: CleanupLog['type'], message: string) => {
    setLogs(prev => [...prev, { type, message }])
  }

  const runCleanup = async () => {
    setRunning(true)
    setLogs([])
    setDone(false)

    try {
      log('info', `Starting cleanup -- keeping only: ${KEEP_EMAIL}`)

      // Step 1: Get all users
      const usersSnap = await getDocs(collection(db, 'users'))
      const usersToDelete: { uid: string; email: string }[] = []

      usersSnap.forEach(docSnap => {
        const data = docSnap.data()
        if (data.email !== KEEP_EMAIL) {
          usersToDelete.push({ uid: docSnap.id, email: data.email || docSnap.id })
        }
      })

      log('info', `Found ${usersSnap.size} total users. ${usersToDelete.length} will be removed.`)

      // Step 2: Delete Firestore documents for each user
      const COLLECTIONS_TO_CLEAN = ['users', 'progress', 'streaks', 'achievements', 'chatSessions']

      for (const { uid, email } of usersToDelete) {
        log('info', `Processing: ${email} (${uid})`)

        for (const col of COLLECTIONS_TO_CLEAN) {
          try {
            await deleteDoc(doc(db, col, uid))
            log('success', `  + Deleted ${col}/${uid}`)
          } catch {
            log('warn', `  - No doc in ${col}/${uid} (skipped)`)
          }
        }

        // Delete any sub-collection docs (aptitudeResults, mockTestResults keyed by uid)
        try {
          const aptSnap = await getDocs(query(collection(db, 'aptitudeResults'), where('uid', '==', uid)))
          for (const d of aptSnap.docs) { await deleteDoc(d.ref) }
          if (aptSnap.size > 0) log('success', `  + Deleted ${aptSnap.size} aptitudeResults`)
        } catch { /* collection may not exist */ }

        try {
          const mockSnap = await getDocs(query(collection(db, 'mockTestResults'), where('uid', '==', uid)))
          for (const d of mockSnap.docs) { await deleteDoc(d.ref) }
          if (mockSnap.size > 0) log('success', `  + Deleted ${mockSnap.size} mockTestResults`)
        } catch { /* collection may not exist */ }

        try {
          const ptSnap = await getDocs(query(collection(db, 'placementTestSubmissions'), where('uid', '==', uid)))
          for (const d of ptSnap.docs) { await deleteDoc(d.ref) }
          if (ptSnap.size > 0) log('success', `  + Deleted ${ptSnap.size} placementTestSubmissions`)
        } catch { /* collection may not exist */ }
      }

      log('success', `[OK] Firestore cleanup complete! ${usersToDelete.length} users removed.`)
      log('warn', '[Note] Firebase Auth accounts were NOT deleted -- go to Firebase Console -> Authentication -> Users and manually delete them.')
      log('info', `Kept: ${KEEP_EMAIL}`)
      setDone(true)
    } catch (err) {
      log('error', `Fatal error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setRunning(false)
    }
  }

  const logColors: Record<CleanupLog['type'], string> = {
    info: 'text-gray-600',
    success: 'text-green-600 font-semibold',
    error: 'text-red-600 font-bold',
    warn: 'text-amber-600 font-semibold',
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Database Cleanup</h1>
        <p className="text-sm text-gray-500 mt-1">Remove all student accounts except the test account</p>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="shrink-0"><AlertTriangle className="w-6 h-6 text-red-600" /></div>
          <div>
            <p className="font-bold text-red-900 text-sm">DESTRUCTIVE OPERATION -- Cannot be undone</p>
            <p className="text-sm text-red-800 mt-1">
              This will permanently delete all Firestore data for every student EXCEPT{' '}
              <span className="font-mono bg-red-100 px-1 rounded">{KEEP_EMAIL}</span>.
              Firebase Auth accounts must be deleted separately from the Firebase Console.
            </p>
          </div>
        </div>
      </div>

      {!done && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
          <p className="text-sm font-semibold text-gray-700">
            Type <span className="font-mono bg-gray-100 px-1 rounded">DELETE ALL</span> to confirm:
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={e => {
              setConfirmText(e.target.value)
              setConfirmed(e.target.value === 'DELETE ALL')
            }}
            placeholder="Type DELETE ALL"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
          />
          <button
            type="button"
            onClick={runCleanup}
            disabled={!confirmed || running}
            className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {running ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Cleaning up...
              </span>
            ) : 'Run Cleanup'}
          </button>
        </div>
      )}

      {logs.length > 0 && (
        <div className="bg-gray-900 rounded-2xl p-5 overflow-auto max-h-96">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Output Log</p>
          <div className="space-y-1 font-mono text-xs">
            {logs.map((l, i) => (
              <p key={i} className={logColors[l.type]}>{l.message}</p>
            ))}
            {running && <p className="text-yellow-400 animate-pulse">Running...</p>}
          </div>
        </div>
      )}

      {done && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
          <p className="font-bold text-green-900">Cleanup complete!</p>
          <p className="text-sm text-green-800 mt-1">
            Remember to also delete Auth users from{' '}
            <a
              href="https://console.firebase.google.com/project/coderplay-72536/authentication/users"
              target="_blank"
              rel="noreferrer"
              className="underline font-semibold"
            >
              Firebase Console {'>'} Authentication
            </a>
          </p>
        </div>
      )}
    </div>
  )
}
