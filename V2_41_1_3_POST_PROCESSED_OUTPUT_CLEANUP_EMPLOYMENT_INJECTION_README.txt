GoldScope v2.41.1.3 - Post-Processed Output Cleanup + Employment Report Injection

Builds on v2.41.1.2.

Purpose:
Clean up remaining medium diagnostics and force employment-event awareness into displayed post-processed AI output without changing validators or model logic.

Changes:
1. Pipeline order changed:
   raw AI output
   -> sanitizer
   -> scenario/header + technical label post-processor
   -> post-processed output cleanup
   -> deterministic Section 7 replacement
   -> validation

   This ensures sanitizer cannot duplicate RSI/StochRSI wording inside the deterministic Section 7.

2. Section 9 avoid-window cleanup:
   Replaces/sets:
   Avoid-window: <snapshot nextMajor avoidWindow>.
   Example:
   Avoid-window: Avoid new entries 2h before and 1h after release.

3. Employment event row injection:
   If employmentEvent.status === "partial_fred_backfill", Section 3 receives:
   Employment event intelligence | PAYEMS actual=... from FRED; UNRATE=... from FRED; forecast/previous/sector composition missing | labor surprise cannot be calculated; goldImpact=wait_for_confirmation | partial

4. Bullish-case technical weakening insertion:
   If technicalBias is bearish, Section 4 receives:
   Technical confirmation context: Technical bias is bearish; therefore it currently weakens the bullish conditional case.

5. Section 7 is deterministic-replaced after all sanitizer/cleanup steps, preventing duplicate RSI/StochRSI phrases.

Preserved:
- Validators unchanged.
- Macro logic unchanged.
- Employment data logic unchanged.
- Technical indicators unchanged.
- Strategy modules unchanged.
- Safe Report core logic unchanged.
- No credential/FRED key files included or overwritten.
