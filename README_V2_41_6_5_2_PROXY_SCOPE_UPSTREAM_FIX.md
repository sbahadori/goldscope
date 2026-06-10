# GoldScope v2.41.6.5.2 - Proxy Scope + Upstream Fallback Fix

Problem:
v2.41.6.5.1 proxied all `/api/*` traffic to the market proxy. That could break unrelated internal routes such as Ollama/internal proxy.

Fix:
- Vite now proxies only:
  - `/api/oanda`
  - `/api/yahoo`
  - `/api/stooq`
  - `/api/market`
- Other `/api/*` routes are no longer captured by the market proxy.
- Market proxy now tries multiple upstreams:
  - Yahoo: query1 then query2
  - Stooq: stooq.com then stooq.pl
- Error bodies are clearer.

Run:
```bash
npm install
npm run server:market
npm run dev
```

Health check:
```bash
curl http://localhost:8787/api/market/health
```

OANDA env:
```bash
export OANDA_API_TOKEN="..."
export OANDA_ACCOUNT_ID="..."
export OANDA_ENV="practice"
```

If OANDA is not configured:
- OANDA returns JSON 503.
- Yahoo/Stooq fallback still works if upstreams are reachable.
- Ollama/internal routes are not hijacked by marketProxy anymore.
