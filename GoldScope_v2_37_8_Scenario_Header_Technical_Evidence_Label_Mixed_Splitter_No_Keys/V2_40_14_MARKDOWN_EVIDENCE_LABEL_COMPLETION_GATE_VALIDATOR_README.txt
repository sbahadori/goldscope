GoldScope v2.40.14 - Markdown Evidence Label + Completion Gate Validator

Builds on v2.40.13.1.

Purpose:
Strengthen validation for markdown-formatted evidence labels, incomplete AI output, and overclaiming technical language.

New/strengthened validator rules:
1. technical_confirmed_evidence_error [HIGH]
   Now catches markdown-formatted labels:
   - **Confirmed evidence**: Technical context
   - **Confirmed evidence**: EMA / RSI / MACD / ADX / strategy modules
   - Confirmed evidence: Technical context

2. incomplete_final_report_error [HIGH]
   If <END_GOLDSCOPE_REPORT> is missing and the Final research note looks truncated or unfinished, reject and generate Safe Report.
   If only the end marker is missing but the report appears complete, the existing missing_end_marker diagnostic can remain medium.

3. technical_prediction_overclaim [MEDIUM]
   Flags technical language such as:
   - likely to continue downward trend
   - will continue
   - confirms bearish trend
   - confirmed bearish evidence
   Technical context is confirmation context only.

4. avoid_window_exact_mismatch [MEDIUM]
   The AI must copy the snapshot avoidWindow exactly:
   "Avoid new entries 2h before and 1h after release"

5. next_event_exact_mismatch [MEDIUM]
   The AI must use the exact nextMajor event name:
   "Employment Situation - May 2026"
   It should not use generic text like "(nextMajor event)" as part of the event label.

No changes:
- No sanitizer changes.
- No macro scoring changes.
- No technical indicator changes.
- No strategy module changes.
- No Safe Report generation logic changes.
- No credential/FRED key files are included or overwritten.
