# GoldScope v2.41.3-ui.4.4.5 - Maximize-Only Zoom/Pan

Builds on v2.41.3-ui.4.4.4.

Change:
- Normal Technical chart no longer supports wheel zoom or drag/pan.
- Normal mode is hover-only.
- Maximize mode keeps wheel zoom, drag/pan, Reset zoom, hover values, and full legend.

Why:
The normal chart should remain stable inside the dashboard layout. TradingView-like zoom/pan should happen only after opening the chart in maximize mode.

Preserved:
- Hover tooltip in normal mode.
- Synced hover values.
- Full maximize tooltip/legend.
- ErrorBoundary.
- No report generator changes.
- No validator changes.
- No macro/employment/BLS parser changes.
- No synthetic data.
- No Math.random.
- No TradingView/Chart.js/CDN added.
