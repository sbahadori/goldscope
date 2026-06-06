GoldScope v2.41.1.5 - Macro Confirmed Evidence Overclaim Downgrade

Builds on v2.41.1.4.

Purpose:
Prevent Safe Report fallback when raw AI labels weak/incomplete macro-supportive context as "Confirmed evidence" in sections 4/5.

Problem fixed:
In a state where:
- nextMajor event quality is date-only
- newsStrength is weak
- replay alignment is inconclusive
- no actual event outcome exists

The raw AI may still write:
Confirmed evidence: Macro supportive drivers / macro context aligns / FRED macro drivers / replay evidence.

That is an overclaim and should be conditional, not confirmed.

Rules implemented:
1. In sections 4 and 5, if a Confirmed evidence line contains:
   - macro supportive
   - macro context aligns
   - macro drivers support
   - FRED macro drivers
   - replay evidence / replay record
   and the current snapshot is date-only + weak news + inconclusive replay,
   then the line is downgraded.

2. Replacement:
   Conditional evidence: Macro context is supportive, but event outcomes, forecast/actual values, and replay confirmation are still missing/inconclusive.

3. If the line also contains technical content:
   - macro part is downgraded to Conditional evidence
   - technical part remains Technical confirmation context

4. Confirmed evidence: none. is preserved.

5. Downgrade is skipped if actual outcome exists or replay alignment is clearly strong/confirmed.

Preserved:
- Validators unchanged.
- Macro logic unchanged.
- Employment data logic unchanged.
- Technical indicators unchanged.
- Strategy modules unchanged.
- Safe Report core logic unchanged.
- No credential/FRED key files included or overwritten.
