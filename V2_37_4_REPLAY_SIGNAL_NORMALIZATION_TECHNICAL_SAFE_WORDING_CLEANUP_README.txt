GoldScope v2.37.4 - Replay Signal Normalization + Technical Safe Wording Cleanup

Builds on v2.37.3.

Purpose:
Clean up operator-facing Safe Report wording without changing validators, macro logic, prompt, RSI/StochRSI logic, or strategy modules.

Changes:
1. Replay signal normalization
   - If replayRecords > 0 and replay.latest.missingReplay !== true:
     replaySignal is no longer allowed to appear as "missing".
   - If replay alignment is "inconclusive":
     replaySignal = "available_but_inconclusive".

2. Replay details in Safe Report
   - If observedReaction exists, Safe Report includes:
     observedReaction=<value>, alignment=<value>
   - Example:
     observedReaction=gold-negative, alignment=inconclusive

3. Technical Safe wording cleanup
   - If FRED rows=11 and missingCriticalMacroDrivers=[]:
     Technical confirmation no longer says "missing FRED drivers".
   - It says technical context cannot override blank event actual/forecast values, weak/rate-limited news, or limited/inconclusive replay evidence.

4. Replay wording cleanup in Technical confirmation
   - If replayRecords > 0:
     Technical confirmation no longer says "absent replay evidence".
   - It says "limited/inconclusive replay evidence".

Preserved:
- RSI/StochRSI validators unchanged.
- stoch_rsi_overbought_fact_error unchanged.
- stoch_rsi_oversold_fact_error unchanged.
- Macro logic unchanged.
- Prompt unchanged.
- Strategy modules unchanged.
- No credential/FRED key files included or overwritten.
