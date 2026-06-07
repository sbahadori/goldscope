# GoldScope v2.41.2.8 - Canonical Operator Report Rebuilder

Builds on v2.41.2.7.

Purpose:
The accepted report was still not clean enough:
- Section 7 was duplicated.
- Section 4 still mixed malformed raw text with deterministic technical context.
- Section 9 still allowed monitor text to glue into the next-event line.
- Some debug/post-processing residue could survive in accepted output.

Fix:
1. Adds `rebuildCanonicalOperatorReport(reportText, snapshot)`.
2. Parses the final output into numbered sections.
3. Rebuilds a single canonical 10-section operator-facing report.
4. Always forces Section 7 from deterministic `technicalConfirmationText`.
5. Canonicalizes Section 4 and Section 5 technical confirmation context.
6. Canonicalizes Section 9 with exact:
   - `Next event: Consumer Price Index - May 2026.`
   - `Avoid-window: Avoid new entries 2h before and 1h after release.`
7. Keeps accepted reports free from debug notes.
8. High-severity validation still appends diagnostic/debug notes for troubleshooting.

Preserved:
- validators
- macro logic
- employment computation
- technical indicators
- strategy modules
- Safe Report high-severity fallback
- npm scripts: dev/build/preview

No credential/FRED key files included or overwritten.
