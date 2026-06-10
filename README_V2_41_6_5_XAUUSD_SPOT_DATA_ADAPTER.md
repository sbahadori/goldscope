# GoldScope v2.41.6.5 - XAUUSD Spot Data Adapter

Goal:
Use OANDA:XAUUSD spot as the primary market source for TradingView, Technical Dashboard, Analytics, and Trade Targets.

Primary source:
- OANDA:XAUUSD
- OANDA instrument: XAU_USD
- Source type: spot

Fallback:
- Yahoo:XAUUSD=X
- Yahoo:GC=F futures proxy
- Stooq daily xauusd

Security:
- Do not put OANDA tokens in React/browser code.
- React calls local backend endpoint `/api/oanda/...`.
- Local backend `server/oandaProxy.js` calls OANDA with secrets from environment variables.

Required environment variables:
```bash
export OANDA_API_TOKEN="..."
export OANDA_ACCOUNT_ID="..."
export OANDA_ENV="practice"   # or live
```

Run:
```bash
npm install
npm run server:oanda
npm run dev
```

New files:
- `server/oandaProxy.js`
- `src/api/marketDataClient.js`
- `vite.config.js`

Snapshot marketSource:
```js
snapshot.marketSource = {
  primary: "OANDA:XAUUSD",
  instrument: "XAU_USD",
  sourceType: "spot",
  fallback: "Yahoo:GC=F",
  active: "OANDA:XAUUSD",
  isProxy: false,
  providerStatus: "ok"
}
```

If OANDA fails, fallback remains available and the UI shows a proxy warning.

Preserved:
- AI report logic
- Section 11
- BLS parser
- Technical indicator calculations
- TradeScenarioPlan generation
