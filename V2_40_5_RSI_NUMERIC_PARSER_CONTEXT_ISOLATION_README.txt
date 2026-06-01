GoldScope v2.40.5 - RSI Numeric Parser Context Isolation

Builds on v2.40.4.

Purpose:
Small validator-only patch.

Fix:
- Prevents unrelated numbers such as news confidence=65 from being treated as RSI values.
- The RSI numeric validator now captures only tight/direct RSI measurements:
  - RSI14=42.73
  - RSI14: 42.73
  - RSI is 42.73
  - RSI was 42.73
  - RSI reads 42.73
  - RSI at 42.73
  - RSI(14): 42.73
- The parser no longer scans broad before/after context.

Still ignored:
- RSI14 as indicator name/period.
- RSI below 30 / RSI < 30.
- RSI above 70 / RSI > 70.
- confidence=65 or other unrelated numeric fields.

No changes:
- No change to strategy modules.
- No change to technical quality gate.
- No change to technical indicator formulas.
- No change to prompt.
- No change to macro logic.
- No change to Safe Report logic.
- No credential/FRED key files are included or overwritten.
