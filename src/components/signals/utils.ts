import type { SignalDirection } from '../../types/signals'

export function directionIcon(direction: SignalDirection): string {
  switch (direction) {
    case 'long': return '▲'
    case 'short': return '▼'
    default: return '●'
  }
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function formatConfidence(confidence: number): string {
  return `${(confidence * 100).toFixed(0)}%`
}
