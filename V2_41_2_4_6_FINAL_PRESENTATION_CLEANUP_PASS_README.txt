GoldScope v2.41.2.4.6 - Final Presentation Cleanup Pass

Builds on v2.41.2.4.5.

Purpose:
Remove remaining medium diagnostics when raw AI is accepted:
- avoid_window_exact_mismatch
- missing_bearish_technical_weakens_bullish_case
- missing_bearish_technical_supports_bearish_case

Observed:
The raw AI was not rejected, but the final report still had:
- Avoid-window: 2h before and 1h after the event.
- Section 4 did not clearly contain the exact bearish technical weakening wording.
- Section 5 had malformed markdown technical confirmation wording.
- Section 7 sometimes survived as non-deterministic text despite the deterministic post-processor.

Fix:
1. Final presentation cleanup runs inside normal cleanup and again immediately before validation.
2. Section 9 avoid-window is forced to:
   Avoid-window: Avoid new entries 2h before and 1h after release.
3. Section 4 is forced to contain:
   Technical confirmation context: Technical bias is bearish; therefore it currently weakens the bullish conditional case.
4. Section 5 is forced to contain:
   Technical confirmation context: Technical bias is bearish; therefore it currently supports the bearish conditional case as confirmation context, but it cannot confirm the case without macro/event validation.
5. Section 7 is forced back to deterministic technicalConfirmationText if it contains non-deterministic language such as declining volume, Gold may fall, weak buying pressure, or lacks deterministic markers.

Preserved:
- Validators unchanged.
- Macro logic unchanged.
- Employment computation unchanged.
- Technical indicators unchanged.
- Strategy modules unchanged.
- Safe Report core logic unchanged.
- No credential/FRED key files included or overwritten.
