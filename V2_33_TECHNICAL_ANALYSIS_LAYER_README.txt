GoldScope v2.33 - Technical Analysis Layer

Adds real technicalContext instead of relying only on the TradingView embed.

Data source:
- Yahoo Finance chart endpoint through Vite proxy
- Symbol: GC=F
- Range: 60d
- Interval: 1h

Calculated indicators:
- EMA20
- EMA50
- EMA200 when enough candles are available
- RSI14
- ATR14
- trend
- momentum
- priceVsEMA200
- simple support/resistance from recent candle highs/lows
- technicalBias
- technicalConfidence

Prompt behavior:
- technicalContext is added to the AI snapshot
- AI must treat technical analysis as confirmation/context only
- technicals must not override missing macro/event evidence
- GC=F is labeled as a gold futures proxy, not direct spot XAUUSD

No credential/FRED key files are included or overwritten.
