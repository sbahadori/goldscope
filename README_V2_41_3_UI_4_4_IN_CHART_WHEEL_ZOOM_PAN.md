# GoldScope v2.41.3-ui.4.4 - In-Chart Wheel Zoom + Pan

Builds on v2.41.3-ui.4.2.

Fixes previous wrong approach:
- v2.41.3-ui.4.3 used focus/crop buttons.
- This version implements zoom inside the same chart frame, closer to TradingView behavior.

Added:
1. Mouse wheel horizontal zoom inside the chart.
2. Drag/pan inside the same chart.
3. Reset zoom button.
4. Visible range indicator.
5. Works in normal and maximize chart mode.

Behavior:
- Wheel up/down changes visible candle count.
- Drag left/right pans through stored OHLC candles.
- Data is never simulated; it only changes the visible window over stored real candles.

Preserved:
- No report generator changes.
- No validator changes.
- No macro/employment logic changes.
- No BLS parser changes.
- No synthetic data.
- No Math.random.
- No TradingView/Chart.js/CDN added.
