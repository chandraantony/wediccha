import { useEffect, useRef, useState } from 'react'

function createResponseId() {
  if (typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID()

  const bytes = window.crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

async function requestResponses(path, options = {}) {
  const response = await fetch(path, options)
  const data = await response.json()

  if (!response.ok || data.ok === false) {
    throw new Error('Tanggapan belum tersimpan. Silakan coba kembali.')
  }

  return { counts: data.counts, wishes: data.wishes }
}

export default function useGuestResponses({ enabled, guestName }) {
  const [responses, setResponses] = useState({ counts: null, wishes: [] })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const rsvpIds = useRef(new Map())
  const pendingWish = useRef(null)
  const pendingWrites = useRef(0)
  const revision = useRef(0)
  const writeQueue = useRef(Promise.resolve())

  useEffect(() => {
    if (!enabled) return

    let active = true
    const controller = new AbortController()
    let refreshing = false

    const refresh = async () => {
      if (refreshing || pendingWrites.current || document.hidden) return
      refreshing = true
      const currentRevision = revision.current

      try {
        const snapshot = await requestResponses('/api/guest-responses', {
          signal: controller.signal,
          cache: 'no-store',
        })

        if (active && currentRevision === revision.current) {
          setResponses(snapshot)
          setLoadError('')
        }
      } catch (error) {
        if (active && error.name !== 'AbortError' && currentRevision === revision.current) {
          setLoadError('Konfirmasi dan ucapan belum dapat dimuat. Silakan coba kembali nanti.')
        }
      } finally {
        refreshing = false
        if (active) setLoading(false)
      }
    }

    refresh()
    const interval = window.setInterval(refresh, 30000)
    document.addEventListener('visibilitychange', refresh)

    return () => {
      active = false
      controller.abort()
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [enabled])

  const saveResponse = (path, payload) => {
    pendingWrites.current += 1
    revision.current += 1

    const operation = writeQueue.current.then(async () => {
      const snapshot = await requestResponses(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      setResponses(snapshot)
      setLoading(false)
      setLoadError('')
      return { ok: true }
    })

    const settledOperation = operation.finally(() => {
      pendingWrites.current -= 1
    })
    writeQueue.current = settledOperation.catch(() => {})
    return settledOperation
  }

  const submitRsvp = (payload) => {
    const identity = (guestName || payload.name).trim().toLowerCase()
    const storageKey = `ice-chandra-rsvp:${identity}`
    if (!rsvpIds.current.has(storageKey)) {
      let id
      try {
        const savedId = window.localStorage.getItem(storageKey)
        id = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(savedId || '')
          ? savedId
          : createResponseId()
        window.localStorage.setItem(storageKey, id)
      } catch {
        id ||= createResponseId()
      }
      rsvpIds.current.set(storageKey, id)
    }

    return saveResponse('/api/rsvps', { ...payload, id: rsvpIds.current.get(storageKey) })
  }

  const submitWish = async (payload) => {
    const key = JSON.stringify(payload)
    if (pendingWish.current?.key !== key) {
      pendingWish.current = { key, id: createResponseId() }
    }

    const result = await saveResponse('/api/wishes', {
      ...payload,
      id: pendingWish.current.id,
    })
    pendingWish.current = null
    return result
  }

  return { ...responses, loading, loadError, submitRsvp, submitWish }
}
