# GoldScope v2.41.6.5.6 - Error Boundary + Analytics Stability Fix

Purpose:
Prevent a render error inside the Technical or Trade Targets panels from white-screening the whole Analytics page.

Changes:
- Hoisted `TechnicalPanelErrorBoundary` to module-level before `App`.
- Added module-level `GeneralErrorBoundary`.
- Wrapped `TechnicalDashboardPanel` with `TechnicalPanelErrorBoundary` in `ProductAnalyticsPage`.
- Wrapped `TradeScenarioDashboardPanel` with `GeneralErrorBoundary` in `ProductAnalyticsPage`.
- Changed TradingView embed symbol from `OANDA:XAUUSD` to direct `XAUUSD`.
- Preserved technical engine, macro logic, employment logic, BLS parser, market proxy, and tradeScenarioPlan logic.

Why:
Class components used as Error Boundaries must not be recreated inside a function component render path. Panel-level boundaries prevent one UI panel failure from bubbling to the root.

Run:
```bash
npm install
npm run dev:full
```

Health:
```text
http://localhost:8787/api/market/health
```
