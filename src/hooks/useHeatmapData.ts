import { useQuery } from '@tanstack/react-query'
import type { HeatmapResult } from '../types/heatmap'
import { fetchHeatmapData } from '../lib/heatmap'

export function useHeatmapData(enabled: boolean = true, refreshInterval: number = 60000) {
  return useQuery<HeatmapResult>({
    queryKey: ['heatmap-data'],
    queryFn: fetchHeatmapData,
    refetchInterval: refreshInterval,
    refetchIntervalInBackground: false,
    retry: 0,
    enabled,
    placeholderData: (prev) => prev,
  })
}
