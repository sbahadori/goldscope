GoldScope v2.33.2 - Unreliable Technical Suppression

Builds on v2.33.1.

Purpose:
When technicalContext is unreliable, raw technical fields are masked before the AI prompt is built.

What changes:
1. Adds maskTechnicalContextForPrompt(ctx).
2. If technicalContext.status === "unreliable":
   - usableForScenario = false
   - technicalBias = "masked-unreliable"
   - raw trend, momentum, EMA, RSI, ATR, support, resistance, priceVsEMA200 are removed from the prompt snapshot
   - only diagnosticSummary, sanityIssues, and guardrails remain
3. Prompt now explicitly forbids using masked technicals as scenario evidence.
4. Validator flags any leakage of masked technical fields into the AI output.

Expected behavior:
- AI should say: Technical context is unreliable/masked and cannot be used as directional evidence.
- AI should NOT say: mild-bullish, RSI oversold/overbought, EMA alignment, resistance/support, price above EMA200 when usableForScenario=false.

No credential/FRED key files are included or overwritten.
