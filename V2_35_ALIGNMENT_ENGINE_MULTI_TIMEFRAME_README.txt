GoldScope v2.35 - Macro + Technical Alignment Engine + Multi-Timeframe Technical Context

Builds on v2.34.2.

Adds:
1. Multi-timeframe technical context
   - Selected source/timeframe remains available.
   - 4h candles are derived from 1h candles when the selected source is intraday.
   - 1d candles are attempted from the same source.
   - technicalContext.multiTimeframe includes score, bias, per-timeframe signals, and conflict flags.

2. Macro + Technical Alignment Engine
   - Adds alignmentContext to the snapshot.
   - Detects aligned bullish, aligned bearish, macro-supportive/technical-bearish conflict, macro-negative/technical-bullish conflict, mixed/insufficient, and technical-unusable states.
   - Technical context can confirm, weaken, or contradict macro context.
   - Technical context cannot override missing macro/event/replay evidence.

3. Safe report integration
   - Includes v2.34.2 case-specific technical wording.
   - Safe report includes multi-timeframe summary and alignment explanation when available.

No credential/FRED key files are included or overwritten.
