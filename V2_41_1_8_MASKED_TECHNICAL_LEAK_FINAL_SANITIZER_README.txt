GoldScope v2.41.1.8 - Masked Technical Leak Final Sanitizer

Builds on v2.41.1.7.

Purpose:
Prevent Safe Report fallback when technicalContext is masked/unusable but raw AI still mentions RSI/StochRSI/EMA/MACD/ADX/support/resistance/strategy modules.

Problem observed:
Validation rejected raw AI with:
- masked_unreliable_technical_leak
- rsi_overbought_fact_error with no RSI values
- stoch_rsi_overbought_fact_error with no StochRSI K values

Fix:
1. Adds isTechnicalContextMaskedOrUnusable(snapshot).
2. Adds sanitizeMaskedTechnicalLeaks(reportText, snapshot).
3. Runs masked technical sanitizer after deterministic Section 7 replacement and before validation.

Behavior when technicalContext is unusable/masked:
- Section 3 Technical row becomes masked/unreliable.
- Sections 4/5 technical lines become:
  Technical confirmation context: Technical context is masked/unreliable and not usable...
- Section 7 is replaced with masked/unusable deterministic wording.
- RSI/StochRSI/EMA/MACD/ADX/support/resistance claims are removed before validation.

Preserved:
- Validators unchanged.
- Macro logic unchanged.
- Employment data logic unchanged.
- Technical indicators unchanged.
- Strategy modules unchanged.
- Safe Report core logic unchanged.
- No credential/FRED key files included or overwritten.
