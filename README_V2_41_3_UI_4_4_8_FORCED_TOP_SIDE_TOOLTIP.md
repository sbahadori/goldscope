# GoldScope v2.41.3-ui.4.4.8 - Forced Top Side Tooltip

Builds on v2.41.3-ui.4.4.7.

Fix:
The previous side tooltip could still be hard to see because it was conditional or located lower in the legend.

Change:
- Adds a permanent `Selected candle` card directly at the top of every Chart legend.
- Works in both normal and maximize modes.
- If hovering: shows the hovered candle.
- If not hovering: shows the last visible candle.
- Shows OHLC, Volume, RSI, MACD, Signal, Histogram, ADX, +DI, and -DI.

Preserved:
- Normal mode: no wheel zoom / no drag pan.
- Maximize mode: wheel zoom + drag pan.
- No floating OHLC tooltip over the chart.
- No report/validator/macro/employment/BLS changes.
- No synthetic data.
- No Math.random.
