# GoldScope v2.41.6.5.1 - Internal Proxy Routing Fix

Root cause of the error:
- Vite was only proxying `/api/oanda`.
- Existing fallback code still calls `/api/yahoo/...` and `/api/stooq/...`.
- When those routes were not proxied, Vite returned React HTML, causing:
  `Unexpected token '<', "<script ty"... is not valid JSON`.

Fix:
- Added one unified backend proxy: `server/marketProxy.js`
- Vite now proxies all `/api/*` routes to `http://localhost:8787`
- Supported routes:
  - `/api/oanda/candles`
  - `/api/oanda/pricing`
  - `/api/yahoo/*`
  - `/api/stooq/*`
  - `/api/market/health`

Run:
```bash
npm install
npm run server:market
npm run dev
```

OANDA env:
```bash
export OANDA_API_TOKEN="..."
export OANDA_ACCOUNT_ID="..."
export OANDA_ENV="practice"
```

If OANDA is not configured:
- `/api/oanda/*` returns clear JSON 503
- Yahoo/Stooq fallback routes still work through the same market proxy
- React no longer receives HTML for market data routes

Preserved:
- OANDA primary source
- Yahoo/GC=F fallback
- Technical indicator calculations
- TradeScenarioPlan logic
- AI report logic
