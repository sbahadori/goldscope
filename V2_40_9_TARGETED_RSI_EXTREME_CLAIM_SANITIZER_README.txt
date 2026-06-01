GoldScope v2.40.9 - Targeted RSI Extreme Claim Sanitizer

Builds on v2.40.8.

Purpose:
Make the raw-AI technical sanitizer safer and more targeted.

What it sanitizes:
Only definitive RSI extreme claims when technicalLanguageHints.requiredPhrase exists:
- RSI is overbought
- RSI shows overbought
- RSI indicates overbought
- RSI remains overbought
- overbought RSI
- RSI is oversold
- RSI shows oversold
- RSI indicates oversold
- RSI remains oversold
- oversold RSI

What it does NOT sanitize:
- RSI is near overbought
- RSI approaches overbought
- RSI is close to overbought
- RSI is below the overbought threshold
- RSI is near oversold
- RSI approaches oversold
- RSI is close to oversold

Important guardrail:
- Macro logic is never sanitized.
- NFP/CPI/yield decision gates are never changed.
- If the AI makes a macro logic error, validator still rejects it.

No changes:
- No change to validator rules.
- No change to RSI numeric parser.
- No change to strategy modules.
- No change to technical quality gate.
- No change to technical indicator formulas.
- No change to Safe Report logic.
- No credential/FRED key files are included or overwritten.
