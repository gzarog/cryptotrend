import { useMemo, useState, useCallback } from 'react'
import { MainLayout } from '../layouts/MainLayout'
import { ControlBar } from '../components/ControlBar'
import { MarketSummary } from '../components/MarketSummary'
import { IndicatorGrid } from '../components/IndicatorGrid'
import { LineChart } from '../components/LineChart'
import { useMarketData } from '../hooks/useMarketData'
import { calculateRSI, calculateEMA, calculateSMA, calculateStochasticRSI, calculateMACD } from '../lib/indicators'

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

const LAST_REFRESH_FORMATTER = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit', minute: '2-digit', second: '2-digit',
})

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
})

const Index = () => {
  const [symbol, setSymbol] = useState('BTCUSDT')
  const [timeframe, setTimeframe] = useState('15')
  const [refreshSelection, setRefreshSelection] = useState('1')
  const [barLimit, setBarLimit] = useState(200)

  const refreshInterval = parseFloat(refreshSelection) * 60 * 1000

  const { data: candles, isLoading, isError, error, isFetching, refetch } = useMarketData(
    symbol, timeframe, barLimit, refreshInterval, true
  )

  const lastUpdated = useMemo(() => {
    if (!candles?.length) return ''
    return LAST_REFRESH_FORMATTER.format(new Date())
  }, [candles])

  const closes = useMemo(() => candles?.map((c) => c.close) ?? [], [candles])

  const labels = useMemo(
    () => candles?.map((c) => DATE_FORMATTER.format(new Date(c.openTime))) ?? [],
    [candles]
  )

  const latestCandle = candles?.[candles.length - 1] ?? null
  const firstCandle = candles?.[0] ?? null

  const priceChange = useMemo(() => {
    if (!latestCandle || !firstCandle) return null
    const diff = latestCandle.close - firstCandle.open
    const pct = (diff / firstCandle.open) * 100
    return { difference: diff, percent: pct }
  }, [latestCandle, firstCandle])

  // RSI
  const rsiSetting = RSI_SETTINGS[timeframe] ?? DEFAULT_RSI
  const rsiValues = useMemo(() => calculateRSI(closes, rsiSetting.period), [closes, rsiSetting.period])

  // Stochastic RSI
  const stochSetting = STOCH_SETTINGS[timeframe] ?? DEFAULT_STOCH
  const stochastic = useMemo(
    () => calculateStochasticRSI(closes, stochSetting.rsiLength, stochSetting.stochLength, stochSetting.kSmoothing, stochSetting.dSmoothing),
    [closes, stochSetting]
  )

  // MACD
  const macdSetting = MACD_SETTINGS[timeframe] ?? DEFAULT_MACD
  const macd = useMemo(
    () => calculateMACD(closes, macdSetting.fast, macdSetting.slow, macdSetting.signal),
    [closes, macdSetting]
  )

  // Moving averages for price chart
  const ema10 = useMemo(() => calculateEMA(closes, 10), [closes])
  const ema50 = useMemo(() => calculateEMA(closes, 50), [closes])
  const ma200 = useMemo(() => calculateSMA(closes, 200), [closes])

  // Latest indicator values
  const latestRSI = rsiValues[rsiValues.length - 1] ?? null
  const latestStochK = stochastic.kValues[stochastic.kValues.length - 1] ?? null
  const latestStochD = stochastic.dValues[stochastic.dValues.length - 1] ?? null
  const latestMACDLine = macd.macdLine[macd.macdLine.length - 1] ?? null
  const latestMACDSignal = macd.signalLine[macd.signalLine.length - 1] ?? null
  const latestMACDHist = macd.histogram[macd.histogram.length - 1] ?? null

  const rsiGuideLines = [
    { value: 70, label: '70', color: 'hsl(0 84% 60%)' },
    { value: 30, label: '30', color: 'hsl(160 84% 39%)' },
    { value: 50, label: '50', color: 'hsl(215 20% 40%)' },
  ]

  const stochGuideLines = [
    { value: 80, label: '80', color: 'hsl(0 84% 60%)' },
    { value: 20, label: '20', color: 'hsl(160 84% 39%)' },
    { value: 50, label: '50', color: 'hsl(215 20% 40%)' },
  ]

  return (
    <MainLayout>
      <ControlBar
        symbol={symbol}
        onSymbolChange={setSymbol}
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

      <MarketSummary
        symbol={symbol}
        price={latestCandle?.close ?? null}
        priceChange={priceChange}
      />

      <IndicatorGrid
        rsi={latestRSI}
        stochK={latestStochK}
        stochD={latestStochD}
        macdLine={latestMACDLine}
        macdSignal={latestMACDSignal}
        macdHistogram={latestMACDHist}
      />

      {/* Price Chart with Moving Averages */}
      <div className="mb-6">
        <LineChart
          title={`${symbol} Price`}
          labels={labels}
          series={[
            { name: 'Price', data: closes, color: 'hsl(187 94% 55%)' },
            { name: 'EMA 10', data: ema10, color: 'hsl(45 93% 47%)' },
            { name: 'EMA 50', data: ema50, color: 'hsl(260 60% 55%)' },
            ...(ma200.some((v) => v !== null) ? [{ name: 'MA 200', data: ma200, color: 'hsl(0 84% 60%)' }] : []),
          ]}
          isLoading={isLoading}
        />
      </div>

      {/* RSI Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <LineChart
          title={`RSI (${rsiSetting.period})`}
          labels={labels}
          data={rsiValues}
          color="hsl(260 60% 65%)"
          yDomain={{ min: 0, max: 100 }}
          guideLines={rsiGuideLines}
          isLoading={isLoading}
        />

        {/* Stochastic RSI */}
        <LineChart
          title="Stochastic RSI"
          labels={labels}
          series={[
            { name: '%K', data: stochastic.kValues, color: 'hsl(187 94% 55%)' },
            { name: '%D', data: stochastic.dValues, color: 'hsl(45 93% 47%)' },
          ]}
          yDomain={{ min: 0, max: 100 }}
          guideLines={stochGuideLines}
          isLoading={isLoading}
        />
      </div>

      {/* MACD Chart */}
      <div className="mb-6">
        <LineChart
          title={`MACD (${macdSetting.fast}, ${macdSetting.slow}, ${macdSetting.signal})`}
          labels={labels}
          series={[
            { name: 'MACD', data: macd.macdLine, color: 'hsl(187 94% 55%)' },
            { name: 'Signal', data: macd.signalLine, color: 'hsl(0 84% 60%)' },
          ]}
          guideLines={[{ value: 0, label: '0', color: 'hsl(215 20% 40%)' }]}
          isLoading={isLoading}
        />
      </div>

      {isError && (
        <div className="glass-panel p-4 border border-destructive/40 bg-destructive/10 text-center">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : 'Failed to load market data'}
          </p>
        </div>
      )}
    </MainLayout>
  )
}

export default Index
