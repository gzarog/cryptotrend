import type { HeatmapResult, HeatmapSnapshot } from '../types/heatmap'

const HEATMAP_API_BASE = '/api/heatmap'

/**
 * Fetch heatmap data from the backend.
 * Since this is a frontend-only build, this will gracefully fail
 * and return null snapshots.
 */
export async function fetchHeatmapData(): Promise<HeatmapResult> {
  try {
    const response = await fetch(HEATMAP_API_BASE, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      return createEmptyResult()
    }

    const data = await response.json()
    return {
      current: data.current ?? null,
      previous: data.previous ?? null,
      delta: data.delta ?? null,
      fetchedAt: Date.now(),
      isStale: false,
    }
  } catch {
    // Expected to fail in frontend-only mode
    return createEmptyResult()
  }
}

function createEmptyResult(): HeatmapResult {
  return {
    current: null,
    previous: null,
    delta: null,
    fetchedAt: Date.now(),
    isStale: true,
  }
}

export function createMockHeatmapSnapshot(): HeatmapSnapshot {
  return {
    timestamp: Date.now(),
    coins: [],
    totalMarketCap: 0,
    totalVolume24h: 0,
    btcDominance: 0,
    ethDominance: 0,
    fearGreedIndex: null,
    fearGreedLabel: null,
  }
}
