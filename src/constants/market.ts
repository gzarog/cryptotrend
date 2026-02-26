export const TIMEFRAMES = [
  { value: '5', label: '5m' },
  { value: '15', label: '15m' },
  { value: '30', label: '30m' },
  { value: '60', label: '1H' },
  { value: '120', label: '2H' },
  { value: '240', label: '4H' },
  { value: '360', label: '6H' },
  { value: 'D', label: '1D' },
  { value: 'W', label: '1W' },
] as const

export const REFRESH_OPTIONS = [
  { value: '0.5', label: '30s' },
  { value: '1', label: '1m' },
  { value: '5', label: '5m' },
  { value: '15', label: '15m' },
  { value: '30', label: '30m' },
  { value: '60', label: '60m' },
] as const

export const SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'SOLUSDT',
  'XRPUSDT',
  'DOGEUSDT',
  'ADAUSDT',
  'AVAXUSDT',
  'DOTUSDT',
  'MATICUSDT',
  'LINKUSDT',
] as const
