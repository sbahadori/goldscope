# GoldScope v2.41.6.5.8 - Embedded Vite Market Proxy

Problem:
The app depended on a separate market proxy at `http://localhost:8787`. If that process was not running, Technical Context failed with:
`Market proxy is not reachable at http://localhost:8787`.

Fix:
- Market proxy is now embedded inside Vite via `vite.config.js`.
- No separate `npm run server:market` is required for development.
- The app calls same-origin routes:
  - `/api/market/health`
  - `/api/oanda/candles`
  - `/api/oanda/pricing`
  - `/api/yahoo/*`
  - `/api/stooq/*`

Run:
```cmd
npm install
npm run dev
```

or:
```cmd
npm run dev:full
```

Both run Vite with embedded market proxy.

Credentials:
The Vite-side market proxy reads:
```text
C:\src\Gold\_local_secrets\credentials.txt
```

Expected format:
```text
OANDA_API_TOKEN=...
OANDA_ACCOUNT_ID=...
OANDA_ENV=practice
```

Health check in browser:
```text
http://localhost:5173/api/market/health
```

Expected:
```json
{
  "ok": true,
  "embeddedInVite": true,
  "oandaConfigured": true,
  "credentialsFileLoaded": true
}
```

Notes:
- `server/marketProxy.js` remains as optional standalone fallback.
- Development no longer depends on port 8787.
- No secrets are included in the zip.
