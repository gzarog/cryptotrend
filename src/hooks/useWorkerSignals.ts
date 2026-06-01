import { useQuery } from '@tanstack/react-query'
import type { TimeframeSignalSnapshot, MultiTimeframeConfluence } from '../types/signals'

export type WorkerSignalsPayload = {
  computedAt: number
  symbol: string
  snapshots: TimeframeSignalSnapshot[]
  confluence: MultiTimeframeConfluence
}

export function useWorkerSignals(symbol: string) {
  return useQuery<WorkerSignalsPayload | null>({
    queryKey: ['workerSignals', symbol],
    queryFn: async () => {
      const res = await fetch(`/api/signals/latest?symbol=${encodeURIComponent(symbol)}`)
      if (!res.ok) return null
      return res.json()
    },
    refetchInterval: 60_000,
    staleTime: 55_000,
    placeholderData: (prev) => prev ?? null,
  })
}
