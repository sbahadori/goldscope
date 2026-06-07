# GoldScope v2.41.3-ui.3 - Timeframe + Candle Count Controls

Builds on v2.41.3-ui.2.1.

Changes:
1. Adds Timeframe selector on the Technical tab:
   - 1h
   - 4h
   - 1d
   - any additional timeframe present in snapshot
2. Adds candle-count selector:
   - 80, 160, 240, 365, 500, 600 displayed candles
3. Stores up to 600 real OHLC candles per technical timeframe.
4. Prioritizes longer Yahoo ranges:
   - 1y/1h first
   - then 90d/1h
   - then 1y/1d
   - then Stooq daily fallback
5. Stooq fallback increased to 370 calendar days.

Important:
Yahoo may limit intraday 1h history depending on symbol/range. The app stores whatever real OHLC bars the provider returns, up to 600. For guaranteed full-year 1h history, a dedicated historical data provider may be needed later.

Preserved:
- No simulated candles.
- No Math.random.
- No TradingView dependency.
- No report/validator/macro/employment logic changes.
- BLS parser untouched.

After installing, refresh technical context or run AI Analysis once so localStorage snapshot is rebuilt with the larger OHLC series.
