# GoldScope v2.41.2.9 - Strict Canonical Sections Rebuild

Builds on v2.41.2.8.

Purpose:
v2.41.2.8 still preserved too much raw AI text. This allowed:
- duplicate Section 9
- glued `8...fall.9. Next catalyst plan`
- raw/malformed Section 4 text
- raw Section 5 missing-evidence text
- generic NFP/CPI missing wording

Fix:
1. Strengthens `normalizeNumberedReportLayout()` to split punctuation-glued headers such as `.9. Next catalyst plan`.
2. Replaces `rebuildCanonicalOperatorReport()` with a strict canonical rebuild.
3. Sections 1, 2, 4, 5, 6, 7, 8, and 9 are now deterministic from snapshot/context.
4. Section 3 evidence table is preserved if available.
5. Section 10 final note is preserved if available and guaranteed to include `<END_GOLDSCOPE_REPORT>`.
6. Section 7 is always deterministic.
7. Section 8 is always exact macro gates.
8. Section 9 is always exact next event + avoid-window.

Preserved:
- validators
- macro logic
- employment computation
- technical indicators
- strategy modules
- Safe Report high-severity fallback
- npm scripts: dev/build/preview

No credential/FRED key files included or overwritten.
