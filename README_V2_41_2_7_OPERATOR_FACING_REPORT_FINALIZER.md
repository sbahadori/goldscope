# GoldScope v2.41.2.7 - Operator-Facing Report Finalizer

Builds on v2.41.2.6.1.

Purpose:
The accepted report was stable but visually dirty:
- post-processing debug notes were still shown in the final report
- Section 7 was duplicated
- Section 4 still contained malformed `Technical confirmation context: None`
- Section 9 still had `Next event to watch` / `(nextMajor event)` variants
- accepted reports still looked like debug output

Fix:
1. Adds `finalizeOperatorFacingReport(reportText, snapshot)`.
2. Strips post-processing/debug note blocks from accepted operator-facing output.
3. Removes duplicate Section 7 and keeps deterministic Section 7 only.
4. Forces Section 4 to contain exactly one bearish technical weakening line.
5. Forces Section 5 to contain exactly one bearish technical support line.
6. Forces Section 9 exact next event and avoid-window lines.
7. Clamps confidence score to `contextQualityFlags.maxRecommendedConfidence` if AI exceeds the deterministic cap.
8. Accepted reports now display only the final cleaned report. Debug notes are only appended if high-severity validation is triggered.

Preserved:
- validators
- macro logic
- employment computation
- technical indicators
- strategy modules
- Safe Report high-severity fallback
- npm scripts: dev/build/preview

No credential/FRED key files included or overwritten.
