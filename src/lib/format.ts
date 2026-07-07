// ─── Centralized formatting utilities ────────────────────────────────────────
// Use these helpers everywhere instead of inline toLocaleString / toFixed calls
// so the app behaves consistently across locales and honours the user's UTC toggle.

const STORAGE_KEY = 'display-timezone'

export type DisplayTimezone = 'local' | 'utc'

export function getDisplayTimezone(): DisplayTimezone {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'utc' ? 'utc' : 'local'
  } catch {
    return 'local'
  }
}

export function setDisplayTimezone(tz: DisplayTimezone): void {
  try { localStorage.setItem(STORAGE_KEY, tz) } catch { /* private mode */ }
}

// ─── Price / number formatting ────────────────────────────────────────────────

const USD_FMT = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const USD_FMT_LARGE = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function formatPrice(value: number): string {
  if (value >= 1000) return USD_FMT_LARGE.format(value)
  return USD_FMT.format(value)
}

export function formatPercent(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

// ─── Date / time formatting ───────────────────────────────────────────────────

export function formatTimestamp(ms: number, tz?: DisplayTimezone): string {
  const displayTz = tz ?? getDisplayTimezone()
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: displayTz === 'utc' ? 'UTC' : undefined,
  }).format(new Date(ms))
}

export function formatTimestampFull(ms: number, tz?: DisplayTimezone): string {
  const displayTz = tz ?? getDisplayTimezone()
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: displayTz === 'utc' ? 'UTC' : undefined,
  }).format(new Date(ms))
}

export function timezoneLabel(tz?: DisplayTimezone): string {
  return (tz ?? getDisplayTimezone()) === 'utc' ? 'UTC' : Intl.DateTimeFormat().resolvedOptions().timeZone
}
