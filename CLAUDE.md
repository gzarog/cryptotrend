# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CryptoTrendNotify** is a real-time crypto momentum dashboard with multi-timeframe technical analysis, Bayesian signal confidence tracking, and push/email notifications.

### Architecture

Three layers:

1. **Frontend (React + Vite)** — `src/` — real-time indicator computation in the browser, multi-timeframe signal derivation, PWA with service worker
2. **Backend Worker (Cloudflare Workers)** — `worker/` — cron-triggered signal detection every 5 minutes, Web Push delivery, email alerts via Resend
3. **Data Source** — Bybit public API (no auth required) — OHLCV candles, ticker data, open interest

Authentication uses **Cloudflare Access OTP** at the edge — see `docs/AUTH.md` for setup.

## Development Commands

```bash
npm install

# Frontend dev server (port 8080)
npm run dev

# Worker dev mode (port 8787); frontend proxies /api to it
npm run dev:worker

# Build for production / development / watch
npm run build
npm run build:dev
npm run build:watch

# Lint
npm run lint

# Tests
npm test           # run once
npm run test:watch # watch mode

# Deploy worker (requires wrangler auth + wrangler.toml configured)
wrangler deploy
```

Tests live in `src/test/` and run under jsdom via Vitest.

## Key Source Structure

### Frontend (`src/`)

- **`pages/Index.tsx`** — Main orchestrator: data fetching, multi-timeframe indicator computation (useMemo), signal derivation, and notification triggers (useEffect). Also defines `RSI_SETTINGS`, `STOCH_SETTINGS`, `MACD_SETTINGS` — per-timeframe period overrides.
- **`hooks/useMarketData.ts`** — React Query hooks: `useMarketData` (primary TF), `useMultiFrameMarketData` (9 TFs in parallel: 5m/15m/30m/1h/2h/4h/6h/1D/1W), `useTickerData`, `useOpenInterestData`, `useCorrelationData`.
- **`lib/indicators.ts`** — 20+ pure indicator functions: RSI, EMA, SMA, MACD, Stochastic RSI, ADX, ATR, Bollinger Bands, Supertrend, OBV, VWAP, Hurst Exponent, Ichimoku, Fibonacci, CVD, Correlation, and more.
- **`lib/signals.ts`** — Combines indicators into per-timeframe `CombinedSignal` objects and builds multi-timeframe confluence scores with Markov priors and Bayesian weighting.
- **`lib/divergence.ts`** — Regular and hidden RSI/MACD divergence detection.
- **`lib/patterns.ts`** — Chart pattern detection (double tops, triangles, flags, wedges).
- **`lib/bayesian.ts`** — Tracks historical signal accuracy and updates confidence weights.
- **`lib/risk.ts`** — ATR-based stop-loss and take-profit levels.
- **`lib/notifications.ts`** — Browser push and audio notification utilities.
- **`types/app.ts`** — Candle, notification, and `MomentumComputation` types.
- **`types/signals.ts`** — `CombinedSignal`, `TimeframeSnapshot`, confluence/trend bias types.
- **`integrations/supabase/`** — Auto-generated Supabase client (uses `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`).
- **`components/ui/`** — shadcn/ui library components — do not edit directly.

### Worker (`worker/`)

- **`index.ts`** — HTTP routes: `POST /api/push/subscribe|unsubscribe`, `GET /api/push/status`, `GET /api/me`, `GET|POST /api/email/status|test|toggle`; plus the `scheduled` cron handler.
- **`scheduler.ts`** — Signal detection loop that fetches Bybit data, evaluates thresholds, and triggers push + email delivery.
- **`kv.ts`** — Cloudflare KV operations for push subscriptions, alert cooldowns, and email prefs.
- **`email.ts`** — Resend API integration.
- **`push.ts`** — Web Push / VAPID signing and payload delivery.
- **`signals.ts`** — Signal computation shared with the worker cron (mirrors frontend logic).

### Configuration

- **`vite.config.ts`** — React/SWC, PWA plugin, `@/*` alias to `src/`, dev proxy `/api` → `localhost:8787`.
- **`wrangler.toml`** — Worker name, KV namespaces (`PUSH_SUBSCRIPTIONS`, `ALERT_COOLDOWNS`, `EMAIL_SUBSCRIPTIONS`), VAPID public key, Resend API key, cron `*/5 * * * *`.
- **`vitest.config.ts`** — jsdom environment, globals enabled.

## Data Flow

```
Index.tsx
  → useMultiFrameMarketData: fetch 9 TFs from Bybit
  → useMemo: compute 20+ indicators per TF → MomentumComputation[]
  → lib/signals.ts: derive CombinedSignal per TF, score confluence
  → useEffect: check thresholds → showBrowserNotification() / playNotificationSound()
  → localStorage: persist last 50 notifications per type

Worker (cron every 5 min)
  → scheduler.ts: fetch Bybit → compute signals → KV cooldown check
  → push.ts: Web Push to subscribed browsers
  → email.ts: Resend email to opted-in users
```

## Key Concepts

**Timeframe-adaptive settings**: RSI/MACD/Stoch use different periods per timeframe (e.g., RSI period 8 on 5m, 14 on 1D). Defined as `*_SETTINGS` maps in `pages/Index.tsx`.

**Multi-timeframe confluence**: Signals are scored independently per TF, then aligned. "Strong long" = 3+ TFs bullish with >70% average confidence. Markov priors and Bayesian weights (from `lib/bayesian.ts`) adjust per-source confidence.

**Notification cooldowns**: Per notification type — momentum/cross cooldowns scale with timeframe (~1–10h), divergence is 2× that, confluence/funding/regime/volatility are global (15–60 min). Stored in Cloudflare KV (`ALERT_COOLDOWNS`).

**Risk levels**: Stop-loss = ATR × 2 from entry; TP1 = ATR × 3; TP2 = ATR × 5.

## Adding an Indicator

1. Implement a pure function in `lib/indicators.ts`.
2. Call it in `pages/Index.tsx` inside the primary TF and multi-TF `useMemo` blocks.
3. Add the output field to `MomentumComputation` in `types/app.ts`.
4. Render in `components/IndicatorGrid.tsx` or overlay on `components/LineChart.tsx`.

## Adding a Notification Type

1. Define the type in `types/app.ts`.
2. Add `useState` + localStorage persistence in `pages/Index.tsx`.
3. Add a `useEffect` trigger against a computed value or ref.
4. Call `showBrowserNotification()` and `playNotificationSound()` from `lib/notifications.ts`.
5. Render in `components/NotificationPanel.tsx`.
6. If push/email delivery is needed, update `worker/scheduler.ts`.

## Environment Variables

**Frontend** (`.env.local`):
```
VITE_SUPABASE_URL=https://...supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

**Worker** (`wrangler.toml` or Cloudflare dashboard secrets):
```
RESEND_API_KEY=re_...
VAPID_PRIVATE_KEY=...   # set as secret in Cloudflare dashboard, not in wrangler.toml
```

See `.dev.vars.example` for the local dev template.
