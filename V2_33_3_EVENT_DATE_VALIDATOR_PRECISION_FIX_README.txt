GoldScope v2.33.3 - Event Date Validator + Validator Precision Fix

Builds on v2.33.2.

Fixes:
1. NFP direction validator false positives
   - NFP direction checks are now line-based.
   - Correct line is allowed:
     If NFP strengthens labor expectations and yields/USD rise, then gold may fall.
   - Correct line is allowed:
     If NFP materially weakens labor expectations and yields/USD fall, then gold may rise.
   - Only wrong same-line mappings are flagged.

2. Next catalyst exactness validator
   - Next Catalyst Plan must use snapshot nextMajor exactly.
   - If nextMajor is Employment Situation - May 2026 / 2026-06-05, the AI must not name later FOMC/CPI/PCE as the next event.
   - Wrong next-event dates are flagged.

3. Prompt hardening
   - Explicitly says the Next catalyst plan must use deterministicScenarioLab.nextMajor/calendar.nextMajor exactly.
   - AvoidWindow and event name/date must be copied from the snapshot.

No credential/FRED key files are included or overwritten.
