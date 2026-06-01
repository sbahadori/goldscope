GoldScope v2.40.7 - Precomputed RSI/StochRSI Language Hint

Builds on v2.40.6.

Purpose:
Reduce raw-AI rejection caused by confusing RSI14 with Stochastic RSI.

Changes:
- Adds deterministic technicalLanguageHints to technicalContext and each timeframe.
- Computes:
  - rsiClassicState
  - stochRsiState
  - requiredPhrase
- Example:
  "technicalLanguageHints": {
    "rsiClassicState": "not_extreme",
    "stochRsiState": "overbought",
    "requiredPhrase": "RSI14 is not at a classic extreme; Stochastic RSI is overbought."
  }
- Prompt now says:
  "When technicalLanguageHints.requiredPhrase exists, copy it exactly in the Technical confirmation section."

No changes:
- No change to validator logic.
- No change to RSI numeric parser.
- No change to strategy modules.
- No change to technical quality gate.
- No change to technical indicator formulas.
- No change to macro logic.
- No change to Safe Report logic.
- No credential/FRED key files are included or overwritten.
