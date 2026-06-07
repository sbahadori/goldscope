# GoldScope v2.41.3-ui.1 - Technical Dashboard Panel

Builds on v2.41.2.9 stable operator-facing checkpoint.

Purpose:
Add the uploaded XAUUSD technical dashboard concept as a safe, snapshot-driven UI panel.

Important design decision:
This is a UI panel only. It is not part of:
- AI report generation
- report post-processing
- validators
- macro logic
- employment computation
- strategy scoring
- decision gates

What was changed:
1. Added `TechnicalDashboardPanel()` inside App.jsx.
2. Added a new `Technical` tab.
3. Added the panel under the Home/Overview TradingView chart.
4. Uses existing `technicalContext` state.
5. Provides a `Refresh technical` button that calls the existing `loadTechnicalContext()`.
6. Uses pure React + SVG for the level map.
7. Does not use Chart.js CDN.
8. Does not use Math.random().
9. Does not simulate price history.
10. Preserves the uploaded HTML as reference only:
   `docs/prototypes/xauusd_technical_dashboard_prototype_reference.html`

Panel rules:
- Technical context is confirmation-only.
- It cannot override macro/event uncertainty.
- GC=F is labeled as a futures proxy, not direct spot XAUUSD.
- The level map is a snapshot-level map, not historical candles.

Preserved:
- v2.41.2.9 canonical report rebuild
- validators
- macro logic
- employment event intelligence
- technical computation
- strategy modules
- Safe Report high-severity fallback
- npm scripts: dev/build/preview

No credential/FRED key files included or overwritten.
