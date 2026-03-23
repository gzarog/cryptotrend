interface MarketSummaryProps {
  symbol: string
  price: number | null
  priceChange: { difference: number; percent: number } | null
  high24h?: number
  low24h?: number
  volume24h?: number
  fundingRate?: number | null
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (price >= 1) return price.toFixed(4)
  return price.toFixed(6)
}

export function MarketSummary({ symbol, price, priceChange, fundingRate }: MarketSummaryProps) {
  const isPositive = priceChange && priceChange.difference >= 0
  const changeColor = isPositive ? 'text-momentum-green' : 'text-momentum-red'

  const fundingColor = fundingRate != null
    ? Math.abs(fundingRate) >= 0.0005
      ? 'text-red-400'
      : fundingRate > 0 ? 'text-yellow-400' : 'text-green-400'
    : 'text-muted-foreground'

  return (
    <div className="glass-panel p-6 mb-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-foreground">
              {symbol.replace('USDT', '')}
              <span className="text-muted-foreground font-normal">/USDT</span>
            </h2>
            <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              Perpetual
            </span>
          </div>
          {price !== null && (
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold tracking-tight text-foreground">
                ${formatPrice(price)}
              </span>
              {priceChange && (
                <span className={`text-lg font-semibold ${changeColor}`}>
                  {isPositive ? '+' : ''}{priceChange.difference.toFixed(2)} ({isPositive ? '+' : ''}{priceChange.percent.toFixed(2)}%)
                </span>
              )}
            </div>
          )}
          {price === null && (
            <div className="h-12 w-48 bg-muted/30 rounded-lg animate-pulse" />
          )}
        </div>
        {fundingRate != null && (
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Funding Rate</div>
            <div className={`text-lg font-bold ${fundingColor}`}>
              {(fundingRate * 100).toFixed(4)}%
            </div>
            <div className="text-[10px] text-muted-foreground">
              {fundingRate > 0 ? 'Longs pay' : 'Shorts pay'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
