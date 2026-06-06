GoldScope v2.41.1.11 - Next Catalyst Exact Name + Macro Coverage Wording Cleanup

Builds on v2.41.1.10.

Purpose:
Remove the remaining medium diagnostic:
next_event_exact_mismatch

Also clean two conservative wording issues:
- Do not say "missing critical macro drivers" when missingCriticalMacroDrivers is empty.
- Do not use predictive technical table implications such as "likely to test resistance".

Changes:
1. Section 9 next event deterministic cleanup:
   Next event: <exact snapshot nextMajor name>.

   Example:
   Next event: Consumer Price Index - May 2026.

2. Removes extra wording:
   - (nextMajor event)
   - nextMajor event
   - upcoming CPI
   - pending CPI

3. Macro coverage wording cleanup:
   If missingCriticalMacroDrivers.length === 0, phrases such as:
   - missing critical macro drivers
   - macro drivers lack critical data
   - missing macro drivers
   - macro data incomplete
   are replaced with:
   Macro coverage is complete, but directional confidence remains capped because event actual/forecast values and confirmation evidence are incomplete.

4. Technical table implication cleanup:
   Predictive wording such as:
   - Likely to test resistance
   - may test support
   - may break
   is replaced with:
   Technical confirmation context only; cannot override macro/event uncertainty.

5. The cleanup runs inside post-processing and once again immediately before validation.

Preserved:
- Validators unchanged.
- Macro logic unchanged.
- Employment data logic unchanged.
- Technical indicators unchanged.
- Strategy modules unchanged.
- Safe Report core logic unchanged.
- No credential/FRED key files included or overwritten.
