# GoldScope v2.41.6.5.4 - Market Proxy Health + Start Fix

Root cause of the latest error:
If OANDA, Yahoo, GC=F, and Stooq all return HTTP 502 at the same time, the usual cause is not indicator logic. It usually means the market proxy is not running or Vite is not reaching it.

Fix:
- Added `checkMarketProxyHealth()` before technical data loading.
- If `/api/market/health` is not reachable, the app stops early with a clear message.
- Added `npm run dev:full` to start both:
  - `server/marketProxy.js`
  - Vite dev server

Run:
```bash
npm install
npm run dev:full
```

Or separate terminals:
```bash
npm run server:market
npm run dev
```

Health check:
```bash
curl http://localhost:8787/api/market/health
```

OANDA config on Windows cmd:
```cmd
set OANDA_API_TOKEN=...
set OANDA_ACCOUNT_ID=...
set OANDA_ENV=practice
npm run dev:full
```

If OANDA is not configured:
- OANDA route returns JSON 503.
- Yahoo/Stooq fallback is attempted if upstreams are reachable.
- If all external upstreams are blocked/unreachable, the app now reports that clearly.

No artificial price data is generated.
