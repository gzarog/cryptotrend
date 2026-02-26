interface MarketSummaryProps {
  symbol: string
  price: number | null
  priceChange: { difference: number; percent: number } | null
  high24h?: number
  low24h?: number
  volume24h?: number
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (price >= 1) return price.toFixed(4)
  return price.toFixed(6)
}

export function MarketSummary({ symbol, price, priceChange }: MarketSummaryProps) {
  const isPositive = priceChange && priceChange.difference >= 0
  const changeColor = isPositive ? 'text-momentum-green' : 'text-momentum-red'

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
      </div>
    </div>
  )
}
