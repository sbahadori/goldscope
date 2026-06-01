GoldScope v2.40.13 - Dominant Scenario Overclaim Validator

Builds on v2.40.12.

Purpose:
Strengthen validation against directional overclaiming when evidence is still incomplete.

New validator rules:
1. dominant_scenario_overclaim_error [HIGH]
   If deterministicScenarioLab.dominant is Wait/neutral, replayRecords=0,
   nextMajor event data is date-only, and critical macro drivers are missing,
   the raw AI must not set Dominant research scenario to Bullish or Bearish.

2. self_contradictory_directional_scenario_error [HIGH]
   If the raw AI chooses Bullish/Bearish while also saying event outcomes or
   replay evidence are still required/missing, reject it.

3. technical_numeric_fact_error [HIGH]
   If the AI mentions a technical numeric value that does not match any
   technical numeric value in the snapshot, reject it.
   Example: RSI14 < 7 when snapshot RSI14 values are around 41/66/31.

4. data_quality_warning_used_as_market_signal [MEDIUM]
   If many_invalid_ohlc_removed is treated as a volatility/trend/market signal,
   flag it. It is a data-quality warning, not market evidence.

Preserved:
- technical_confirmed_evidence_error remains high severity.
- NFP/CPI/yield validators remain unchanged.
- MacroGateLanguageHints remain unchanged.

No changes:
- No sanitizer changes.
- No macro scoring changes.
- No technical indicator changes.
- No strategy module changes.
- No Safe Report logic changes.
- No credential/FRED key files are included or overwritten.
