# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CryptoTrendNotify** is a real-time crypto momentum dashboard with advanced multi-timeframe technical analysis, Bayesian signal confidence tracking, and real-time notifications.

### Architecture at a Glance

The app is split into **three layers**:

1. **Frontend (React + Vite)** — `src/` directory
   - Real-time price/indicator calculations in the browser
   - Multi-timeframe momentum detection with RSI, MACD, Stochastic RSI
   - Notification state management (localStorage-persisted)
   - PWA support for offline capability

2. **Backend Worker (Cloudflare)** — `worker/` directory
   - Cron-triggered signal detection and push/email delivery (every 5 minutes)
   - Push notification subscription management (Web Push standard)
   - Email alert toggle (Resend API)
   - Cloudflare Access integration for authentication

3. **Data Source** — Bybit public API
   - Fetches OHLCV candles (paginated, up to 5000 bars per request)
   - Ticker data (funding rate, mark price, open interest)
   - No authentication required (public endpoints)

### Authentication

The app uses **Cloudflare Access One-Time PIN (OTP)** at the edge — no database, no email service required. Users receive a one-time PIN when accessing the app if their email is on the allowlist. See `docs/AUTH.md` for setup details.

## Development

### Setup

```bash
npm install
```

### Run Development Server

```bash
# Frontend (React dev server on port 8080)
npm run dev

# Worker (Cloudflare dev mode on port 8787, with frontend proxying to it)
npm run dev:worker
```

The frontend proxies `/api` requests to `localhost:8787` (see `vite.config.ts`).

### Build & Deployment

```bash
# Build for production
npm run build

# Build for development (unminified)
npm run build:dev

# Watch mode (rebuilds on file changes)
npm run build:watch

# Deploy to Cloudflare Workers
wrangler publish
```

### Linting & Testing

```bash
# Run ESLint
npm run lint

# Run tests (all test suites once)
npm test

# Run tests in watch mode
npm test:watch
```

Tests are located in `src/test/` and configured in `vitest.config.ts` with jsdom environment.

## Key Source Structure

### Frontend (`src/`)

- **`pages/Index.tsx`** — Main dashboard page. Orchestrates data fetching, multi-timeframe computations, signal derivation, and notification triggers.
- **`components/`** — React UI components:
  - `DashboardView.tsx` — Lays out charts, indicators, and signal panels.
  - `ControlBar.tsx` — Symbol/timeframe/refresh controls.
  - `NotificationPanel.tsx` & `NotificationDialog.tsx` — Notification UIs.
  - `signals/SignalsPanel.tsx` — Renders multi-timeframe signals and confluence.
  - `LineChart.tsx` — Recharts-based candlestick and indicator overlays.
  - `ui/` — shadcn/ui component library (pre-built, don't edit directly).
  - `skeletons.tsx` — Loading placeholders.

- **`hooks/useMarketData.ts`** — React Query hooks for data fetching:
  - `useMarketData()` — Fetches primary timeframe candles from Bybit.
  - `useMultiFrameMarketData()` — Fetches 9 timeframes in parallel ([5m, 15m, 30m, 1h, 2h, 4h, 6h, 1D, 1W]).
  - `useTickerData()` — Fetches funding rate, mark price, and 24h volume.
  - `useOpenInterestData()` — Fetches open interest for the primary timeframe.
  - `useCorrelationData()` — Fetches BTC and ETH candles for cross-asset correlation.

- **`lib/`** — Core trading logic:
  - `indicators.ts` — 20+ technical indicators: RSI, EMA, SMA, MACD, Stochastic RSI, ADX, ATR, Bollinger Bands, Supertrend, OBV, VWAP, Hurst Exponent, Z-Score, Linear Regression, KAMA, Autocorrelation, Volume Spikes, OI Divergence, Ichimoku, Fibonacci, CVD, Correlation.
  - `signals.ts` — Derives trading signals from indicators. Combines RSI, Stochastic, MACD, ADX, MA crosses, Bollinger Bands, OBV, and pattern/divergence analysis into per-timeframe `CombinedSignal` objects. Builds multi-timeframe confluence.
  - `divergence.ts` — Detects regular and hidden bullish/bearish divergences (price vs RSI/MACD).
  - `patterns.ts` — Detects reversal/continuation patterns (double tops, triangles, flags, wedges).
  - `bayesian.ts` — Tracks historical signal accuracy and updates confidence weights (Bayesian priors).
  - `risk.ts` — Calculates support/resistance and stop-loss levels based on ATR.
  - `notifications.ts` — Browser push/audio notification utilities (sound playback, push API).

- **`types/app.ts`** — Data types for candles, notifications (momentum, cross, signal, divergence, funding, regime change, volatility, correlation), and multi-timeframe computations.
- **`types/signals.ts`** — Trading signal types, timeframe snapshots, trend bias, confluence scoring.

### Worker (`worker/`)

- **`index.ts`** — Entry point. Routes for:
  - `POST /api/push/subscribe` — Register a push subscription.
  - `POST /api/push/unsubscribe` — Remove a subscription.
  - `GET /api/push/status` — Health check.
  - `GET /api/me` — Return authenticated user's email (from Cloudflare Access header).
  - `GET /api/email/status` — Check if user is subscribed to email alerts.
  - `POST /api/email/test` — Send a test email.
  - `POST /api/email/toggle` — Toggle email alert subscription.
  - `scheduled` — Cron handler (triggers every 5 minutes).

- **`scheduler.ts`** — Signal detection loop: fetches current price/indicators, checks against stored alert thresholds, sends push + email notifications.
- **`kv.ts`** — KV namespace operations for storing push subscriptions and email preferences.
- **`email.ts`** — Resend API integration for sending alert emails.
- **`push.ts`** — Web Push standard (VAPID key signing and payload delivery).

### Configuration

- **`vite.config.ts`** — Vite build config with React/SWC, PWA plugin (manifest, service worker), alias paths (`@/*`), and dev server proxy to `/api`.
- **`wrangler.toml`** — Cloudflare Worker config: KV namespaces for push subscriptions, alert cooldowns, email preferences; VAPID keys; Resend API key; cron trigger (*/5 * * * *).
- **`tsconfig.json`** — TypeScript config with path aliases (`@/*` → `src/*`), loose type checking (for flexibility).
- **`tailwind.config.ts`** — Tailwind CSS with custom color tokens (momentum, signal).
- **`components.json`** — shadcn/ui config mapping component aliases.
- **`vitest.config.ts`** — Test runner config with jsdom, globals enabled, test file patterns.
- **`eslint.config.js`** — ESLint with TypeScript plugin, React Hooks/Refresh rules.

## Data Flow Diagram

```
User opens app
    ↓
Index.tsx fetches:
  - Primary TF candles (useMarketData)
  - 9 timeframes in parallel (useMultiFrameMarketData)
  - Ticker data (funding rate, mark price, OI)
  - BTC/ETH candles (for correlation)
    ↓
Computations (useMemo):
  - Calculate 20+ indicators per timeframe
  - Build MomentumComputation objects with all latest values
    ↓
Signal Derivation (lib/signals.ts):
  - Per-timeframe: combine RSI, Stochastic, MACD, ADX, MA, BB, pattern signals
  - Bayesian weighting based on historical accuracy
  - Multi-timeframe confluence scoring
    ↓
Notification Triggers (useEffect):
  - Momentum: RSI < 25 && Stoch < 15 → Long (intensity: green/yellow/orange/red)
  - MA Cross: EMA 10 golden/death cross detection
  - Confluence: 3+ timeframes aligned → signal notification
  - Divergence: RSI/MACD divergences (regular + hidden)
  - Funding: funding rate > 0.05% threshold
  - Regime: Hurst exponent regime changes (trending ↔ mean-reverting)
  - Volatility: ATR percentile crosses 80%
  - Correlation: BTC/ETH correlation breakdowns (< 0.3)
    ↓
Notification UX:
  - Browser notifications (title + body)
  - Audio alerts (timeframe-based priority)
  - In-app notification panel with read status
  - localStorage persistence (50 most recent per type)
    ↓
Worker (every 5 minutes):
  - Fetches current candles from Bybit
  - Calculates signals
  - Delivers push notifications (Web Push API)
  - Sends email alerts (Resend) to subscribed users
```

## Key Concepts

### Timeframe-Adaptive Indicator Settings

Different timeframes use different periods to optimize signal quality. For example, RSI uses:
- 5m: period 8
- 15m: period 11
- 1H: period 15
- 1D: period 14

See `RSI_SETTINGS`, `STOCH_SETTINGS`, `MACD_SETTINGS` in `pages/Index.tsx` for all mappings.

### Multi-Timeframe Confluence

Signals are derived independently per timeframe, then scored for alignment:
- A "strong long" confluence means 3+ timeframes show bullish signals with >70% average confidence.
- Markov priors (transition probability estimates from historical data) boost weak signals if they follow typical market patterns.
- Bayesian weights (accuracy tracking) penalize historically inaccurate signal sources.

### Notification Cooldowns

Each notification type has a cooldown to avoid spam:
- Momentum: Per-timeframe cooldown (~1–10 hours depending on timeframe)
- Cross: Per-timeframe cooldown
- Divergence: 2x per-timeframe cooldown
- Confluence: 15 minutes global
- Funding/Regime/Volatility: 30–60 minutes global

### Risk Levels

For each trade direction (long or short), the app calculates:
- Stop-loss: ATR × 2 below entry (for long) or above (for short)
- Take-profit 1: ATR × 3
- Take-profit 2: ATR × 5

### Bayesian Accuracy Tracking

The worker stores prediction accuracy by signal source. If RSI has historically led to -2% returns 60% of the time, its confidence weight is reduced. This is updated every 5 bars.

## Common Tasks

### Add a New Indicator

1. Implement the calculation function in `lib/indicators.ts` (pure, no side effects).
2. Call it in `pages/Index.tsx` within the primary TF and multi-TF computation blocks (useMemo).
3. Add its latest value to `MomentumComputation` type in `types/app.ts`.
4. Render it in `components/IndicatorGrid.tsx` or overlay it on the chart in `components/LineChart.tsx`.

### Add a Notification Type

1. Define the type in `types/app.ts` (extend from `SignalNotification` pattern).
2. Add state in `pages/Index.tsx` (useState + localStorage persistence).
3. Add a useEffect trigger (usually checking a computed value or ref for state changes).
4. Call `showBrowserNotification()` and `playNotificationSound()` from `lib/notifications.ts`.
5. Add a UI component to render it in `components/NotificationPanel.tsx`.
6. If email/push alerts are needed, update `worker/scheduler.ts`.

### Deploy Changes

1. Test locally: `npm run dev` + `npm run dev:worker`.
2. Build: `npm run build`.
3. (Optional) Preview: `npm run preview`.
4. Deploy Worker: `wrangler publish` (assumes `wrangler.toml` and Cloudflare credentials are configured).

### Debug Multi-Timeframe Signals

- Check the **Signals Panel** in the UI — it shows per-timeframe signals and confluence score.
- Open browser DevTools and inspect `window.localStorage['signal-notifications']` to see all stored signal notifications.
- Check the Worker logs in the Cloudflare dashboard for cron execution and delivery errors.

## Troubleshooting

### "Failed to load market data"

- Bybit API might be down or rate-limited. Check `https://api.bybit.com/v5/market/kline` in a browser.
- Verify the symbol is valid (e.g., `BTCUSDT`, not `BTC-USD`).
- If using a VPN, Bybit may block it; try without one.

### Notifications not appearing

- Check browser notification permissions: Settings → Privacy → Notifications.
- Inspect `localStorage['momentum-notifications']` to confirm the notification was created.
- If the worker fails to send push/email: check Cloudflare Worker logs and Resend email delivery logs.
- Ensure push subscription endpoint is valid (PWA banner must appear on first visit).

### Service Worker not updating

- Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac).
- Unregister old SWs: DevTools → Application → Service Workers → Unregister.
- Check `src/sw.ts` for manifest changes (only files matching glob patterns are precached).

## Environment Variables

### Frontend (.env or .env.local)

```
VITE_SUPABASE_URL=https://...supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

### Worker (wrangler.toml / Cloudflare dashboard)

```
RESEND_API_KEY=re_...
VAPID_PRIVATE_KEY=...  (in dashboard, not in wrangler.toml)
```

See `.dev.vars.example` for the local dev template.

## Performance Notes

- **Bybit rate limits**: ~10 requests/second per IP. The app batches requests and caches aggressively via React Query.
- **Indicator computation**: ~20 indicators × 9 timeframes computed every refresh (~2–5 seconds per cycle). This is CPU-bound but fast enough on modern browsers.
- **LocalStorage**: Notifications capped at 50 per type; excess are dropped when new ones arrive.
- **Worker cron**: Runs every 5 minutes; each execution is ~500ms–1s.

## Testing Strategy

- Unit tests for pure functions (indicators, signal derivation, Bayesian updates) in `src/test/`.
- No E2E tests currently; manual testing via the UI is the primary validation.
- Integration with Bybit is tested indirectly by checking that candles load without error.