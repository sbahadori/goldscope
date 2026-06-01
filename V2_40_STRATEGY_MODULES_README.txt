GoldScope v2.40 - Strategy Modules: Trend / Momentum / Volatility / Structure

Builds on v2.39.1.

Purpose:
Group the expanded technical indicators into readable strategy modules so the operator sees structured technical context instead of only raw indicators.

Added:
1. Trend Strategy Module
   - EMA20/EMA50/EMA200 alignment
   - priceVsEMA200
   - ADX direction and trend strength

2. Momentum Strategy Module
   - RSI14
   - MACD state/histogram
   - Stochastic RSI K/D/state
   - momentum classification

3. Volatility Strategy Module
   - ATR14 and ATR%
   - Bollinger Bands position/bandwidth
   - Keltner Channel position/width
   - compression/squeeze-style regime flag

4. Structure Strategy Module
   - support/resistance lists
   - nearest support/resistance
   - distance to support/resistance
   - range/trend structure classification

Integration:
- Adds technicalContext.strategyModules.
- Adds strategyModules to each timeframe block.
- Adds strategy module aggregate score/bias.
- Adds limited strategyScoreContribution to technical score.
- Safe Report summarizes strategy module output.
- Prompt now instructs the AI to treat modules as confirmation/contradiction context only.

Guardrail:
Strategy modules are not trade instructions and must not override missing macro/event/replay evidence.

No credential/FRED key files are included or overwritten.
