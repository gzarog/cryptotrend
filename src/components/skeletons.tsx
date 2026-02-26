import { Skeleton } from './ui/skeleton'

export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div className="glass-panel p-4" style={{ height }}>
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className="h-full w-full rounded-md" />
    </div>
  )
}

export function SignalCardSkeleton() {
  return (
    <div className="glass-panel p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-14 rounded" />
        <Skeleton className="h-6 w-14 rounded" />
        <Skeleton className="h-6 w-14 rounded" />
      </div>
    </div>
  )
}

export function IndicatorCardSkeleton() {
  return (
    <div className="glass-panel p-3 space-y-2">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  )
}
