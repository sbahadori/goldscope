# GoldScope v2.41.3-ui.2 - Candlestick Overlay + OHLC Capture

Builds on v2.41.3-ui.1.5.

Purpose:
Add a first-party candlestick layer to the Technical tab and store real OHLC bars in the technical snapshot.

Important rule:
Candles are drawn only from real OHLC data used by the technical engine. No simulated candles, no Math.random, no synthetic price history.

What changed:
1. `computeTechnicalContextFromCandles()` now stores the last 80 clean OHLC candles in:
   - `technicalContext.timeframes[timeframe].candles`
   - `technicalContext.candles`
2. The Technical tab reads:
   - `technicalContext.timeframes["1h"].candles`
   - fallback paths: `ohlc`, `ohlcv`, `technicalContext.candles`, `technicalContext.ohlc`
3. The chart overlays real OHLC candles with EMA/Bollinger/Keltner/support/resistance levels.
4. If candles are missing, the chart still shows levels and clearly says candles are missing.

Preserved:
- Technical tab remains UI-only.
- Report generator unchanged.
- Validators unchanged.
- Macro/employment logic unchanged.
- BLS parser untouched.
- No CDN / no Chart.js / no TradingView dependency added.
- npm scripts dev/build/preview preserved.

No credential/FRED key files included or overwritten.
