# CryptoTrendNotify – Crypto Momentum Dashboard

Real-time crypto momentum insights with RSI, MACD, and Stochastic RSI indicators.

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install and run

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:8080`.

### Build for production

```bash
npm run build
```

### Run tests

```bash
npm test
```

## Authentication

Registration / sign-in is handled by **Cloudflare Access One-Time PIN (OTP)** — no
database, no email service, no auth code. Approved emails receive a one-time PIN to log
in. See [docs/AUTH.md](docs/AUTH.md) for the one-time Cloudflare Zero Trust setup.

## Tech Stack

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [Supabase](https://supabase.com/) for backend
- [Recharts](https://recharts.org/) for charts
- [React Query](https://tanstack.com/query) for data fetching
