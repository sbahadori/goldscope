GoldScope v2.41.2.4 - Invented Example + Known-NFP Invalidation Cleanup

Builds on v2.41.2.3.

Purpose:
Remove the remaining medium diagnostic:
invented_conceptual_example

Problem observed:
The AI report still produced conceptual examples not grounded cleanly in the snapshot, such as:
- e.g., NFP/CPI drivers
- e.g., NFP beats forecasts, yields rise
- e.g., NFP surprises, yields fall
- RSI > 50
- spot price breaks key support

Fix:
1. Adds applyInventedExampleKnownNfpCleanup().
2. Runs inside post-processing and again as a final pass before validation.
3. Removes or replaces invented examples with snapshot-grounded known-NFP/missing-CPI wording.
4. Enforces exact Section 4 bullish invalidation:
   If the stronger employment headline is confirmed by rising USD/yields, or if CPI lifts real yields, the bullish case weakens.
5. Enforces exact Section 5 bearish invalidation:
   If USD/yields fail to confirm the stronger labor signal, or if CPI/real-yield reaction turns gold-supportive, the bearish case weakens.
6. Cleans Evidence table rows:
   - Replay evidence: available but inconclusive
   - Technical context: confirmation context only
   - Calendar risk: CPI date-only
   - Macro: NFP known but quality-dependent; CPI date-only

Preserved:
- Validators unchanged.
- Macro logic unchanged.
- Employment computation unchanged.
- Technical indicators unchanged.
- Strategy modules unchanged.
- Safe Report core logic unchanged.
- No credential/FRED key files included or overwritten.

Next:
v2.41.3 - BLS Sector Composition Parser
