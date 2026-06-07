# GoldScope v2.41.3-ui.4.1 - Indicator Panel Polish

Builds on v2.41.3-ui.4.

UI-only polish for the Technical tab.

Changes:
1. Default candle display remains 240 when no previous user preference exists.
2. Volume panel now validates volume quality:
   - if provider volume is missing/weak, the panel labels it clearly instead of drawing meaningless bars.
   - if valid, bars use sqrt scaling for better visibility.
3. RSI panel now shows a current-value marker.
4. MACD panel now shows:
   - MACD current
   - Signal current
   - Histogram current
5. ADX panel now shows:
   - ADX current
   - +DI current
   - -DI current
   with color-coded labels.
6. Support/resistance zones are clustered in the legend.
7. Support/resistance zone overlays use clustered zones instead of only individual levels.

Preserved:
- No synthetic candles.
- No Math.random.
- No Chart.js/CDN.
- No TradingView dependency.
- No report/validator/macro/employment/BLS parser changes.
- Technical tab remains UI-only.
