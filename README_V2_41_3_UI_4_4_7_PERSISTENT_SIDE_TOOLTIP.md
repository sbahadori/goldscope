# GoldScope v2.41.3-ui.4.4.7 - Persistent Side Tooltip

Builds on v2.41.3-ui.4.4.6.

Fix:
The floating OHLC tooltip was removed from the chart, but the side legend was hover-conditional. If hover state was not active, users saw no tooltip values.

Change:
- The side legend now always shows a Selected candle panel.
- If the user hovers a candle, it shows that hovered candle.
- If the user is not hovering, it falls back to the last visible candle.
- OHLC/Volume/RSI/MACD/ADX values remain in the right-side legend, not on top of the chart.

Preserved:
- Normal mode: hover only, no zoom/pan.
- Maximize mode: wheel zoom + drag/pan.
- No floating OHLC tooltip on the chart.
- No report generator changes.
- No validators changes.
- No macro/employment/BLS changes.
- No synthetic data.
- No Math.random.
