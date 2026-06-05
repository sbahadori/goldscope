GoldScope v2.40.4 - RSI Threshold Parser Fix

Builds on v2.40.3.

Purpose:
Small validator-only patch.

Fix:
- Prevents RSI threshold references from being treated as reported RSI values.
- Examples no longer treated as measured RSI values:
  - RSI below 30
  - RSI < 30
  - RSI above 70
  - RSI > 70
  - RSI value below 30
- Still validates explicit measured RSI values:
  - RSI14=43.59
  - RSI14: 43.59
  - RSI is 43.59
  - RSI at 43.59

Why:
v2.40.3 correctly fixed technical quality gating, but validator could still produce a false rsi_numeric_mismatch when the raw AI mentioned the classic RSI threshold 30/70.

No changes:
- No change to strategy modules.
- No change to technical quality gate.
- No change to technical indicator formulas.
- No change to prompt.
- No change to macro logic.
- No change to Safe Report logic.
- No credential/FRED key files are included or overwritten.
