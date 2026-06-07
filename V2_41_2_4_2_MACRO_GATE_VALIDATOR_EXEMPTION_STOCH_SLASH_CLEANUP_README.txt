GoldScope v2.41.2.4.2 - Macro Gate Validator Exemption + Stoch Slash Cleanup

Builds on v2.41.2.4.1.

Purpose:
Fix false high-severity rejection after v2.41.2.4.1.

Observed:
Safe Report fallback occurred with:
- nfp_direction_error_weak_labor
- nfp_direction_error_strong_labor
- stoch_rsi_overbought_fact_error

Root causes:
1. The NFP validator was reading the exact deterministic decision gates as a direction error.
   The gates were actually correct:
   - Weak NFP + falling yields/USD -> gold may rise
   - Strong NFP + rising yields/USD -> gold may fall

2. Stochastic RSI validator interpreted ambiguous wording such as:
   "overbought/oversold conditions"
   as an overbought Stochastic RSI claim even though StochRSI K values are oversold/neutral, not overbought.

Fixes:
1. Add shouldSkipNfpDirectionValidatorLine(line, snapshot).
   It skips:
   - exact macroGateLanguageHints lines
   - lines that already state the correct NFP/yield implication.

2. Add sanitizer cleanup for:
   - StochRSI K < D, indicating overbought/oversold conditions
   - Stochastic RSI ... overbought/oversold conditions
   - overbought/oversold conditions

3. Make StochRSI overbought validator more precise:
   - ignores slash phrase overbought/oversold
   - requires direct overbought wording connected to StochRSI.

Preserved:
- Validators still catch genuinely wrong NFP direction language.
- Validators still catch true StochRSI overbought claims when K < 80.
- Macro logic unchanged.
- Employment computation unchanged.
- Technical indicators unchanged.
- Strategy modules unchanged.
- Safe Report core logic unchanged.
- No credential/FRED key files included or overwritten.
