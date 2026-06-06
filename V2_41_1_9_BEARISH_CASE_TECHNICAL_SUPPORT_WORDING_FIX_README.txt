GoldScope v2.41.1.9 - Bearish Case Technical Support Wording Fix

Builds on v2.41.1.8.

Purpose:
Remove the remaining medium diagnostic:
missing_bearish_technical_supports_bearish_case

Problem:
The raw/post-processed output could contain a malformed or weak Section 5 line:
- Technical confirmation context: Technical context is bearish (Yahoo:GC=F.

Fix:
If technicalBias === "bearish" and technicalContext.usableForScenario === true, Section 5 must contain exactly:

Technical confirmation context: Technical bias is bearish; therefore it currently supports the bearish conditional case as confirmation context, but it cannot confirm the case without macro/event validation.

Rules:
1. If Section 5 already has an incomplete Technical confirmation context line, replace it.
2. If Section 5 has no Technical confirmation context line, insert the sentence before Missing evidence.
3. Section 4 bullish weakening logic remains unchanged.

Preserved:
- Validators unchanged.
- Macro logic unchanged.
- Employment data logic unchanged.
- Technical indicators unchanged.
- Strategy modules unchanged.
- Safe Report core logic unchanged.
- No credential/FRED key files included or overwritten.
