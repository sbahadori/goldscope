GoldScope v2.37.3 - Technical Numeric Comparator Exclusion

Builds on v2.37.2.

Purpose:
Fix a false positive where the generic technical numeric fact validator treated comparator/threshold expressions as measured numeric claims.

Problem example:
- Raw AI wrote: RSI14 < 30
- Validator incorrectly treated 30 as a hallucinated RSI value.
- This produced technical_numeric_fact_error.

Changes:
1. collectMentionedTechnicalNumericClaimsLocal now captures only measured-value forms:
   - RSI14 = 28.5
   - RSI14: 28.5
   - RSI14 is 28.5
   - RSI14 reads 28.5

2. It excludes comparator/threshold forms:
   - RSI14 < 30
   - RSI14 > 70
   - RSI below 30
   - RSI above 70
   - Stochastic RSI > 80
   - Stochastic RSI < 20

3. StochRSI validators are unchanged:
   - stoch_rsi_overbought_fact_error remains active.
   - stoch_rsi_oversold_fact_error remains active.
   - If AI says "Stochastic RSI overbought" while all K values are below 80, it still triggers HIGH.

No changes:
- No Safe Report wording changes.
- No macro logic changes.
- No technical indicator formulas.
- No strategy module changes.
- No prompt changes.
- No credential/FRED key files included or overwritten.
