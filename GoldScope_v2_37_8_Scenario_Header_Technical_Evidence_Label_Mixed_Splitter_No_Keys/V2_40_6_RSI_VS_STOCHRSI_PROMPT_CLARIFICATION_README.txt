GoldScope v2.40.6 - RSI vs StochRSI Prompt Clarification

Builds on v2.40.5.

Purpose:
Small prompt/wording patch only.

Fix:
- Clarifies that RSI14 and Stochastic RSI are different indicators.
- Tells the AI not to say "RSI is overbought" when only Stochastic RSI is overbought.
- Tells the AI to write:
  "RSI14 is not at a classic extreme; Stochastic RSI is overbought"
  when RSI14 is between 30 and 70 but StochRSI K >= 80.
- Adds the same distinction for oversold/exhaustion conditions.

No changes:
- No change to validator logic.
- No change to RSI numeric parser.
- No change to strategy modules.
- No change to technical quality gate.
- No change to technical indicator formulas.
- No change to macro logic.
- No change to Safe Report logic.
- No credential/FRED key files are included or overwritten.
