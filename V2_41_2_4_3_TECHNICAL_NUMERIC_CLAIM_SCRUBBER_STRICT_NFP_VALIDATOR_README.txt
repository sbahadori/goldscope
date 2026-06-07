GoldScope v2.41.2.4.3 - Technical Numeric Claim Scrubber + Strict NFP Validator

Builds on v2.41.2.4.2.

Purpose:
Fix continued Safe Report fallback caused by:
- technical_numeric_fact_error from invented RSI/StochRSI values such as StochRSI K=34
- false-positive NFP direction errors caused by contaminated/mixed lines

Fixes:
1. Adds scrubDisallowedTechnicalNumericClaims().
   - Replaces non-deterministic RSI/StochRSI numeric claims outside approved deterministic technical text.
   - Replaces invented technical context lines with a safe deterministic reference.
   - Forces Section 7 back to deterministic technical confirmation if hallucinated RSI/StochRSI values survive.

2. Adds strict NFP inversion validator.
   - Validator now only flags true inversion of:
     weak NFP + falling yields/USD -> bearish
     strong NFP + rising yields/USD -> bullish
   - It no longer relies on broad lineStatesBullish/lineStatesBearish matches like "supportive", "technical bullish", or unrelated nearby words.

3. Extends raw technical sanitizer.
   - Unsupported RSI/StochRSI numeric claims are converted to a Section 7 reference before validation.

Preserved:
- Real technical numeric validators remain active.
- Real StochRSI overbought validator remains active.
- Real NFP direction validators remain active for genuine inversions.
- Macro logic unchanged.
- Employment computation unchanged.
- Technical indicators unchanged.
- Strategy modules unchanged.
- Safe Report core logic unchanged.
- No credential/FRED key files included or overwritten.
