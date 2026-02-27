import type { MomentumNotification, MovingAverageCrossNotification, MomentumComputation, Candle } from '../types/app'
import type { TimeframeSignalSnapshot, QualifiedSignal, MultiTimeframeSignal } from '../types/signals'
import { LineChart } from './LineChart'
import { MarketSummary } from './MarketSummary'
import { IndicatorGrid } from './IndicatorGrid'
import { SignalsPanel } from './signals/SignalsPanel'
import { ExpertSignalsPanel } from './ExpertSignalsPanel'
import { HedgingCalculatorPanel } from './HedgingCalculatorPanel'
import { ChartSkeleton } from './skeletons'

type Props = {
  symbol: string
  candles: Candle[]
  labels: string[]
  closes: number[]
  isLoading: boolean

  // Price info
  price: number | null
  priceChange: { difference: number; percent: number } | null

  // Indicators
  rsi: Array<number | null>
  rsiPeriod: number
  stochK: Array<number | null>
  stochD: Array<number | null>
  macdLine: Array<number | null>
  macdSignal: Array<number | null>
  macdHistogram: Array<number | null>
  macdSettings: { fast: number; slow: number; signal: number }
  ema10: Array<number | null>
  ema50: Array<number | null>
  ma200: Array<number | null>

  // Latest values
  latestRSI: number | null
  latestStochK: number | null
  latestStochD: number | null
  latestMACDLine: number | null
  latestMACDSignal: number | null
  latestMACDHist: number | null

  // Notifications
  momentumNotifications: MomentumNotification[]
  crossNotifications: MovingAverageCrossNotification[]

  // Signals
  snapshots: TimeframeSignalSnapshot[]
  qualifiedSignals: QualifiedSignal[]
  multiTfSignal: MultiTimeframeSignal | null

  // Hedging
  latestADX: number | null
}

const RSI_GUIDES = [
  { value: 70, label: '70', color: 'hsl(0 84% 60%)' },
  { value: 30, label: '30', color: 'hsl(160 84% 39%)' },
  { value: 50, label: '50', color: 'hsl(215 20% 40%)' },
]

const STOCH_GUIDES = [
  { value: 80, label: '80', color: 'hsl(0 84% 60%)' },
  { value: 20, label: '20', color: 'hsl(160 84% 39%)' },
  { value: 50, label: '50', color: 'hsl(215 20% 40%)' },
]

export function DashboardView(props: Props) {
  const {
    symbol, candles, labels, closes, isLoading,
    price, priceChange,
    rsi, rsiPeriod, stochK, stochD,
    macdLine, macdSignal, macdHistogram, macdSettings,
    ema10, ema50, ma200,
    latestRSI, latestStochK, latestStochD,
    latestMACDLine, latestMACDSignal, latestMACDHist,
    momentumNotifications, crossNotifications,
    snapshots, qualifiedSignals, multiTfSignal,
    latestADX,
  } = props

  return (
    <div className="space-y-6">
      {/* Notification Cards */}
      {momentumNotifications.length > 0 && (
        <div className="space-y-2">
          {momentumNotifications.slice(0, 3).map((n) => (
            <div key={n.id} className={`glass-panel p-3 border-l-4 ${n.direction === 'long' ? 'border-l-green-500' : 'border-l-red-500'}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{n.label}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(n.triggeredAt).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {n.timeframeSummary} • RSI: {n.rsiSummary} • Stoch: {n.stochasticSummary}
              </p>
            </div>
          ))}
        </div>
      )}

      {crossNotifications.length > 0 && (
        <div className="space-y-2">
          {crossNotifications.slice(0, 3).map((n) => (
            <div key={n.id} className={`glass-panel p-3 border-l-4 ${n.direction === 'golden' ? 'border-l-yellow-500' : 'border-l-purple-500'}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {n.direction === 'golden' ? '🟡 Golden Cross' : '🟣 Death Cross'} — {n.pairLabel}
                </span>
                <span className="text-xs text-muted-foreground">{n.timeframeLabel}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Price: ${n.price.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Market Summary */}
      <MarketSummary symbol={symbol} price={price} priceChange={priceChange} />

      {/* Indicator Grid */}
      <IndicatorGrid
        rsi={latestRSI}
        stochK={latestStochK}
        stochD={latestStochD}
        macdLine={latestMACDLine}
        macdSignal={latestMACDSignal}
        macdHistogram={latestMACDHist}
      />

      {/* Price Chart */}
      {isLoading ? <ChartSkeleton height={300} /> : (
        <div className="mb-6">
          <LineChart
            title={`${symbol} Price`}
            labels={labels}
            series={[
              { name: 'Price', data: closes, color: 'hsl(187 94% 55%)' },
              { name: 'EMA 10', data: ema10, color: 'hsl(45 93% 47%)' },
              { name: 'EMA 50', data: ema50, color: 'hsl(260 60% 55%)' },
              ...(ma200.some(v => v !== null) ? [{ name: 'MA 200', data: ma200, color: 'hsl(0 84% 60%)' }] : []),
            ]}
            isLoading={false}
          />
        </div>
      )}

      {/* RSI & Stochastic */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <LineChart
          title={`RSI (${rsiPeriod})`}
          labels={labels}
          data={rsi}
          color="hsl(260 60% 65%)"
          yDomain={{ min: 0, max: 100 }}
          guideLines={RSI_GUIDES}
          isLoading={isLoading}
        />
        <LineChart
          title="Stochastic RSI"
          labels={labels}
          series={[
            { name: '%K', data: stochK, color: 'hsl(187 94% 55%)' },
            { name: '%D', data: stochD, color: 'hsl(45 93% 47%)' },
          ]}
          yDomain={{ min: 0, max: 100 }}
          guideLines={STOCH_GUIDES}
          isLoading={isLoading}
        />
      </div>

      {/* MACD */}
      <div className="mb-6">
        <LineChart
          title={`MACD (${macdSettings.fast}, ${macdSettings.slow}, ${macdSettings.signal})`}
          labels={labels}
          series={[
            { name: 'MACD', data: macdLine, color: 'hsl(187 94% 55%)' },
            { name: 'Signal', data: macdSignal, color: 'hsl(0 84% 60%)' },
          ]}
          guideLines={[{ value: 0, label: '0', color: 'hsl(215 20% 40%)' }]}
          isLoading={isLoading}
        />
      </div>

      {/* Signals Panel */}
      {snapshots.length > 0 && (
        <div className="mb-6">
          <SignalsPanel
            snapshots={snapshots}
            qualifiedSignals={qualifiedSignals}
            multiTfSignal={multiTfSignal}
          />
        </div>
      )}

      {/* Expert Signals & Hedging side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {snapshots.length > 0 && <ExpertSignalsPanel snapshots={snapshots} />}
        {candles.length > 0 && (
          <HedgingCalculatorPanel
            candles={candles}
            currentPrice={price ?? 0}
            rsi={latestRSI}
            macdHistogram={latestMACDHist}
            adx={latestADX}
            stochK={latestStochK}
          />
        )}
      </div>
    </div>
  )
}
