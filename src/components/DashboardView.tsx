import type { MomentumNotification, MovingAverageCrossNotification, SignalNotification, DivergenceNotification, FundingRateNotification, RegimeChangeNotification, VolatilityBreakoutNotification, CorrelationBreakdownNotification, Candle } from '../types/app'
import type { TimeframeSignalSnapshot, QualifiedSignal, MultiTimeframeConfluence } from '../types/signals'
import type { RiskLevel } from '../lib/risk'
import type { IchimokuResult, FibonacciResult, CVDResult } from '../lib/indicators'
import { LineChart } from './LineChart'
import { MarketSummary } from './MarketSummary'
import { IndicatorGrid } from './IndicatorGrid'
import { SignalsPanel } from './signals/SignalsPanel'
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
  signalNotifications?: SignalNotification[]
  divergenceNotifications?: DivergenceNotification[]
  fundingNotifications?: FundingRateNotification[]
  regimeNotifications?: RegimeChangeNotification[]
  volatilityNotifications?: VolatilityBreakoutNotification[]
  correlationNotifications?: CorrelationBreakdownNotification[]

  // Signals
  snapshots: TimeframeSignalSnapshot[]
  qualifiedSignals: QualifiedSignal[]
  confluence?: MultiTimeframeConfluence

  // New indicators
  bbUpper?: Array<number | null>
  bbLower?: Array<number | null>
  bbPercentB?: number | null
  bbBandwidth?: number | null
  supertrend?: Array<number | null>
  supertrendDirection?: Array<1 | -1 | null>
  latestSTDir?: 1 | -1 | null
  obv?: number[]
  obvEma?: Array<number | null>
  vwap?: Array<number | null>
  volatilityPercentile?: number | null
  riskLevels?: RiskLevel | null
  fundingRate?: number | null

  // Advanced indicators
  hurstExponent?: number | null
  zScore?: number | null
  rSquared?: number | null
  kama?: Array<number | null>
  autocorrelation?: number | null
  oiDivergence?: number | null
  volumeSpikeRatio?: number | null

  // Tier 1: Ichimoku, Fibonacci, CVD, Correlation
  ichimokuResult?: IchimokuResult | null
  fibResult?: FibonacciResult | null
  cvdResult?: CVDResult | null
  btcCorrelation?: number | null
  ethCorrelation?: number | null
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

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (price >= 1) return price.toFixed(4)
  return price.toFixed(6)
}

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
    signalNotifications = [], divergenceNotifications = [],
    fundingNotifications = [], regimeNotifications = [],
    volatilityNotifications = [], correlationNotifications = [],
    snapshots, qualifiedSignals, confluence,
    bbUpper = [], bbLower = [], bbPercentB, bbBandwidth,
    supertrend = [], supertrendDirection = [], latestSTDir,
    obv = [], obvEma = [], vwap = [],
    volatilityPercentile, riskLevels, fundingRate,
    hurstExponent, zScore, rSquared,
    kama = [], autocorrelation, oiDivergence, volumeSpikeRatio,
    ichimokuResult, fibResult, cvdResult, btcCorrelation, ethCorrelation,
  } = props

  return (
    <div className="space-y-6">
      {/* Confluence Alert Banner */}
      {confluence && confluence.confluenceLevel !== 'mixed' && confluence.confluenceLevel !== 'weak' && (
        <div className={`glass-panel p-4 border-l-4 ${
          confluence.direction === 'long' ? 'border-l-emerald-500 bg-emerald-500/5' :
          confluence.direction === 'short' ? 'border-l-orange-500 bg-orange-500/5' :
          'border-l-gray-500 bg-gray-500/5'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold">
                {confluence.direction === 'long' ? '📈' : '📉'} Multi-TF Confluence: {confluence.confluenceLevel.toUpperCase()}
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                {confluence.longCount} long / {confluence.shortCount} short / {confluence.neutralCount} neutral — Score: {confluence.score.toFixed(2)}
              </p>
            </div>
            <span className={`text-xs font-bold px-2 py-1 rounded ${
              confluence.direction === 'long' ? 'bg-emerald-500/20 text-emerald-400' :
              confluence.direction === 'short' ? 'bg-orange-500/20 text-orange-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {confluence.direction.toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Signal Notification Cards */}
      {signalNotifications.length > 0 && (
        <div className="space-y-2">
          {signalNotifications.slice(0, 2).map((n) => (
            <div key={n.id} className={`glass-panel p-3 border-l-4 ${n.direction === 'long' ? 'border-l-emerald-500' : 'border-l-orange-500'}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {n.direction === 'long' ? '📈' : '📉'} {n.confluenceCount}-TF Confluence — {n.direction.toUpperCase()}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(n.triggeredAt).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{n.details}</p>
            </div>
          ))}
        </div>
      )}

      {/* Divergence Notification Cards */}
      {divergenceNotifications.length > 0 && (
        <div className="space-y-2">
          {divergenceNotifications.slice(0, 2).map((n) => (
            <div key={n.id} className={`glass-panel p-3 border-l-4 ${n.divergenceType === 'bullish' ? 'border-l-cyan-500' : 'border-l-pink-500'}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {n.divergenceType === 'bullish' ? '🔵' : '🔻'} {n.variant} {n.divergenceType} divergence
                </span>
                <span className="text-xs text-muted-foreground">{n.timeframeLabel}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {n.indicator.replace('divergence-', '').toUpperCase()} • {new Date(n.triggeredAt).toLocaleTimeString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Market Notification Cards (Funding, Regime, Volatility, Correlation) */}
      {fundingNotifications.length > 0 && (
        <div className="space-y-2">
          {fundingNotifications.slice(0, 2).map((n) => (
            <div key={n.id} className="glass-panel p-3 border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  💰 Extreme Funding — {n.direction === 'longs_paying' ? 'Longs paying' : 'Shorts paying'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(n.triggeredAt).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Rate: {(n.rate * 100).toFixed(4)}%</p>
            </div>
          ))}
        </div>
      )}

      {regimeNotifications.length > 0 && (
        <div className="space-y-2">
          {regimeNotifications.slice(0, 2).map((n) => (
            <div key={n.id} className={`glass-panel p-3 border-l-4 ${
              n.toRegime === 'trending' ? 'border-l-blue-500' :
              n.toRegime === 'mean-reverting' ? 'border-l-amber-500' : 'border-l-gray-500'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  🔄 Regime: {n.fromRegime} → {n.toRegime}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(n.triggeredAt).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Hurst: {n.hurstValue.toFixed(3)}</p>
            </div>
          ))}
        </div>
      )}

      {volatilityNotifications.length > 0 && (
        <div className="space-y-2">
          {volatilityNotifications.slice(0, 2).map((n) => (
            <div key={n.id} className="glass-panel p-3 border-l-4 border-l-rose-500">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">⚡ Volatility Spike</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(n.triggeredAt).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Percentile: {n.volatilityPercentile.toFixed(0)}%</p>
            </div>
          ))}
        </div>
      )}

      {correlationNotifications.length > 0 && (
        <div className="space-y-2">
          {correlationNotifications.slice(0, 2).map((n) => (
            <div key={n.id} className="glass-panel p-3 border-l-4 border-l-red-500">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">🔗 {n.asset} Decoupled</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(n.triggeredAt).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Correlation: {n.correlation.toFixed(3)} (was {n.previousCorrelation.toFixed(3)})
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Momentum Notification Cards */}
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

      {/* Market Summary with Funding Rate */}
      <MarketSummary symbol={symbol} price={price} priceChange={priceChange} fundingRate={fundingRate} />

      {/* Regime Badge */}
      {hurstExponent != null && (
        <div className={`glass-panel p-3 mb-6 border-l-4 ${
          hurstExponent > 0.6 ? 'border-l-blue-500 bg-blue-500/5' :
          hurstExponent < 0.4 ? 'border-l-amber-500 bg-amber-500/5' :
          'border-l-gray-500 bg-gray-500/5'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                {hurstExponent > 0.6 ? 'Trending' : hurstExponent < 0.4 ? 'Mean-Reverting' : 'Random Walk'}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                hurstExponent > 0.6 ? 'bg-blue-500/20 text-blue-400' :
                hurstExponent < 0.4 ? 'bg-amber-500/20 text-amber-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                H = {hurstExponent.toFixed(3)}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {rSquared != null && <span>R² = {rSquared.toFixed(2)}</span>}
              {autocorrelation != null && <span>AC = {autocorrelation.toFixed(3)}</span>}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {hurstExponent > 0.6
              ? 'Trend-following signals (MACD, Supertrend) have boosted weight'
              : hurstExponent < 0.4
              ? 'Mean-reversion signals (RSI, BB, Z-Score) have boosted weight'
              : 'No clear regime — all signal weights reduced'}
          </p>
        </div>
      )}

      {/* Indicator Grid */}
      <IndicatorGrid
        rsi={latestRSI}
        stochK={latestStochK}
        stochD={latestStochD}
        macdLine={latestMACDLine}
        macdSignal={latestMACDSignal}
        macdHistogram={latestMACDHist}
        bbPercentB={bbPercentB}
        supertrendDirection={latestSTDir}
        volatilityPercentile={volatilityPercentile}
        hurstExponent={hurstExponent}
        zScore={zScore}
        rSquared={rSquared}
        oiDivergence={oiDivergence}
        ichimokuTenkan={ichimokuResult?.tenkan[ichimokuResult.tenkan.length - 1] ?? null}
        ichimokuKijun={ichimokuResult?.kijun[ichimokuResult.kijun.length - 1] ?? null}
        cvd={cvdResult?.cvd[cvdResult.cvd.length - 1] ?? null}
        cvdEma={cvdResult?.cvdEma[cvdResult.cvdEma.length - 1] ?? null}
      />

      {/* Risk Levels */}
      {riskLevels && (
        <div className="glass-panel p-4 mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">ATR-Based Risk Levels</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center">
              <div className="text-[10px] text-muted-foreground">Stop Loss</div>
              <div className="text-sm font-bold text-red-400">${formatPrice(riskLevels.stopLoss)}</div>
              <div className="text-[10px] text-muted-foreground">-{riskLevels.riskPercent.toFixed(2)}%</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-muted-foreground">TP 1 (1:1)</div>
              <div className="text-sm font-bold text-green-400">${formatPrice(riskLevels.takeProfit1)}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-muted-foreground">TP 2 (2:1)</div>
              <div className="text-sm font-bold text-green-400">${formatPrice(riskLevels.takeProfit2)}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-muted-foreground">TP 3 (3:1)</div>
              <div className="text-sm font-bold text-emerald-400">${formatPrice(riskLevels.takeProfit3)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Price Chart with BB, Supertrend, VWAP, Ichimoku overlays */}
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
              ...(bbUpper.some(v => v !== null) ? [{ name: 'BB Upper', data: bbUpper, color: 'hsl(210 40% 50% / 0.5)' }] : []),
              ...(bbLower.some(v => v !== null) ? [{ name: 'BB Lower', data: bbLower, color: 'hsl(210 40% 50% / 0.5)' }] : []),
              ...(supertrend.some(v => v !== null) ? [{ name: 'Supertrend', data: supertrend, color: latestSTDir === 1 ? 'hsl(160 84% 39%)' : 'hsl(0 84% 60%)' }] : []),
              ...(vwap.some(v => v !== null) ? [{ name: 'VWAP', data: vwap, color: 'hsl(190 90% 60%)' }] : []),
              ...(kama.some(v => v !== null) ? [{ name: 'KAMA', data: kama, color: 'hsl(330 70% 60%)' }] : []),
              ...(ichimokuResult?.senkouA?.some(v => v !== null) ? [{ name: 'Senkou A', data: ichimokuResult.senkouA, color: 'hsl(120 60% 50% / 0.5)' }] : []),
              ...(ichimokuResult?.senkouB?.some(v => v !== null) ? [{ name: 'Senkou B', data: ichimokuResult.senkouB, color: 'hsl(0 60% 50% / 0.5)' }] : []),
            ]}
            guideLines={fibResult ? fibResult.levels
              .filter(l => [0.382, 0.5, 0.618].includes(l.ratio))
              .map(l => ({ value: l.price, label: l.label, color: 'hsl(42 80% 55% / 0.6)' })) : undefined}
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

      {/* OBV Chart */}
      {obv.length > 0 && (
        <div className="mb-6">
          <LineChart
            title="On-Balance Volume (OBV)"
            labels={labels}
            series={[
              { name: 'OBV', data: obv.map(v => v as number | null), color: 'hsl(187 94% 55%)' },
              ...(obvEma.some(v => v !== null) ? [{ name: 'OBV EMA', data: obvEma, color: 'hsl(45 93% 47%)' }] : []),
            ]}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* CVD Chart */}
      {cvdResult && cvdResult.cvd.length > 0 && (
        <div className="mb-6">
          <LineChart
            title="Cumulative Volume Delta (CVD)"
            labels={labels}
            series={[
              { name: 'CVD', data: cvdResult.cvd.map(v => v as number | null), color: 'hsl(187 94% 55%)' },
              ...(cvdResult.cvdEma.some(v => v !== null) ? [{ name: 'CVD EMA', data: cvdResult.cvdEma, color: 'hsl(45 93% 47%)' }] : []),
            ]}
            guideLines={[{ value: 0, label: '0', color: 'hsl(215 20% 40%)' }]}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Correlation Panel */}
      {(btcCorrelation !== null || ethCorrelation !== null) && (
        <div className="glass-panel p-4 mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Cross-Asset Correlation</h3>
          <div className="grid grid-cols-2 gap-4">
            {btcCorrelation !== null && (
              <div className="text-center">
                <div className="text-[10px] text-muted-foreground">vs BTC</div>
                <div className={`text-lg font-bold ${
                  btcCorrelation > 0.8 ? 'text-green-400' :
                  btcCorrelation > 0.5 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {btcCorrelation.toFixed(3)}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {btcCorrelation > 0.8 ? 'Highly correlated' :
                   btcCorrelation > 0.5 ? 'Moderate' :
                   btcCorrelation > 0.3 ? 'Weak' : 'Decoupled'}
                </div>
              </div>
            )}
            {ethCorrelation !== null && (
              <div className="text-center">
                <div className="text-[10px] text-muted-foreground">vs ETH</div>
                <div className={`text-lg font-bold ${
                  ethCorrelation > 0.8 ? 'text-green-400' :
                  ethCorrelation > 0.5 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {ethCorrelation.toFixed(3)}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {ethCorrelation > 0.8 ? 'Highly correlated' :
                   ethCorrelation > 0.5 ? 'Moderate' :
                   ethCorrelation > 0.3 ? 'Weak' : 'Decoupled'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Signals Panel */}
      {snapshots.length > 0 && (
        <div className="mb-6">
          <SignalsPanel
            snapshots={snapshots}
            qualifiedSignals={qualifiedSignals}
          />
        </div>
      )}

    </div>
  )
}
