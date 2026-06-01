GoldScope v2.40.2 - RSI14 Numeric Parser Fix

Builds on v2.40.1.

Purpose:
Small validator-only patch.

Fix:
- RSI14 is now treated as an indicator name/period, not an RSI numeric value.
- The rsi_numeric_mismatch validator now captures only explicit RSI values:
  - RSI14=43.61
  - RSI14: 43.61
  - RSI is 43.61
  - RSI at 43.61
  - RSI value of 43.61
- It no longer treats plain "RSI14" as "RSI value 14".

No changes:
- No change to strategy modules.
- No change to technical indicators.
- No change to prompt.
- No change to macro logic.
- No change to Safe Report logic.
- No change to confidence logic.
- No credential/FRED key files are included or overwritten.
