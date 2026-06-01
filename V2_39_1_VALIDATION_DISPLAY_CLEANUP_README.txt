GoldScope v2.39.1 - Validation Display Cleanup

Builds on v2.39.

Purpose:
Improve UX of validation output without changing model, validator, safe-report, macro, replay, or technical logic.

Changes:
- Safe Report still rejects high-severity raw AI failures.
- REJECTED AI OUTPUT VALIDATION now clearly says it belongs to the rejected raw AI response, not the deterministic Safe Report.
- Only high-severity rejection reasons are shown in detail.
- Medium/low diagnostics are summarized as suppressed non-critical diagnostics.
- This prevents operator confusion when the Safe Report is correct but raw-AI warnings are noisy.

No logic changes:
- No change to technical indicators.
- No change to validation rules.
- No change to confidence logic.
- No change to prompt rules.
- No credential/FRED key files are included or overwritten.
