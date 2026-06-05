GoldScope v2.37.8 - Scenario Header + Technical Evidence Label Mixed Splitter

Builds on v2.37.7.

Purpose:
Reduce unnecessary Safe Report fallback by fixing two known AI-output issues before validation:
1. Directional Section 1 overclaim when deterministic state requires Wait-Neutral.
2. "Confirmed evidence: ... technical ..." labels in sections 4 and 5.

Changes:
1. Section 1 deterministic Wait-Neutral post-processor
   Applies only when:
   - deterministicScenarioLab.dominant contains "Wait"
   - contextQualityFlags.eventDataCompleteness.nextMajor.quality === "date-only"
   - contextQualityFlags.maxRecommendedConfidence <= 25

   Only Section 1 is replaced, from:
   "1. Dominant research scenario"
   to before:
   "2. Confidence score"

2. Mixed technical evidence label splitter
   In sections 4 and 5, if raw AI writes:
   "Confirmed evidence: Macro negative, technical bearish"
   it becomes:
   "Confirmed evidence: Macro negative."
   "Technical confirmation context: technical bearish."

   Pure technical confirmed evidence becomes:
   "Technical confirmation context: ..."

   Pure macro confirmed evidence remains unchanged.

3. Validation still runs after post-processing.
   Remaining macro errors, NFP/CPI direction errors, completion errors, and true confirmed-evidence errors are still caught.

Preserved:
- Section 7 deterministic post-processor remains.
- Decision gates are not changed.
- Next catalyst plan is not changed.
- Final note is not changed.
- Safe Report logic is not changed.
- Validators are not changed.
- Macro logic is not changed.
- Indicators/candlestick/strategy modules are not changed.
- RSI/StochRSI validators are not changed.
- No credential/FRED key files included or overwritten.
