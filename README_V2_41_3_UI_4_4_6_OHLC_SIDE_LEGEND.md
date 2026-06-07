# GoldScope v2.41.3-ui.4.4.6 - OHLC Side Legend

Builds on v2.41.3-ui.4.4.5.

Change:
- Removes the floating OHLC tooltip from inside the chart.
- Keeps only crosshair/indicator hover markers on the chart.
- Shows OHLC/Volume and indicator values in the right-side chart legend.

Behavior:
- Normal mode: hover-only; OHLC appears in side legend.
- Maximize mode: wheel zoom + drag/pan; OHLC appears in side legend.
- The chart itself is no longer covered by an OHLC tooltip box.

Preserved:
- No report generator changes.
- No validator changes.
- No macro/employment logic changes.
- No BLS parser changes.
- No synthetic data.
- No Math.random.
- No TradingView/Chart.js/CDN added.
