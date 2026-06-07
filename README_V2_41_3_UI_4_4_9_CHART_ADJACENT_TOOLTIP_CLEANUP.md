# GoldScope v2.41.3-ui.4.4.9 - Chart-Adjacent Tooltip Cleanup

Builds on v2.41.3-ui.4.4.8.

Fixes based on UI review:
1. Moves the main selected-candle tooltip next to the candle chart inside the SVG, not only in the far-right legend.
2. Removes MACD/Signal/Hist text labels from inside the MACD plot area.
3. Removes ADX/+DI/-DI text labels from inside the ADX plot area.
4. Keeps the right legend as detailed summary/levels.
5. Keeps OHLC tooltip off the candle bodies.

Behavior:
- Normal mode: hover-only, no zoom/pan.
- Maximize mode: wheel zoom + drag/pan.
- Selected candle values are visible next to the price chart.
- Detailed values remain in the right-side legend.

Preserved:
- No report generator changes.
- No validators changes.
- No macro/employment/BLS changes.
- No synthetic data.
- No Math.random.
