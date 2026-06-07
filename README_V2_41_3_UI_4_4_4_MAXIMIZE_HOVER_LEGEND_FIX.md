# GoldScope v2.41.3-ui.4.4.4 - Maximize Hover + Legend Fix

Builds on v2.41.3-ui.4.4.3.

Fix:
The normal chart had synced hover values and full legend details, but maximize mode still used an older duplicated SVG/legend block.

Changes:
1. Adds synced hover values inside maximize SVG:
   - Volume
   - RSI
   - MACD / Signal / Histogram
   - ADX / +DI / -DI
2. Replaces minimal maximize legend with full legend:
   - current indicators
   - hovered candle values
   - visible range
   - clustered support/resistance zones
3. Keeps wheel zoom, drag/pan, Reset zoom and Close in maximize mode.

Preserved:
- No report generator changes.
- No validators changes.
- No macro/employment logic changes.
- No BLS parser changes.
- No synthetic data.
- No Math.random.
- No TradingView/Chart.js/CDN added.
