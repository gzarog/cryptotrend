import type { SignalDirection, SignalStrength } from '../../types/signals'
import { DIRECTION_BG, STRENGTH_LABELS } from './constants'

type BadgeProps = {
  direction: SignalDirection
  strength?: SignalStrength
  label?: string
  className?: string
}

export function SignalBadge({ direction, strength, label, className = '' }: BadgeProps) {
  const colorClass = DIRECTION_BG[direction]
  const text = label ?? (strength ? STRENGTH_LABELS[strength] : direction)

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass} ${className}`}>
      {text}
    </span>
  )
}
