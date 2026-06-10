# GoldScope v2.41.6.5.9 - Force OANDA Spot Source / No Silent GC=F Fallback

Purpose:
Fix source arbitration. OANDA:XAUUSD spot must be the primary source when OANDA credentials are configured. GC=F/Yahoo fallback must never be silent.

Changes:
- `/api/market/health` now returns:
  - `oandaConfigured`
  - `credentialsFileLoaded`
  - `oandaCandlesOk`
  - `oandaCandlesError`
  - `oandaPricingOk`
  - `oandaPricingError`
- `loadBestTechnicalCandles()` uses OANDA-first source arbitration.
- If OANDA succeeds, selected source is `OANDA:XAUUSD` and fallback is not used.
- If OANDA fails, the exact OANDA failure is stored in:
  - `selected.sourceArbitration.oandaFailure`
  - `technicalContext.sourceArbitration.oandaFailure`
  - `marketSource.oandaFailure`
- If fallback is used, marketSource is marked:
  - `fallbackUsed=true`
  - `proxyRestricted=true`
  - `diagnosticOnly=true`
  - `exactSpotTargets=false`
- Trade Targets panel explicitly shows:
  `Proxy mode - not valid for exact spot targets.`
- Trade scenario plan is marked:
  - `mode="diagnostic_proxy_mode"` if OANDA spot is not active
  - `diagnosticOnly=true`
  - `executionAllowed=false`

Run:
```cmd
npm install
npm run dev
```

Health:
```text
http://localhost:5173/api/market/health
```

Expected if OANDA is healthy:
```json
{
  "ok": true,
  "oandaConfigured": true,
  "credentialsFileLoaded": true,
  "oandaCandlesOk": true,
  "oandaPricingOk": true
}
```

If OANDA fails:
- Technical source may fallback to Yahoo/GC=F.
- Trade Targets becomes diagnostic/proxy mode.
- OANDA failure is displayed and stored; fallback is not silent.

No secrets are included in this package.
