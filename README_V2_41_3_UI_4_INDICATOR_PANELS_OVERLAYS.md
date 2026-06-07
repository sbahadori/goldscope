# GoldScope v2.41.3-ui.4 - Technical Indicator Panels + Chart Overlays

Builds on v2.41.3-ui.3.

Purpose:
Make the first-party Technical chart closer to a TradingView replacement.

Added:
1. EMA20/EMA50/EMA200 overlay on the candlestick chart.
2. Support and resistance zones instead of only thin lines.
3. Volume panel below price if real volume exists in OHLC candles.
4. RSI14 panel.
5. MACD histogram + MACD/signal lines panel.
6. ADX/+DI/-DI panel.
7. Basic crosshair + OHLC tooltip on hover.
8. Legend expanded with overlay and indicator values.

Rules preserved:
- No simulated candles.
- No Math.random.
- No TradingView dependency.
- No Chart.js/CDN.
- UI-only; report generator, validators, macro logic, employment logic, decision gates, and BLS parser are untouched.

Note:
RSI/MACD/ADX panel series are computed client-side from real OHLC candles already stored in the snapshot. No invented market data is used.
