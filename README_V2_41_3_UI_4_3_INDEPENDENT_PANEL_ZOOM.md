# GoldScope v2.41.3-ui.4.3 - Independent Panel Zoom

Builds on v2.41.3-ui.4.2.

UI-only addition:
- Adds independent zoom/focus controls for technical panels:
  - All panels
  - Price / candles
  - Volume
  - RSI
  - MACD
  - ADX / DI
- Uses SVG viewBox cropping to zoom each panel independently.
- Works in normal mode and fullscreen/maximize mode.
- Adds active zoom focus to the chart legend.

Preserved:
- No report generator changes.
- No validator changes.
- No macro/employment logic changes.
- No BLS parser changes.
- No synthetic data.
- No Math.random.
- No TradingView/Chart.js/CDN added.

Known design:
This is a lightweight viewBox-based zoom. It does not yet support drag-to-zoom or mouse-wheel zoom.
