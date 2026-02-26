

# Plan: Replicate Full CryptoTrendNotify GitHub Source Code

## Overview

The original GitHub repository is a large, feature-rich crypto momentum dashboard with ~30+ source files across components, libraries, hooks, and types. The current Lovable project has a simplified version. This plan will bring the codebase as close as possible to the original, with one key constraint: **backend features** (Node.js push server, Docker, service worker) cannot run in Lovable, so those will be adapted as client-side stubs.

## What's Missing vs. the Original

The original repo has significantly more functionality than what's currently implemented:

1. **Signal Engine** -- Multi-timeframe combined signal evaluation with Markov priors, ADX, trend scoring (1,150+ lines in `signals.ts`)
2. **Quantum Analysis** -- Quantum flip threshold synthesis, Markov transition matrices, composite signals (2,270+ lines in `quantum.ts`)  
3. **Heatmap Integration** -- Fetches heatmap snapshots from a backend API, used for signal derivation
4. **Hedging Calculator** -- ATR-driven hedge decision engine with position management
5. **Expert Signals Panel** -- Fusion-weighted multi-timeframe signal dashboard with presets (Balanced/Scalper/Swing)
6. **Signals Panel** -- Full signals panel with timeframe overview cards, trend bias breakdowns, quantum prediction panels
7. **14 signal sub-components** -- Badge, MarkovPriorGauge, PercentageBar, PlaceholderCard, QuantumFlipThresholdCard, QuantumPredictionPanel, SignalHighlights, TimeframeOverviewCard, TrendBiasBreakdown, etc.
8. **Notification Dialog** -- Portal-based accessible dialog for push notification settings
9. **Push Notifications Hook** -- Client-side push subscription management
10. **Enhanced Indicators** -- ADX (Average Directional Index), ATR calculations
11. **Multi-frame Market Data** -- `useMultiFrameMarketData` hook for parallel timeframe queries
12. **Skeleton Loading States** -- ChartSkeleton, SignalCardSkeleton components
13. **App.tsx as main orchestrator** -- The original `App.tsx` is 945 lines containing all momentum detection, MA cross detection, quantum analysis, and notification logic

## Implementation Steps

### Step 1: Update Type Definitions
Add missing types across 4 type files:
- `src/types/app.ts` -- Add `MomentumComputation`, `QuantumPhaseNotification`
- `src/types/signals.ts` -- New file with `SignalDirection`, `SignalStrength`, `CombinedSignal`, `MultiTimeframeSignal`, `TradingSignal`, `TimeframeSignalSnapshot`, etc. (~176 lines)
- `src/types/heatmap.ts` -- New file with `HeatmapResult`, `HeatmapSnapshot` types (~123 lines)

### Step 2: Expand Indicator Library
Update `src/lib/indicators.ts` to match the original (~535 lines):
- Add `calculateADX` with DI+/DI- and smoothing
- Add `calculateATR` (Average True Range)
- Add `calculateSMA` improvements
- Align existing RSI/EMA/MACD/StochRSI implementations

### Step 3: Add Signal Engine
Create `src/lib/signals.ts` (~1,154 lines):
- `deriveSignalsFromHeatmap()` -- Derives trading signals from heatmap data
- `deriveTimeframeSnapshots()` -- Creates per-timeframe signal snapshots
- `getMultiTimeframeSignal()` -- Weighted multi-TF signal aggregation
- Markov prior integration, ADX confirmation, trend scoring

### Step 4: Add Quantum Analysis Engine
Create `src/lib/quantum.ts` (~2,274 lines):
- Markov transition matrix construction
- Quantum amplitude calculations
- `deriveQuantumCompositeSignal()` -- Main composite signal derivation
- Flip threshold synthesis and phase angle calculations

### Step 5: Add Hedging Engine
Create `src/lib/hedging.ts` (~235 lines):
- `calculateHedge()` function
- ATR-driven hedge decision logic
- Position and exposure calculations

### Step 6: Add Heatmap Data Layer
- Create `src/lib/heatmap.ts` (~81 lines) -- Fetch heatmap results (will work as stub without backend)
- Create `src/hooks/useHeatmapData.ts` -- React Query hook for heatmap data

### Step 7: Add Notification Infrastructure (Client-Side Only)
- Create `src/lib/notifications.ts` (~232 lines) -- App notification helpers, push subscription management (adapted for client-only use)
- Create `src/hooks/usePushNotifications.ts` (~100 lines) -- Push notification state management

### Step 8: Update Market Data Hook
Update `src/hooks/useMarketData.ts` to add `useMultiFrameMarketData` for parallel multi-timeframe queries

### Step 9: Create Signal UI Components
Create the `src/components/signals/` directory with all sub-components:
- `Badge.tsx`, `PercentageBar.tsx`, `PlaceholderCard.tsx`
- `MarkovPriorGauge.tsx` -- SVG gauge for Markov priors
- `TimeframeOverviewCard.tsx` -- Per-timeframe signal card
- `TrendBiasBreakdown.tsx` -- MACD trend score visualization
- `SignalHighlights.tsx` -- Qualified signal highlights
- `QuantumFlipThresholdCard.tsx` -- Quantum flip visualization
- `QuantumPredictionPanel.tsx` -- Quantum prediction display
- `MultiTimeframeSummary.tsx` -- Multi-TF bias summary
- `SignalsPanel.tsx` -- Main signals panel container
- `constants.ts`, `types.ts`, `utils.ts`, `quantumFlipThresholdShared.ts`

### Step 10: Create Main Panels
- Create `src/components/ExpertSignalsPanel.tsx` (~463 lines) -- Fusion-weighted expert panel
- Create `src/components/HedgingCalculatorPanel.tsx` (~544 lines) -- ATR hedge calculator
- Create `src/components/NotificationDialog.tsx` (~165 lines) -- Accessible notification dialog
- Create `src/components/skeletons.tsx` (~92 lines) -- Loading skeletons

### Step 11: Create DashboardView Component
Create `src/components/DashboardView.tsx` (~1,179 lines) -- The main dashboard rendering component with:
- Momentum notification cards
- MA cross notification cards
- Quantum phase notifications
- Price chart with MA overlays
- RSI, Stochastic RSI, MACD charts
- Signals panel integration
- Expert signals panel
- Hedging calculator panel

### Step 12: Rewrite App.tsx as Main Orchestrator
Rewrite `src/App.tsx` / `src/pages/Index.tsx` to match the original 945-line `App.tsx`:
- Full momentum detection engine
- Moving average cross detection
- Quantum phase notification system
- Multi-timeframe data orchestration
- Control bar with symbol/timeframe/refresh/bar-limit controls
- Push notification integration (client-side)

### Step 13: Update Styling and Layout
- Update `src/index.css` to match original (Tailwind v4 `@import "tailwindcss"` style)
- Update `src/layouts/MainLayout.tsx` to match original exactly
- Update `src/constants/timeframes.ts` with `TimeframeOption` type

## Important Notes

- **Backend limitation**: The push server (`server/` directory), Docker setup, and service worker (`sw.ts`) cannot be replicated in Lovable. Push notification features will be present in the UI but won't connect to a real push server.
- **Heatmap API**: The heatmap feature requires a backend API. The frontend code will be present but will gracefully handle missing data.
- **Code volume**: This is a very large implementation (~8,000+ lines of new code across 30+ files). It will be implemented incrementally across multiple steps.

