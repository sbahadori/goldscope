GoldScope v2.37.2 - Safe Report Evidence Wording + RSI Numeric Parser Cleanup

Builds on v2.37.1.

Purpose:
Fix two issues observed in the latest execution:
1. Safe Report wording incorrectly said macro drivers/replay evidence were missing when FRED was complete and replayRecords > 0.
2. RSI numeric parser treated rounded classic RSI numbers as hallucinations and sometimes parsed Stochastic RSI numbers as classic RSI.

Changes:
1. Safe Report wording
   - If missingCriticalMacroDrivers.length === 0 and FRED rows >= 11:
     Safe Report says macro coverage is complete but directional confidence remains capped.
   - If replayRecords > 0:
     Safe Report says replay evidence is available but limited/inconclusive.
   - Safe Report no longer says replay evidence is missing when replayRecords > 0.

2. RSI numeric parser cleanup
   - Masks Stochastic RSI phrases before parsing classic RSI.
   - Numbers inside "Stochastic RSI ..." are no longer treated as classic RSI values.
   - StochRSI validator remains responsible for Stochastic RSI numeric claims.

3. RSI numeric tolerance
   - Integer RSI mentions allow tolerance up to 1.0.
   - Decimal RSI mentions keep strict tolerance at 0.15.
   - Example: "RSI14: 28" matches snapshot RSI14=28.99.

Preserved:
- stoch_rsi_overbought_fact_error unchanged.
- stoch_rsi_oversold_fact_error unchanged.
- No macro logic changes.
- No technical indicator changes.
- No strategy module changes.
- No prompt macro gate changes.
- No credential/FRED key files included or overwritten.
