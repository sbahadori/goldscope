# GoldScope v2.41.3-ui.2.1 - Candlestick History Range

Builds on v2.41.3-ui.2.

Purpose:
Increase real OHLC candle history for the first-party Technical chart.

Changes:
1. Stores the last 240 clean OHLC candles in:
   - `technicalContext.timeframes[timeframe].candles`
   - `technicalContext.candles`
2. Displays the last 160 candles on the chart by default.
3. Keeps the chart readable while preserving more history in the snapshot.
4. Indicator computation is unchanged and still uses the full clean candle set available to the technical engine.

Rationale:
- 80 hourly candles ≈ 3.3 days, useful for very short-term view but too narrow for context.
- 160 hourly candles ≈ 6.7 days, better for swing/reaction visualization.
- 240 stored candles ≈ 10 days, useful for future range toggles without bloating localStorage too much.

Preserved:
- No simulated candles.
- No Math.random.
- No TradingView dependency.
- No report/validator/macro/employment logic changes.
- BLS parser untouched.

After installing, refresh technical context so the new snapshot stores 240 candles.
