'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  type QueryConstraint,
  type DocumentData,
  onSnapshot,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

// --- useDocument -------------------------------------------------------------

interface UseDocumentReturn<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useDocument<T = DocumentData>(
  collectionName: string,
  documentId: string | null
): UseDocumentReturn<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDocument = useCallback(async () => {
    if (!documentId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const ref = doc(db, collectionName, documentId)
      const snap = await getDoc(ref)
      if (snap.exists()) {
        setData({ id: snap.id, ...snap.data() } as T)
      } else {
        setData(null)
      }
    } catch (err) {
      setError('Failed to fetch document')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [collectionName, documentId])

  useEffect(() => {
    fetchDocument()
  }, [fetchDocument])

  return { data, loading, error, refetch: fetchDocument }
}

// --- useDocumentRealtime ------------------------------------------------------

export function useDocumentRealtime<T = DocumentData>(
  collectionName: string,
  documentId: string | null
): UseDocumentReturn<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!documentId) {
      setLoading(false)
      return
    }
    const ref = doc(db, collectionName, documentId)
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setData({ id: snap.id, ...snap.data() } as T)
        } else {
          setData(null)
        }
        setLoading(false)
      },
      (err) => {
        setError('Failed to subscribe to document')
        console.error(err)
        setLoading(false)
      }
    )
    return () => unsubscribe()
  }, [collectionName, documentId])

  return { data, loading, error, refetch: async () => {} }
}

// --- useCollection ------------------------------------------------------------

interface UseCollectionOptions {
  where?: [string, '==' | '!=' | '>' | '<' | '>=' | '<=', unknown][]
  orderBy?: [string, 'asc' | 'desc']
  limit?: number
}

interface UseCollectionReturn<T> {
  data: T[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCollection<T = DocumentData>(
  collectionName: string,
  options?: UseCollectionOptions
): UseCollectionReturn<T> {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCollection = useCallback(async () => {
    setLoading(true)
    try {
      const colRef = collection(db, collectionName)
      const constraints: QueryConstraint[] = []

      if (options?.where) {
        options.where.forEach(([field, op, val]) => {
          constraints.push(where(field, op, val))
        })
      }
      if (options?.orderBy) {
        constraints.push(orderBy(options.orderBy[0], options.orderBy[1]))
      }
      if (options?.limit) {
        constraints.push(limit(options.limit))
      }

      const q = constraints.length > 0 ? query(colRef, ...constraints) : query(colRef)
      const snap = await getDocs(q)
      setData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as T)))
    } catch (err) {
      setError('Failed to fetch collection')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [collectionName, options?.where, options?.orderBy, options?.limit])

  useEffect(() => {
    fetchCollection()
  }, [fetchCollection])

  return { data, loading, error, refetch: fetchCollection }
}

// --- useQuery ----------------------------------------------------------------

export function useQuery<T = DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[]
): UseCollectionReturn<T> {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchQuery = useCallback(async () => {
    setLoading(true)
    try {
      const colRef = collection(db, collectionName)
      const q = constraints.length > 0 ? query(colRef, ...constraints) : query(colRef)
      const snap = await getDocs(q)
      setData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as T)))
    } catch (err) {
      setError('Failed to execute query')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [collectionName])

  useEffect(() => {
    fetchQuery()
  }, [fetchQuery])

  return { data, loading, error, refetch: fetchQuery }
}
