GoldScope v2.39 - Technical Indicator Expansion

Builds on v2.38.

Purpose:
Expand the technical analysis layer beyond EMA/RSI/ATR into a richer confirmation/contradiction context.

Added indicators:
- MACD(12,26,9)
- ADX(14) with +DI / -DI
- Bollinger Bands(20,2)
- Keltner Channels(20,2)
- Stochastic RSI(14,14,3)

Integration:
- Added to technicalContext.timeframes[timeframe].
- Added to technicalContext.technicalIndicators summary.
- Added to multi-timeframe scoring via expandedIndicatorScore.
- Added to Safe Report technical confirmation section.
- Added prompt rules to keep expanded technicals as confirmation/contradiction only.
- Added Stochastic RSI fact validation:
  - Stoch RSI overbought requires K >= 80.
  - Stoch RSI oversold requires K <= 20.

Important guardrail:
Expanded indicators do not create confirmed macro evidence and do not override incomplete macro/event/replay evidence.

No credential/FRED key files are included or overwritten.
