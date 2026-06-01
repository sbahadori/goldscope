GoldScope v2.34.1 - Safe Report Technical Awareness

Builds on v2.34.

Purpose:
Update the deterministic validation-gated safe report so it uses technicalContext correctly when usableForScenario=true.

Fix:
- If technicalContext is usable, the safe report now includes:
  - selected technical source
  - data quality score/label
  - technicalBias and technicalConfidence
  - trend, momentum, priceVsEMA200
  - RSI14, ATR14, EMA20/50/200
  - support/resistance
  - macro/technical alignment note
- Technical context is treated only as confirmation/contradiction context.
- Technical context never overrides missing macro/event/replay evidence.
- If technicalContext is unusable, safe report still treats it as masked/unreliable.

Expected:
When AI fails validation but technicalContext is usable, safe report should no longer say technicals are unavailable. It should say technicals are usable as confirmation only.

No credential/FRED key files are included or overwritten.
