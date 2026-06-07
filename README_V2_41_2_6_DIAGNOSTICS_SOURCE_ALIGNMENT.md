# GoldScope v2.41.2.6 - Diagnostics Source Alignment + Section 9/4/5 Deterministic Replacement

Builds on v2.41.2.5.1.

Purpose:
Fix the remaining accepted-output warnings caused by a mismatch between post-processed output and the diagnostic layer.

Fixes:
1. Section 9 deterministic replacement:
   - `Next event: Consumer Price Index - May 2026.`
   - `Avoid-window: Avoid new entries 2h before and 1h after release.`

2. Section 4 deterministic technical context:
   - Removes malformed lines such as `Technical confirmation context: None`.
   - Leaves exactly:
     `Technical confirmation context: Technical bias is bearish; therefore it currently weakens the bullish conditional case.`

3. Section 5 deterministic technical context:
   - Removes malformed/duplicate technical confirmation context lines.
   - Leaves exactly:
     `Technical confirmation context: Technical bias is bearish; therefore it currently supports the bearish conditional case as confirmation context, but it cannot confirm the case without macro/event validation.`

4. Diagnostics source alignment:
   - Validation still runs on the final post-processed output.
   - Medium diagnostics are no longer appended to accepted reports as `AI OUTPUT DIAGNOSTICS`.
   - High-severity diagnostics still trigger Safe Report fallback.

5. Layout normalization:
   - Compact one-line AI output is normalized before section parsing, cleanup, and validation.

Preserved:
- validators
- macro logic
- employment computation
- technical indicators
- strategy modules
- Safe Report high-severity fallback
- npm scripts: dev/build/preview

No credential/FRED key files included or overwritten.
