GoldScope v2.34.2 - Safe Report Case-Specific Technical Wording

Builds on v2.34.1.

Purpose:
Refine the validation-gated safe report so technical context is interpreted differently inside bullish and bearish cases.

Fix:
- If technicalBias is bearish:
  - Bullish case says technical currently weakens the bullish conditional case.
  - Bearish case says technical currently supports the bearish conditional case conditionally.
- If technicalBias is bullish:
  - Bullish case says technical currently supports the bullish conditional case conditionally.
  - Bearish case says technical currently weakens the bearish conditional case.
- Technical context remains confirmation/contradiction only and never overrides macro/event evidence.

No credential/FRED key files are included or overwritten.
