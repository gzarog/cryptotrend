import { useEffect, useRef, useState } from 'react'

type Status = 'checking' | 'online' | 'offline'

const POLL_INTERVAL_MS = 30_000
const TIMEOUT_MS = 5_000

export function WorkerHeartbeat() {
  const [status, setStatus] = useState<Status>('checking')
  const [latency, setLatency] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function ping() {
    const controller = new AbortController()
    const abort = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const t0 = Date.now()
    try {
      const res = await fetch('/api/push/status', { signal: controller.signal })
      clearTimeout(abort)
      if (res.ok) {
        setLatency(Date.now() - t0)
        setStatus('online')
      } else {
        setStatus('offline')
        setLatency(null)
      }
    } catch {
      clearTimeout(abort)
      setStatus('offline')
      setLatency(null)
    }
  }

  useEffect(() => {
    ping()
    timerRef.current = setInterval(ping, POLL_INTERVAL_MS)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const dot = {
    checking: 'bg-yellow-400 animate-pulse',
    online:   'bg-emerald-400',
    offline:  'bg-red-500',
  }[status]

  const label = {
    checking: 'Checking…',
    online:   `Worker online${latency !== null ? ` · ${latency}ms` : ''}`,
    offline:  'Worker offline',
  }[status]

  const ring = status === 'online'
    ? 'after:absolute after:inset-0 after:rounded-full after:bg-emerald-400 after:animate-ping after:opacity-60'
    : ''

  return (
    <div
      className="flex items-center gap-1.5 text-xs text-muted-foreground select-none"
      title={label}
    >
      <span className={`relative inline-flex h-2 w-2 ${ring}`}>
        <span className={`block h-2 w-2 rounded-full ${dot}`} />
      </span>
      <span className="hidden sm:inline">{label}</span>
    </div>
  )
}
