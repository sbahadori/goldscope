GoldScope v2.40.3 - Technical Quality Gate Calibration

Builds on v2.40.2.

Purpose:
Small technical reliability patch.

Fix:
- stoch_rsi_extreme_possible_overextension is now treated as a warning-only condition.
- rsi_extreme_possible_bad_data_or_overextension is warning-only unless other hard failures exist.
- many_invalid_ohlc_removed is warning-only when the source still has qualityScore >= 70 and cleanCount >= 200.
- Technical context becomes unreliable only when hard technical failures exist.

Why:
Stochastic RSI at 0 or 100 can be a valid overextension/momentum condition, not necessarily a data failure.
A Yahoo GC=F series can remove many invalid raw OHLC rows but remain usable after cleaning when cleanCount and qualityScore are strong.

No changes:
- No change to strategy modules.
- No change to technical indicator formulas.
- No change to prompt.
- No change to macro logic.
- No change to Safe Report logic.
- No credential/FRED key files are included or overwritten.
