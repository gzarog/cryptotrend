import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { MainLayout } from '../layouts/MainLayout'
import { ControlBar } from '../components/ControlBar'
import { DashboardView } from '../components/DashboardView'
import { NotificationDialog } from '../components/NotificationDialog'
import { useMarketData, useMultiFrameMarketData } from '../hooks/useMarketData'
import { calculateRSI, calculateEMA, calculateSMA, calculateStochasticRSI, calculateMACD, calculateADX, calculateATR } from '../lib/indicators'
import { deriveCombinedSignal, deriveTimeframeSnapshots, getQualifiedSignals, deriveTrendBias, calculateMarkovPrior, calculateMultiTimeframeMarkovPriors } from '../lib/signals'
import { createNotificationId, showBrowserNotification } from '../lib/notifications'
import type { MomentumNotification, MovingAverageCrossNotification, MomentumComputation } from '../types/app'
import type { TimeframeSignalSnapshot } from '../types/signals'

// ─── Timeframe-Adaptive Settings ────────────────────────────────────────────

const RSI_SETTINGS: Record<string, { period: number; label: string }> = {
  '5': { period: 8, label: '7–9' },
  '15': { period: 11, label: '9–12' },
  '30': { period: 13, label: '12–14' },
  '60': { period: 15, label: '14–16' },
  '120': { period: 17, label: '16–18' },
  '240': { period: 20, label: '18–21' },
  '360': { period: 23, label: '21–24' },
}
const DEFAULT_RSI = { period: 14, label: '14' }

const STOCH_SETTINGS: Record<string, { rsiLength: number; stochLength: number; kSmoothing: number; dSmoothing: number }> = {
  '5': { rsiLength: 7, stochLength: 7, kSmoothing: 2, dSmoothing: 2 },
  '15': { rsiLength: 9, stochLength: 9, kSmoothing: 2, dSmoothing: 3 },
  '30': { rsiLength: 12, stochLength: 12, kSmoothing: 3, dSmoothing: 3 },
  '60': { rsiLength: 14, stochLength: 14, kSmoothing: 3, dSmoothing: 3 },
  '120': { rsiLength: 16, stochLength: 16, kSmoothing: 3, dSmoothing: 3 },
  '240': { rsiLength: 21, stochLength: 21, kSmoothing: 4, dSmoothing: 4 },
  '360': { rsiLength: 24, stochLength: 24, kSmoothing: 4, dSmoothing: 4 },
}
const DEFAULT_STOCH = { rsiLength: 14, stochLength: 14, kSmoothing: 3, dSmoothing: 3 }

const MACD_SETTINGS: Record<string, { fast: number; slow: number; signal: number }> = {
  '5': { fast: 8, slow: 21, signal: 5 },
  '15': { fast: 10, slow: 24, signal: 7 },
  '30': { fast: 12, slow: 26, signal: 9 },
  '60': { fast: 12, slow: 30, signal: 9 },
  '120': { fast: 16, slow: 36, signal: 9 },
  '240': { fast: 20, slow: 40, signal: 9 },
  '360': { fast: 22, slow: 44, signal: 10 },
}
const DEFAULT_MACD = { fast: 12, slow: 26, signal: 9 }

const MULTI_TF_LIST = ['5', '15', '30', '60', '120', '240', '360']

const TF_LABELS: Record<string, string> = {
  '5': '5m', '15': '15m', '30': '30m', '60': '1H',
  '120': '2H', '240': '4H', '360': '6H', 'D': '1D', 'W': '1W',
}

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
})

const LAST_REFRESH_FORMATTER = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit', minute: '2-digit', second: '2-digit',
})

// ─── MA Cross Detection ─────────────────────────────────────────────────────

function detectMACross(
  ema10: Array<number | null>,
  ema50: Array<number | null>,
  prevCrossState: 'golden' | 'death' | null
): { direction: 'golden' | 'death'; index: number } | null {
  if (ema10.length < 2 || ema50.length < 2) return null

  const len = ema10.length
  const curr10 = ema10[len - 1]
  const curr50 = ema50[len - 1]
  const prev10 = ema10[len - 2]
  const prev50 = ema50[len - 2]

  if (curr10 === null || curr50 === null || prev10 === null || prev50 === null) return null

  if (prev10 <= prev50 && curr10 > curr50 && prevCrossState !== 'golden') {
    return { direction: 'golden', index: len - 1 }
  }
  if (prev10 >= prev50 && curr10 < curr50 && prevCrossState !== 'death') {
    return { direction: 'death', index: len - 1 }
  }

  return null
}

// ─── Momentum Detection ─────────────────────────────────────────────────────

function detectMomentum(
  rsi: number | null,
  stochD: number | null,
  timeframe: string,
  timeframeLabel: string
): { direction: 'long' | 'short'; intensity: MomentumNotification['intensity'] } | null {
  if (rsi === null || stochD === null) return null

  // Strong long: RSI < 25 and StochD < 15
  if (rsi < 25 && stochD < 15) return { direction: 'long', intensity: 'green' }
  // Moderate long: RSI < 35 and StochD < 25
  if (rsi < 35 && stochD < 25) return { direction: 'long', intensity: 'yellow' }
  // Strong short: RSI > 75 and StochD > 85
  if (rsi > 75 && stochD > 85) return { direction: 'short', intensity: 'orange' }
  // Extreme short: RSI > 85 and StochD > 90
  if (rsi > 85 && stochD > 90) return { direction: 'short', intensity: 'red' }

  return null
}

// ─── Component ──────────────────────────────────────────────────────────────

const Index = () => {
  const [symbol, setSymbol] = useState(() => localStorage.getItem('selected-symbol') || 'BTCUSDT')
  const handleSymbolChange = useCallback((s: string) => {
    setSymbol(s)
    localStorage.setItem('selected-symbol', s)
  }, [])
  const [timeframe, setTimeframe] = useState('15')
  const [refreshSelection, setRefreshSelection] = useState('1')
  const [barLimit, setBarLimit] = useState(400)
  const [showNotifDialog, setShowNotifDialog] = useState(false)
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [readNotifIds, setReadNotifIds] = useState<Set<string>>(new Set())
  // Notification state
  const [momentumNotifications, setMomentumNotifications] = useState<MomentumNotification[]>([])
  const [crossNotifications, setCrossNotifications] = useState<MovingAverageCrossNotification[]>([])
  const prevCrossRef = useRef<'golden' | 'death' | null>(null)

  const refreshInterval = parseFloat(refreshSelection) * 60 * 1000

  // Primary timeframe data
  const { data: candles, isLoading, isError, error, isFetching, refetch } = useMarketData(
    symbol, timeframe, barLimit, refreshInterval, true
  )

  // Multi-timeframe data for signals
  const multiFrameResults = useMultiFrameMarketData(
    symbol, MULTI_TF_LIST, Math.min(barLimit, 200), refreshInterval, true
  )

  const lastUpdated = useMemo(() => {
    if (!candles?.length) return ''
    return LAST_REFRESH_FORMATTER.format(new Date())
  }, [candles])

  const closes = useMemo(() => candles?.map(c => c.close) ?? [], [candles])
  const labels = useMemo(() => candles?.map(c => DATE_FORMATTER.format(new Date(c.openTime))) ?? [], [candles])

  const latestCandle = candles?.[candles.length - 1] ?? null
  const firstCandle = candles?.[0] ?? null

  const priceChange = useMemo(() => {
    if (!latestCandle || !firstCandle) return null
    const diff = latestCandle.close - firstCandle.open
    return { difference: diff, percent: (diff / firstCandle.open) * 100 }
  }, [latestCandle, firstCandle])

  // ─── Primary Timeframe Indicators ─────────────────────────────────────────

  const rsiSetting = RSI_SETTINGS[timeframe] ?? DEFAULT_RSI
  const rsiValues = useMemo(() => calculateRSI(closes, rsiSetting.period), [closes, rsiSetting.period])

  const stochSetting = STOCH_SETTINGS[timeframe] ?? DEFAULT_STOCH
  const stochastic = useMemo(
    () => calculateStochasticRSI(closes, stochSetting.rsiLength, stochSetting.stochLength, stochSetting.kSmoothing, stochSetting.dSmoothing),
    [closes, stochSetting]
  )

  const macdSetting = MACD_SETTINGS[timeframe] ?? DEFAULT_MACD
  const macd = useMemo(
    () => calculateMACD(closes, macdSetting.fast, macdSetting.slow, macdSetting.signal),
    [closes, macdSetting]
  )

  const ema10 = useMemo(() => calculateEMA(closes, 10), [closes])
  const ema50 = useMemo(() => calculateEMA(closes, 50), [closes])
  const ma200 = useMemo(() => calculateSMA(closes, 200), [closes])

  const adxResult = useMemo(() => candles ? calculateADX(candles, 14) : { adx: [], diPlus: [], diMinus: [] }, [candles])
  const atrValues = useMemo(() => candles ? calculateATR(candles, 14) : [], [candles])

  const latestRSI = rsiValues[rsiValues.length - 1] ?? null
  const latestStochK = stochastic.kValues[stochastic.kValues.length - 1] ?? null
  const latestStochD = stochastic.dValues[stochastic.dValues.length - 1] ?? null
  const latestMACDLine = macd.macdLine[macd.macdLine.length - 1] ?? null
  const latestMACDSignal = macd.signalLine[macd.signalLine.length - 1] ?? null
  const latestMACDHist = macd.histogram[macd.histogram.length - 1] ?? null
  const latestADX = adxResult.adx[adxResult.adx.length - 1] ?? null
  const latestATR = atrValues[atrValues.length - 1] ?? null

  // ─── Multi-Timeframe Computations ─────────────────────────────────────────

  const computations = useMemo<MomentumComputation[]>(() => {
    return multiFrameResults
      .filter(r => r.candles.length > 0)
      .map(r => {
        const c = r.candles.map(x => x.close)
        const tfRsiSetting = RSI_SETTINGS[r.timeframe] ?? DEFAULT_RSI
        const tfStochSetting = STOCH_SETTINGS[r.timeframe] ?? DEFAULT_STOCH
        const tfMacdSetting = MACD_SETTINGS[r.timeframe] ?? DEFAULT_MACD

        const tfRsi = calculateRSI(c, tfRsiSetting.period)
        const tfStoch = calculateStochasticRSI(c, tfStochSetting.rsiLength, tfStochSetting.stochLength, tfStochSetting.kSmoothing, tfStochSetting.dSmoothing)
        const tfMacd = calculateMACD(c, tfMacdSetting.fast, tfMacdSetting.slow, tfMacdSetting.signal)
        const tfEma10 = calculateEMA(c, 10)
        const tfEma50 = calculateEMA(c, 50)
        const tfSma200 = calculateSMA(c, 200)
        const tfAdx = calculateADX(r.candles, 14)
        const tfAtr = calculateATR(r.candles, 14)

        return {
          symbol,
          timeframe: r.timeframe,
          timeframeLabel: TF_LABELS[r.timeframe] ?? r.timeframe,
          rsi: tfRsi[tfRsi.length - 1] ?? null,
          stochK: tfStoch.kValues[tfStoch.kValues.length - 1] ?? null,
          stochD: tfStoch.dValues[tfStoch.dValues.length - 1] ?? null,
          macdLine: tfMacd.macdLine[tfMacd.macdLine.length - 1] ?? null,
          macdSignal: tfMacd.signalLine[tfMacd.signalLine.length - 1] ?? null,
          macdHistogram: tfMacd.histogram[tfMacd.histogram.length - 1] ?? null,
          ema10: tfEma10[tfEma10.length - 1] ?? null,
          ema50: tfEma50[tfEma50.length - 1] ?? null,
          sma200: tfSma200[tfSma200.length - 1] ?? null,
          adx: tfAdx.adx[tfAdx.adx.length - 1] ?? null,
          atr: tfAtr[tfAtr.length - 1] ?? null,
          close: c[c.length - 1] ?? null,
          volume: r.candles[r.candles.length - 1]?.volume ?? null,
          candles: r.candles,
        }
      })
  }, [multiFrameResults, symbol])

  // ─── Markov Priors ────────────────────────────────────────────────────────

  const markovPriors = useMemo(() => {
    const candlesByTf: Record<string, typeof candles & {}> = {}
    for (const r of multiFrameResults) {
      if (r.candles.length > 0) candlesByTf[r.timeframe] = r.candles
    }
    return calculateMultiTimeframeMarkovPriors(candlesByTf)
  }, [multiFrameResults])

  // ─── Signal Derivation ────────────────────────────────────────────────────

  const snapshots = useMemo<TimeframeSignalSnapshot[]>(
    () => deriveTimeframeSnapshots(computations, markovPriors),
    [computations, markovPriors]
  )

  const qualifiedSignals = useMemo(() => getQualifiedSignals(snapshots), [snapshots])


  // ─── MA Cross Detection ───────────────────────────────────────────────────

  useEffect(() => {
    const cross = detectMACross(ema10, ema50, prevCrossRef.current)
    if (cross && latestCandle) {
      prevCrossRef.current = cross.direction
      const notif: MovingAverageCrossNotification = {
        id: createNotificationId(),
        symbol,
        timeframe,
        timeframeLabel: TF_LABELS[timeframe] ?? timeframe,
        pairLabel: 'EMA 10 / EMA 50',
        direction: cross.direction,
        intensity: cross.direction === 'golden' ? 'green' : 'yellow',
        price: latestCandle.close,
        triggeredAt: Date.now(),
      }
      setCrossNotifications(prev => [notif, ...prev].slice(0, 10))
      showBrowserNotification(
        `${cross.direction === 'golden' ? '🟡 Golden' : '🟣 Death'} Cross — ${symbol}`,
        `EMA 10/50 ${cross.direction} cross at $${latestCandle.close.toLocaleString()}`
      )
    }
  }, [ema10, ema50, symbol, timeframe, latestCandle])

  // ─── Momentum Detection ───────────────────────────────────────────────────

  useEffect(() => {
    const momentum = detectMomentum(latestRSI, latestStochD, timeframe, TF_LABELS[timeframe] ?? timeframe)
    if (momentum) {
      const notif: MomentumNotification = {
        id: createNotificationId(),
        symbol,
        direction: momentum.direction,
        intensity: momentum.intensity,
        label: `${momentum.direction === 'long' ? '🟢' : '🔴'} ${momentum.direction.toUpperCase()} Momentum`,
        timeframeSummary: TF_LABELS[timeframe] ?? timeframe,
        rsiSummary: latestRSI?.toFixed(1) ?? '—',
        stochasticSummary: latestStochD?.toFixed(1) ?? '—',
        readings: [],
        triggeredAt: Date.now(),
      }
      setMomentumNotifications(prev => {
        // Dedupe by direction within 60s
        const recent = prev.filter(p => Date.now() - p.triggeredAt < 60000 && p.direction === momentum.direction)
        if (recent.length > 0) return prev
        showBrowserNotification(
          `${momentum.direction === 'long' ? '🟢' : '🔴'} ${momentum.direction.toUpperCase()} Momentum — ${symbol}`,
          `RSI: ${latestRSI?.toFixed(1) ?? '—'} | Stoch D: ${latestStochD?.toFixed(1) ?? '—'} (${TF_LABELS[timeframe] ?? timeframe})`
        )
        return [notif, ...prev].slice(0, 10)
      })
    }
  }, [latestRSI, latestStochD, symbol, timeframe])

  // Reset detection refs on symbol change (keep notification history)
  useEffect(() => {
    prevCrossRef.current = null
  }, [symbol])

  const allNotifIds = useMemo(() => {
    const ids: string[] = []
    for (const n of momentumNotifications) ids.push(n.id)
    for (const n of crossNotifications) ids.push(n.id)
    return ids
  }, [momentumNotifications, crossNotifications])

  const unreadCount = useMemo(
    () => allNotifIds.filter(id => !readNotifIds.has(id)).length,
    [allNotifIds, readNotifIds]
  )

  const handleMarkRead = useCallback((id: string) => {
    setReadNotifIds(prev => new Set([...prev, id]))
  }, [])

  const handleMarkAllRead = useCallback(() => {
    setReadNotifIds(new Set(allNotifIds))
  }, [allNotifIds])

  const handleClearAll = useCallback(() => {
    setMomentumNotifications([])
    setCrossNotifications([])
    setReadNotifIds(new Set())
  }, [])

  return (
    <MainLayout
      onNotificationClick={() => setShowNotifDialog(true)}
      showNotifPanel={showNotifPanel}
      onToggleNotifPanel={() => setShowNotifPanel(prev => !prev)}
      onCloseNotifPanel={() => setShowNotifPanel(false)}
      momentumNotifications={momentumNotifications}
      crossNotifications={crossNotifications}
      readNotifIds={readNotifIds}
      onMarkRead={handleMarkRead}
      onMarkAllRead={handleMarkAllRead}
      onClearAllNotifs={handleClearAll}
      unreadCount={unreadCount}
    >
      <ControlBar
        symbol={symbol}
        onSymbolChange={handleSymbolChange}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        refreshSelection={refreshSelection}
        onRefreshSelectionChange={setRefreshSelection}
        barLimit={barLimit}
        onBarLimitChange={setBarLimit}
        isFetching={isFetching}
        onManualRefresh={() => refetch()}
        lastUpdated={lastUpdated}
      />

      <DashboardView
        symbol={symbol}
        candles={candles ?? []}
        labels={labels}
        closes={closes}
        isLoading={isLoading}
        price={latestCandle?.close ?? null}
        priceChange={priceChange}
        rsi={rsiValues}
        rsiPeriod={rsiSetting.period}
        stochK={stochastic.kValues}
        stochD={stochastic.dValues}
        macdLine={macd.macdLine}
        macdSignal={macd.signalLine}
        macdHistogram={macd.histogram}
        macdSettings={macdSetting}
        ema10={ema10}
        ema50={ema50}
        ma200={ma200}
        latestRSI={latestRSI}
        latestStochK={latestStochK}
        latestStochD={latestStochD}
        latestMACDLine={latestMACDLine}
        latestMACDSignal={latestMACDSignal}
        latestMACDHist={latestMACDHist}
        momentumNotifications={momentumNotifications}
        crossNotifications={crossNotifications}
        snapshots={snapshots}
        qualifiedSignals={qualifiedSignals}
      />

      {isError && (
        <div className="glass-panel p-4 border border-destructive/40 bg-destructive/10 text-center">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : 'Failed to load market data'}
          </p>
        </div>
      )}

      <NotificationDialog open={showNotifDialog} onClose={() => setShowNotifDialog(false)} />
    </MainLayout>
  )
}

export default Index
