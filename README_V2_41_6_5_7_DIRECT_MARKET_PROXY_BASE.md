# GoldScope v2.41.6.5.9 - Direct Market Proxy Base

Problem:
The app was calling market data through Vite relative paths such as `/api/market/health`.
When the backend market proxy was unavailable, Vite returned HTTP 502 and the error was ambiguous.

Fix:
- Frontend market data calls now go directly to:
  `http://localhost:8787`
- A helper was added:
  `MARKET_PROXY_BASE`
  `marketApiUrl(path)`
- Market calls no longer depend on Vite proxy for health/OANDA/Yahoo/Stooq.
- Added:
  `npm run check:market`

Run:
```cmd
npm install
npm run dev:full
```

Test:
```cmd
npm run check:market
```

Or open:
```text
http://localhost:8787/api/market/health
```

Expected:
```json
{
  "ok": true,
  "oandaConfigured": true,
  "credentialsFileLoaded": true
}
```

If you need another proxy port:
```js
localStorage.setItem("goldscope.marketProxyBase", "http://localhost:8788")
```

Then refresh the browser.
