GoldScope v2.35.4 - Validation Label + SourceHealth Accuracy

Builds on v2.35.3.

Fixes:
1. Validation label clarity
   - Safe reports now end with:
     REJECTED AI OUTPUT VALIDATION
   - This makes it clear that validation errors belong to the rejected original AI output, not the deterministic safe report.

2. SourceHealth normalization
   - If a source message contains 429, Too Many Requests, rate-limit, or rate limit:
     status becomes rate-limited.
   - If a source is marked live but message contains error/failed/fallback:
     status becomes degraded.
   - Missing key/not connected states remain conservative.

3. Conservative contextQualityFlags
   - sourceReliabilitySummary reflects normalized source health.
   - FRED rate-limited keeps macroReliability conservative.
   - GDELT rate-limited sets newsReliability=rate-limited and caps newsStrength conservatively.
   - sourceHealthConservative is set when degraded/rate-limited sources exist.

No credential/FRED key files are included or overwritten.
