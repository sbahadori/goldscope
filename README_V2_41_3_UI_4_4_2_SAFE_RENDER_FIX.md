# GoldScope v2.41.3-ui.4.4.2 - Technical Safe Render Fix

Builds on v2.41.3-ui.4.4.1.

Fixes:
1. Adds a `focusedSvgStyle = chartSvgStyle` fallback because the zoom/pan patch used `focusedSvgStyle` while the v4.2 base defines `chartSvgStyle`.
2. Wraps the Technical tab in a React error boundary.
   - If a UI render error remains, the tab shows an error card instead of white-screening the whole app.

Preserved:
- In-chart wheel zoom.
- Drag/pan.
- Reset zoom.
- Maximize chart.
- No report generator changes.
- No validator changes.
- No macro/employment logic changes.
- No BLS parser changes.
- No synthetic data.
- No Math.random.
- No TradingView/Chart.js/CDN added.
