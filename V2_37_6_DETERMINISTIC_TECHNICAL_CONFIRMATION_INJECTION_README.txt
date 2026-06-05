GoldScope v2.37.6 - Deterministic Technical Confirmation Injection

Builds on v2.37.5.

Purpose:
Reduce raw AI hallucination in section 7 by injecting a deterministic TECHNICAL CONFIRMATION TEXT block and requiring the AI to copy it exactly.

Changes:
1. Adds formatDeterministicTechnicalConfirmationText(snapshot).
   It builds a safe technical summary before the prompt is sent.

2. Adds TECHNICAL CONFIRMATION TEXT before GOLDSCOPE STATE SNAPSHOT.
   The block includes:
   - source/proxy statement
   - data quality
   - technicalBias and technicalConfidence
   - primary timeframe trend/momentum/priceVsEMA200
   - exact RSI/StochRSI requiredPhrase
   - MACD/ADX/Bollinger/Keltner summary
   - candlestick summary
   - strategyModules summary
   - support/resistance proxy disclaimer
   - multi-timeframe summary
   - macro/technical alignment note
   - non-override guardrail

3. Section 7 prompt instruction now says:
   - Copy TECHNICAL CONFIRMATION TEXT exactly.
   - Do not rewrite, compress, paraphrase, or add extra technical numbers.
   - Do not add RSI14/StochRSI values beyond deterministic text/facts.

Preserved:
- TECHNICAL NUMERIC FACTS remains.
- No validator changes.
- No Safe Report logic changes.
- No macro logic changes.
- No technical indicator formula changes.
- No candlestick formula changes.
- No strategy module changes.
- No credential/FRED key files included or overwritten.
