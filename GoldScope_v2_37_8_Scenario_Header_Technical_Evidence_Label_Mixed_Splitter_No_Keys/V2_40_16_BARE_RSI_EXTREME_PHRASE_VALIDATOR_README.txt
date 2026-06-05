GoldScope v2.40.16 - Bare RSI Extreme Phrase Validator

Builds on v2.40.15.1.

Purpose:
Fix the remaining validator gap where raw AI wrote bare classic RSI extreme phrases such as:
- RSI overbought
- RSI oversold
- RSI14 overbought
- RSI14 oversold
- EMA alignment, RSI overbought
- trend, RSI overbought

New validator behavior:
1. If the AI writes a definitive classic RSI overbought phrase and no RSI14 value in the snapshot is > 70:
   HIGH: rsi_overbought_fact_error

2. If the AI writes a definitive classic RSI oversold phrase and no RSI14 value in the snapshot is < 30:
   HIGH: rsi_oversold_fact_error

3. Stochastic RSI is explicitly excluded:
   - "Stochastic RSI is overbought" does NOT trigger classic RSI overbought error.
   - "RSI14 is not at a classic extreme; Stochastic RSI is overbought." does NOT trigger error.

Preserved:
- avoid_window_exact_mismatch remains MEDIUM.
- No prompt changes.
- No sanitizer changes.
- No macro logic changes.
- No technical indicator changes.
- No strategy module changes.
- No credential/FRED key files are included or overwritten.
