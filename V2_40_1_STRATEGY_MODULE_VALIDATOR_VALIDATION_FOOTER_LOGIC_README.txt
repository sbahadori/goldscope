GoldScope v2.40.1 - Strategy Module Validator + Validation Footer Logic

Builds on v2.40.

Purpose:
Small validation/UX patch only. No change to model prompt, macro logic, strategy module scoring, safe report logic, or technical calculations.

Fixes:
1. Technical context as confirmed evidence
   - If AI writes "Confirmed evidence: Technical context/technicals/strategy modules/EMA/RSI/MACD/ADX/etc.", this is HIGH severity.
   - Technicals and strategy modules are confirmation/contradiction context only.

2. Strategy module vs alignment action confusion
   - If AI describes alignmentContext.action such as force_wait_neutral as a strategy module, this is flagged.
   - Strategy modules are only: trend, momentum, volatility, structure.

3. Numeric RSI mismatch
   - If AI mentions an RSI value that does not match any RSI value in the snapshot, this is HIGH severity.

4. Footer logic
   - If HIGH issues exist: footer title remains REJECTED AI OUTPUT VALIDATION.
   - If only MEDIUM/LOW diagnostics exist: footer title becomes AI OUTPUT DIAGNOSTICS.
   - This prevents the UI from saying the raw AI was rejected when only non-critical diagnostics exist.

No credential/FRED key files are included or overwritten.
