# GoldScope v2.41.3-ui.4.2 - Technical Chart Maximize Mode

Builds on v2.41.3-ui.4.1.

UI-only addition:
- Adds a Maximize chart button to the Technical chart card.
- Opens the same technical chart in a fullscreen modal overlay.
- Supports Escape key and Close button.
- Uses the same real OHLC candles and computed indicator series.
- Does not create or simulate any data.

Preserved:
- No report generator changes.
- No validator changes.
- No macro/employment logic changes.
- No BLS parser changes.
- No TradingView/Chart.js/CDN added.
- Technical tab remains UI-only.

Known design choice:
The fullscreen overlay duplicates the SVG rendering block to keep the patch isolated and avoid refactoring the existing chart into a separate component during this small UI patch.
