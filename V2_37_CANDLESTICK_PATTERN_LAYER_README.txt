GoldScope v2.37 - Candlestick Pattern Layer

Built on the latest stable validation chain from v2.40.16.

Purpose:
Add deterministic candlestick-pattern detection from cleaned OHLC candles.

Patterns detected:
Single-candle:
- Doji
- Hammer / Hammer-like candle
- Shooting Star / Shooting-star-like candle
- Spinning Top

Two-candle:
- Bullish Engulfing
- Bearish Engulfing
- Piercing Line
- Dark Cloud Cover
- Bullish/Bearish Harami

Three-candle:
- Morning Star-like pattern
- Evening Star-like pattern
- Three White Soldiers-like pattern
- Three Black Crows-like pattern

Output:
- technicalContext.candlestickPatterns
- technicalContext.timeframes[tf].candlestickPatterns

Guardrails:
- Candlestick patterns are technical confirmation context only.
- They are not confirmed macro evidence.
- They are not trade instructions.
- They cannot override missing macro/event/replay evidence.
- Validator catches candlestick patterns placed under Confirmed evidence.
- Validator warns if candlestick patterns are used as predictive/trade-signal language.

No changes:
- No macro logic changes.
- No prompt macro gate changes.
- No RSI/StochRSI validator changes.
- No technical indicator formula changes.
- No strategy module changes.
- No credential/FRED key files are included or overwritten.
