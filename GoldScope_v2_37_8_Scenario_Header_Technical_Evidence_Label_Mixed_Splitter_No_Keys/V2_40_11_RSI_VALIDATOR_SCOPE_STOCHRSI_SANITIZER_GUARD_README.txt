GoldScope v2.40.11 - RSI Validator Scope + StochRSI Sanitizer Guard

Builds on v2.40.10.

Purpose:
Fix false-positive rsi_overbought_fact_error and prevent sanitizer from corrupting Stochastic RSI wording.

Fixes:
1. RSI validator scope
   - rsi_overbought_fact_error now fires only on definitive classic RSI claims:
     - RSI is overbought
     - RSI14 is overbought
     - overbought RSI
     - RSI shows/indicates/remains overbought
   - rsi_oversold_fact_error follows the same scoped logic.
   - It no longer fires for:
     - RSI14 < 70, Stochastic RSI overbought
     - RSI14 is not at a classic extreme; Stochastic RSI is overbought

2. StochRSI sanitizer guard
   - The sanitizer protects phrases like:
     - Stochastic RSI is overbought
     - Stoch RSI is oversold
   - It no longer replaces the "RSI is overbought" substring inside "Stochastic RSI is overbought".

3. NFP validator untouched
   - Weak NFP/labor + falling yields/USD described as bearish still triggers validation.
   - Macro logic is not sanitized.

No changes:
- No change to macro logic.
- No change to NFP/CPI/yield validators.
- No change to Safe Report logic.
- No change to strategy modules or technical indicators.
- No credential/FRED key files are included or overwritten.
