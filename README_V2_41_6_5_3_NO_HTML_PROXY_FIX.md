# GoldScope v2.41.6.5.9 - No HTML Proxy Fix

Root cause:
The app was still checking Ollama through `/api/ollama`. If Vite did not proxy that path, Vite returned React HTML, producing:
`Unexpected token '<', "<script ty"... is not valid JSON`.

Fix:
- Ollama is no longer routed through Vite `/api/ollama`.
- The frontend calls Ollama directly:
  `http://localhost:11434/api/tags`
  `http://localhost:11434/api/chat`
- Vite proxy is market-data only:
  - `/api/oanda`
  - `/api/yahoo`
  - `/api/stooq`
  - `/api/market`
- The JSON parser now detects HTML responses and reports the real routing problem.

Run:
```bash
npm install
npm run server:market
npm run dev
```

Before AI:
```bash
curl http://localhost:11434/api/tags
```

Before market data:
```bash
curl http://localhost:8787/api/market/health
```

Important:
Ollama must allow browser requests from the Vite origin. If browser CORS blocks direct Ollama requests, set:
```bash
set OLLAMA_ORIGINS=*
ollama serve
```
or configure Ollama for your local Vite origin.

This version avoids the previous bug where Ollama/internal proxy received React HTML instead of JSON.
