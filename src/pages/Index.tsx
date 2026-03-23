import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { MainLayout } from '../layouts/MainLayout'
import { ControlBar } from '../components/ControlBar'
import { DashboardView } from '../components/DashboardView'
import { NotificationDialog } from '../components/NotificationDialog'
import { useMarketData, useMultiFrameMarketData, useTickerData, useOpenInterestData } from '../hooks/useMarketData'
import {
  calculateRSI, calculateEMA, calculateSMA, calculateStochasticRSI,
  calculateMACD, calculateADX, calculateATR,
  calculateBollingerBands, calculateSupertrend, calculateOBV, calculateVWAP,
  calculateVolatilityPercentile,
  calculateHurstExponent, calculateZScore, calculateLinearRegression,
  calculateKAMA, calculateAutocorrelation, detectVolumeSpikes,
  calculateOIDivergence,
} from '../lib/indicators'
import {
  deriveTimeframeSnapshots, getQualifiedSignals,
  calculateMultiTimeframeMarkovPriors,
  deriveMultiTimeframeConfluence, deriveDivergenceSignals,
} from '../lib/signals'
import { createNotificationId, showBrowserNotification, getCooldown, playNotificationSound, getTimeframePriority } from '../lib/notifications'
import { calculateRiskLevels } from '../lib/risk'
import { createInitialBayesianState, updateBayesianAccuracy } from '../lib/bayesian'
import type { BayesianState } from '../lib/bayesian'
import type { MomentumNotification, MovingAverageCrossNotification, MomentumComputation, SignalNotification, DivergenceNotification } from '../types/app'
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
): { direction: 'long' | 'short'; intensity: MomentumNotification['intensity'] } | null {
  if (rsi === null || stochD === null) return null

  if (rsi < 25 && stochD < 15) return { direction: 'long', intensity: 'green' }
  if (rsi < 35 && stochD < 25) return { direction: 'long', intensity: 'yellow' }
  if (rsi > 75 && stochD > 85) return { direction: 'short', intensity: 'orange' }
  if (rsi > 85 && stochD > 90) return { direction: 'short', intensity: 'red' }

  return null
}

// ─── localStorage Helpers ───────────────────────────────────────────────────

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : fallback
  } catch { return fallback }
}

function loadSetFromStorage(key: string): Set<string> {
  try {
    const stored = localStorage.getItem(key)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch { return new Set() }
}

// ─── Component ──────────────────────────────────────────────────────────────

const Index = () => {
  const [symbol, setSymbol] = useState(() => localStorage.getItem('selected-symbol') || 'BTCUSDT')
  const handleSymbolChange = useCallback((s: string) => {
    setSymbol(s)
    localStorage.setItem('selected-symbol', s)
  }, [])
  const [timeframe, setTimeframe] = useState(() => localStorage.getItem('selected-timeframe') || '15')
  const handleTimeframeChange = useCallback((t: string) => {
    setTimeframe(t)
    localStorage.setItem('selected-timeframe', t)
  }, [])
  const [refreshSelection, setRefreshSelection] = useState(() => localStorage.getItem('selected-refresh') || '1')
  const handleRefreshChange = useCallback((r: string) => {
    setRefreshSelection(r)
    localStorage.setItem('selected-refresh', r)
  }, [])
  const [barLimit, setBarLimit] = useState(400)
  const [showNotifDialog, setShowNotifDialog] = useState(false)
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [readNotifIds, setReadNotifIds] = useState<Set<string>>(() => loadSetFromStorage('read-notif-ids'))

  // Notification state — persist via localStorage
  const [momentumNotifications, setMomentumNotifications] = useState<MomentumNotification[]>(
    () => loadFromStorage('momentum-notifications', [])
  )
  const [crossNotifications, setCrossNotifications] = useState<MovingAverageCrossNotification[]>(
    () => loadFromStorage('cross-notifications', [])
  )
  const [signalNotifications, setSignalNotifications] = useState<SignalNotification[]>(
    () => loadFromStorage('signal-notifications', [])
  )
  const [divergenceNotifications, setDivergenceNotifications] = useState<DivergenceNotification[]>(
    () => loadFromStorage('divergence-notifications', [])
  )
  const prevCrossRef = useRef<Record<string, 'golden' | 'death' | null>>({})

  // Bayesian state for accuracy tracking
  const bayesianStateRef = useRef<BayesianState>(createInitialBayesianState())

  // Persist notifications to localStorage
  useEffect(() => {
    localStorage.setItem('momentum-notifications', JSON.stringify(momentumNotifications.slice(0, 50)))
  }, [momentumNotifications])
  useEffect(() => {
    localStorage.setItem('cross-notifications', JSON.stringify(crossNotifications.slice(0, 50)))
  }, [crossNotifications])
  useEffect(() => {
    localStorage.setItem('signal-notifications', JSON.stringify(signalNotifications.slice(0, 50)))
  }, [signalNotifications])
  useEffect(() => {
    localStorage.setItem('divergence-notifications', JSON.stringify(divergenceNotifications.slice(0, 50)))
  }, [divergenceNotifications])
  useEffect(() => {
    localStorage.setItem('read-notif-ids', JSON.stringify([...readNotifIds]))
  }, [readNotifIds])

  const refreshInterval = parseFloat(refreshSelection) * 60 * 1000

  // Primary timeframe data
  const { data: candles, isLoading, isError, error, isFetching, refetch } = useMarketData(
    symbol, timeframe, barLimit, refreshInterval, true
  )

  // Multi-timeframe data for signals
  const multiFrameResults = useMultiFrameMarketData(
    symbol, MULTI_TF_LIST, Math.min(barLimit, 200), refreshInterval, true
  )

  // Ticker data (funding rate, etc.)
  const { data: tickerData } = useTickerData(symbol, refreshInterval, true)

  // Open Interest data
  const { data: oiData } = useOpenInterestData(symbol, timeframe, refreshInterval, true)

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

  // Phase 1 primary indicators
  const bbResult = useMemo(() => calculateBollingerBands(closes, 20, 2), [closes])
  const stResult = useMemo(() => candles ? calculateSupertrend(candles, 10, 3) : { supertrend: [], direction: [] }, [candles])
  const obvValues = useMemo(() => candles ? calculateOBV(candles) : [], [candles])
  const obvEmaValues = useMemo(() => calculateEMA(obvValues, 20), [obvValues])
  const vwapValues = useMemo(() => candles ? calculateVWAP(candles) : [], [candles])

  // Phase 2 advanced indicators (primary TF)
  const hurstExponent = useMemo(() => calculateHurstExponent(closes), [closes])
  const zScoreValues = useMemo(() => calculateZScore(closes), [closes])
  const linRegResult = useMemo(() => calculateLinearRegression(closes), [closes])
  const kamaValues = useMemo(() => calculateKAMA(closes), [closes])
  const autocorrelation = useMemo(() => calculateAutocorrelation(closes), [closes])
  const volumeSpikes = useMemo(() => candles ? detectVolumeSpikes(candles) : [], [candles])

  // OI Divergence for primary TF
  const oiDivergence = useMemo(() => {
    if (!oiData || oiData.length < 10) return null
    const oiValues = oiData.map(d => d.openInterest)
    return calculateOIDivergence(closes, oiValues)
  }, [closes, oiData])

  const latestRSI = rsiValues[rsiValues.length - 1] ?? null
  const latestStochK = stochastic.kValues[stochastic.kValues.length - 1] ?? null
  const latestStochD = stochastic.dValues[stochastic.dValues.length - 1] ?? null
  const latestMACDLine = macd.macdLine[macd.macdLine.length - 1] ?? null
  const latestMACDSignal = macd.signalLine[macd.signalLine.length - 1] ?? null
  const latestMACDHist = macd.histogram[macd.histogram.length - 1] ?? null
  const latestATR = atrValues[atrValues.length - 1] ?? null
  const latestBBPercentB = bbResult.percentB[bbResult.percentB.length - 1] ?? null
  const latestBBBandwidth = bbResult.bandwidth[bbResult.bandwidth.length - 1] ?? null
  const latestSTDir = stResult.direction[stResult.direction.length - 1] ?? null
  const latestVolPercentile = useMemo(() => calculateVolatilityPercentile(atrValues), [atrValues])
  const latestZScore = zScoreValues[zScoreValues.length - 1] ?? null
  const latestRSquared = linRegResult.rSquared[linRegResult.rSquared.length - 1] ?? null
  const latestKAMA = kamaValues[kamaValues.length - 1] ?? null
  const latestVolumeSpikeRatio = useMemo(() => {
    if (!volumeSpikes.length) return null
    const lastSpike = volumeSpikes[volumeSpikes.length - 1]
    return lastSpike?.ratio ?? null
  }, [volumeSpikes])

  // ─── Risk Levels ──────────────────────────────────────────────────────────

  const riskLevels = useMemo(() => {
    const price = latestCandle?.close
    if (!price || latestATR === null) return null
    const direction = latestRSI !== null && latestRSI < 50 ? 'long' as const : 'short' as const
    return calculateRiskLevels(price, latestATR, direction)
  }, [latestCandle, latestATR, latestRSI])

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
        const tfBB = calculateBollingerBands(c, 20, 2)
        const tfST = calculateSupertrend(r.candles, 10, 3)
        const tfOBV = calculateOBV(r.candles)
        const tfOBVEma = calculateEMA(tfOBV, 20)
        const tfVWAP = calculateVWAP(r.candles)
        const tfVolPct = calculateVolatilityPercentile(tfAtr)

        // Advanced indicators per timeframe
        const tfHurst = calculateHurstExponent(c)
        const tfZScore = calculateZScore(c)
        const tfLinReg = calculateLinearRegression(c)
        const tfKAMA = calculateKAMA(c)
        const tfAutocorr = calculateAutocorrelation(c)
        const tfVolSpikes = detectVolumeSpikes(r.candles)

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
          bbUpper: tfBB.upper[tfBB.upper.length - 1] ?? null,
          bbLower: tfBB.lower[tfBB.lower.length - 1] ?? null,
          bbPercentB: tfBB.percentB[tfBB.percentB.length - 1] ?? null,
          bbBandwidth: tfBB.bandwidth[tfBB.bandwidth.length - 1] ?? null,
          supertrendValue: tfST.supertrend[tfST.supertrend.length - 1] ?? null,
          supertrendDirection: tfST.direction[tfST.direction.length - 1] ?? null,
          obv: tfOBV[tfOBV.length - 1] ?? null,
          obvEma: tfOBVEma[tfOBVEma.length - 1] ?? null,
          vwap: tfVWAP[tfVWAP.length - 1] ?? null,
          volatilityPercentile: tfVolPct,
          fundingRate: tickerData?.fundingRate ?? null,
          // Advanced fields
          hurstExponent: tfHurst,
          zScore: tfZScore[tfZScore.length - 1] ?? null,
          rSquared: tfLinReg.rSquared[tfLinReg.rSquared.length - 1] ?? null,
          linearRegressionSlope: tfLinReg.slope[tfLinReg.slope.length - 1] ?? null,
          kama: tfKAMA[tfKAMA.length - 1] ?? null,
          autocorrelation: tfAutocorr,
          oiDivergence: null, // OI divergence only available for primary TF
          volumeSpikeRatio: tfVolSpikes.length > 0 ? tfVolSpikes[tfVolSpikes.length - 1]?.ratio ?? null : null,
        }
      })
  }, [multiFrameResults, symbol, tickerData])

  // ─── Bayesian Accuracy Updates ─────────────────────────────────────────────

  useEffect(() => {
    if (computations.length === 0) return

    for (const comp of computations) {
      if (!comp.candles.length || comp.candles.length < 10) continue
      const len = comp.candles.length
      // Use 5-bar forward return as the "actual" for accuracy tracking
      if (len < 6) continue
      const prevClose = comp.candles[len - 6].close
      const currClose = comp.candles[len - 1].close
      const actualReturn = currClose - prevClose

      const snapshot = snapshots.find(s => s.timeframe === comp.timeframe)
      if (snapshot) {
        bayesianStateRef.current = updateBayesianAccuracy(
          bayesianStateRef.current,
          snapshot.signal.signals,
          actualReturn,
          len
        )
      }
    }
  }, [computations])

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
    () => deriveTimeframeSnapshots(computations, markovPriors, bayesianStateRef.current),
    [computations, markovPriors]
  )

  const qualifiedSignals = useMemo(() => getQualifiedSignals(snapshots), [snapshots])

  const confluence = useMemo(
    () => deriveMultiTimeframeConfluence(snapshots, bayesianStateRef.current),
    [snapshots]
  )

  // ─── Multi-TF MA Cross Detection ─────────────────────────────────────────

  useEffect(() => {
    for (const comp of computations) {
      if (!comp.candles.length || !comp.close) continue
      const c = comp.candles.map(x => x.close)
      const tfEma10 = calculateEMA(c, 10)
      const tfEma50 = calculateEMA(c, 50)
      const prevState = prevCrossRef.current[comp.timeframe] ?? null
      const cross = detectMACross(tfEma10, tfEma50, prevState)
      if (cross) {
        prevCrossRef.current = { ...prevCrossRef.current, [comp.timeframe]: cross.direction }
        const priority = getTimeframePriority(comp.timeframe)
        const notif: MovingAverageCrossNotification = {
          id: createNotificationId(),
          symbol,
          timeframe: comp.timeframe,
          timeframeLabel: comp.timeframeLabel,
          pairLabel: 'EMA 10 / EMA 50',
          direction: cross.direction,
          intensity: cross.direction === 'golden' ? 'green' : 'yellow',
          price: comp.close,
          triggeredAt: Date.now(),
        }
        setCrossNotifications(prev => [notif, ...prev].slice(0, 50))
        showBrowserNotification(
          `${cross.direction === 'golden' ? '🟡 Golden' : '🟣 Death'} Cross — ${symbol} (${comp.timeframeLabel})`,
          `EMA 10/50 ${cross.direction} cross at $${comp.close.toLocaleString()}`
        )
        playNotificationSound(priority)
      }
    }
  }, [computations, symbol])

  // ─── Multi-TF Momentum Detection (with TF-aware cooldowns) ────────────────

  useEffect(() => {
    for (const comp of computations) {
      const momentum = detectMomentum(comp.rsi, comp.stochD)
      if (momentum) {
        const cooldown = getCooldown(comp.timeframe)
        const priority = getTimeframePriority(comp.timeframe)
        const notif: MomentumNotification = {
          id: createNotificationId(),
          symbol,
          direction: momentum.direction,
          intensity: momentum.intensity,
          label: `${momentum.direction === 'long' ? '🟢' : '🔴'} ${momentum.direction.toUpperCase()} Momentum`,
          timeframeSummary: comp.timeframeLabel,
          rsiSummary: comp.rsi?.toFixed(1) ?? '—',
          stochasticSummary: comp.stochD?.toFixed(1) ?? '—',
          readings: [],
          triggeredAt: Date.now(),
        }
        setMomentumNotifications(prev => {
          const recent = prev.filter(p =>
            Date.now() - p.triggeredAt < cooldown &&
            p.direction === momentum.direction &&
            p.timeframeSummary === comp.timeframeLabel
          )
          if (recent.length > 0) return prev
          showBrowserNotification(
            `${momentum.direction === 'long' ? '🟢' : '🔴'} ${momentum.direction.toUpperCase()} Momentum — ${symbol} (${comp.timeframeLabel})`,
            `RSI: ${comp.rsi?.toFixed(1) ?? '—'} | Stoch D: ${comp.stochD?.toFixed(1) ?? '—'}`
          )
          playNotificationSound(priority)
          return [notif, ...prev].slice(0, 50)
        })
      }
    }
  }, [computations, symbol])

  // ─── Confluence-Based Signal Notifications ────────────────────────────────

  useEffect(() => {
    if (qualifiedSignals.length < 2) return

    const longSignals = qualifiedSignals.filter(s => s.direction === 'long')
    const shortSignals = qualifiedSignals.filter(s => s.direction === 'short')

    for (const [direction, signals] of [['long', longSignals], ['short', shortSignals]] as const) {
      if (signals.length < 3) continue

      const avgConfidence = signals.reduce((s, sig) => s + sig.confidence, 0) / signals.length
      const timeframes = signals.map(s => s.timeframeLabel)
      const priority = signals.length >= 4 && avgConfidence > 0.7 ? 'high' as const : 'medium' as const

      setSignalNotifications(prev => {
        const recent = prev.filter(p =>
          Date.now() - p.triggeredAt < 15 * 60 * 1000 &&
          p.direction === direction
        )
        if (recent.length > 0) return prev

        const notif: SignalNotification = {
          id: createNotificationId(),
          symbol,
          direction,
          confluenceCount: signals.length,
          avgConfidence,
          timeframes,
          details: `${signals.length} timeframes aligned ${direction}: ${timeframes.join(', ')}`,
          priority,
          triggeredAt: Date.now(),
        }

        showBrowserNotification(
          `${direction === 'long' ? '🟢' : '🔴'} ${signals.length}-TF Confluence — ${symbol}`,
          `${timeframes.join(', ')} | Avg confidence: ${(avgConfidence * 100).toFixed(0)}%`
        )
        playNotificationSound(priority)
        return [notif, ...prev].slice(0, 50)
      })
    }
  }, [qualifiedSignals, symbol])

  // ─── Divergence Notifications ─────────────────────────────────────────────

  useEffect(() => {
    for (const comp of computations) {
      if (!comp.candles.length || comp.candles.length < 50) continue
      const c = comp.candles.map(x => x.close)
      const tfRsiSetting = RSI_SETTINGS[comp.timeframe] ?? DEFAULT_RSI
      const tfMacdSetting = MACD_SETTINGS[comp.timeframe] ?? DEFAULT_MACD
      const rsiArr = calculateRSI(c, tfRsiSetting.period)
      const macdResult = calculateMACD(c, tfMacdSetting.fast, tfMacdSetting.slow, tfMacdSetting.signal)

      const divSignals = deriveDivergenceSignals(c, rsiArr, macdResult.histogram)
      for (const sig of divSignals) {
        if (sig.confidence < 0.6) continue

        const cooldown = getCooldown(comp.timeframe) * 2
        const priority = parseInt(comp.timeframe) >= 240 ? 'high' as const :
                         parseInt(comp.timeframe) >= 60 ? 'medium' as const : 'low' as const

        setDivergenceNotifications(prev => {
          const recent = prev.filter(p =>
            Date.now() - p.triggeredAt < cooldown &&
            p.timeframe === comp.timeframe &&
            p.indicator === sig.source
          )
          if (recent.length > 0) return prev

          const divType = sig.direction === 'long' ? 'bullish' : 'bearish'
          const variant = sig.label.includes('hidden') ? 'hidden' as const : 'regular' as const
          const notif: DivergenceNotification = {
            id: createNotificationId(),
            symbol,
            timeframe: comp.timeframe,
            timeframeLabel: comp.timeframeLabel,
            divergenceType: divType,
            variant,
            indicator: sig.source,
            priority,
            triggeredAt: Date.now(),
          }

          showBrowserNotification(
            `${divType === 'bullish' ? '🟢' : '🔴'} ${variant.charAt(0).toUpperCase() + variant.slice(1)} ${divType} divergence — ${symbol} (${comp.timeframeLabel})`,
            sig.label
          )
          playNotificationSound(priority)
          return [notif, ...prev].slice(0, 50)
        })
      }
    }
  }, [computations, symbol])

  // ─── Funding Rate Notifications ───────────────────────────────────────────

  const prevFundingRef = useRef<number | null>(null)
  useEffect(() => {
    if (!tickerData) return
    const rate = tickerData.fundingRate
    const prevRate = prevFundingRef.current
    prevFundingRef.current = rate

    if (Math.abs(rate) >= 0.0005 && (prevRate === null || Math.abs(prevRate) < 0.0005)) {
      const direction = rate > 0 ? 'Longs paying' : 'Shorts paying'
      showBrowserNotification(
        `⚠️ Extreme Funding — ${symbol}`,
        `${direction}: ${(rate * 100).toFixed(4)}%`
      )
      playNotificationSound('medium')
    }
  }, [tickerData, symbol])

  // Reset detection refs on symbol change
  useEffect(() => {
    prevCrossRef.current = {}
    prevFundingRef.current = null
    bayesianStateRef.current = createInitialBayesianState()
  }, [symbol])

  const allNotifIds = useMemo(() => {
    const ids: string[] = []
    for (const n of momentumNotifications) ids.push(n.id)
    for (const n of crossNotifications) ids.push(n.id)
    for (const n of signalNotifications) ids.push(n.id)
    for (const n of divergenceNotifications) ids.push(n.id)
    return ids
  }, [momentumNotifications, crossNotifications, signalNotifications, divergenceNotifications])

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
    setSignalNotifications([])
    setDivergenceNotifications([])
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
      signalNotifications={signalNotifications}
      divergenceNotifications={divergenceNotifications}
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
        onTimeframeChange={handleTimeframeChange}
        refreshSelection={refreshSelection}
        onRefreshSelectionChange={handleRefreshChange}
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
        signalNotifications={signalNotifications}
        divergenceNotifications={divergenceNotifications}
        snapshots={snapshots}
        qualifiedSignals={qualifiedSignals}
        confluence={confluence}
        bbUpper={bbResult.upper}
        bbLower={bbResult.lower}
        bbPercentB={latestBBPercentB}
        bbBandwidth={latestBBBandwidth}
        supertrend={stResult.supertrend}
        supertrendDirection={stResult.direction}
        latestSTDir={latestSTDir}
        obv={obvValues}
        obvEma={obvEmaValues}
        vwap={vwapValues}
        volatilityPercentile={latestVolPercentile}
        riskLevels={riskLevels}
        fundingRate={tickerData?.fundingRate ?? null}
        hurstExponent={hurstExponent}
        zScore={latestZScore}
        rSquared={latestRSquared}
        kama={kamaValues}
        autocorrelation={autocorrelation}
        oiDivergence={oiDivergence}
        volumeSpikeRatio={latestVolumeSpikeRatio}
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
