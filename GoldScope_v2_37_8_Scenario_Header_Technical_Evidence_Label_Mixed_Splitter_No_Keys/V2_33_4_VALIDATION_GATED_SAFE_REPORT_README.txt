GoldScope v2.33.4 - Validation-Gated Safe Report

Builds on v2.33.3.

Purpose:
If the AI output fails high-severity validation, GoldScope no longer shows the invalid AI report as the main result. Instead, it generates a deterministic safe report from the GoldScope snapshot.

What changes:
1. Adds buildValidationSafeGoldReport(snapshot, validation).
2. If validation contains any high-severity issue:
   - original AI output is rejected
   - UI status becomes: AI rejected: safe report generated
   - output becomes a deterministic Wait-Neutral safe report
   - validation issues are appended
3. Correct deterministic gates are always used:
   - Weak NFP + yields/USD fall -> gold may rise
   - Strong NFP + yields/USD rise -> gold may fall
   - Hot CPI + real yields fall -> gold may rise
   - Hot CPI + real yields rise -> gold may fall
4. Next catalyst is copied from snapshot nextMajor exactly.

No credential/FRED key files are included or overwritten.
