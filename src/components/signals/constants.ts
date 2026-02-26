import type { SignalDirection, SignalStrength } from '../../types/signals'

export const DIRECTION_COLORS: Record<SignalDirection, string> = {
  long: 'hsl(var(--momentum-green))',
  short: 'hsl(var(--momentum-red, 0 84% 60%))',
  neutral: 'hsl(var(--muted-foreground))',
}

export const DIRECTION_BG: Record<SignalDirection, string> = {
  long: 'bg-green-500/20 text-green-400 border-green-500/30',
  short: 'bg-red-500/20 text-red-400 border-red-500/30',
  neutral: 'bg-muted/50 text-muted-foreground border-muted',
}

export const STRENGTH_LABELS: Record<SignalStrength, string> = {
  strong: 'Strong',
  moderate: 'Moderate',
  weak: 'Weak',
  none: '—',
}

export const TIMEFRAME_ORDER = ['5', '15', '30', '60', '120', '240', '360']
