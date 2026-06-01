import { useQuery } from '@tanstack/react-query'
import type { SignalCachePayload } from '../../worker/compute'

async function fetchWorkerSignals(symbol: string): Promise<SignalCachePayload> {
  const res = await fetch(`/api/signals/latest?symbol=${encodeURIComponent(symbol)}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<SignalCachePayload>
}

/**
 * Polls the worker's /api/signals/latest endpoint.
 * The worker updates the cache every 5 minutes (cron), so polling every 60s
 * is more than frequent enough while avoiding redundant Bybit fetches.
 */
export function useWorkerSignals(symbol: string, enabled = true) {
  return useQuery<SignalCachePayload, Error>({
    queryKey: ['workerSignals', symbol],
    queryFn: () => fetchWorkerSignals(symbol),
    refetchInterval: 60_000,
    staleTime: 55_000,
    retry: 2,
    enabled,
    placeholderData: (prev) => prev,
  })
}
