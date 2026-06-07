GoldScope v2.41.2.3 - Known NFP vs Missing CPI Wording Cleanup

Builds on v2.41.2.2.

Purpose:
Clean up semantic wording after NFP actual/forecast/previous are now available.

Problem:
The report could still say broad phrases such as:
- event actual/forecast values are incomplete
- NFP/CPI outcomes are missing
- no confirmed macro drivers (e.g., NFP, CPI outcomes)
- blank event actual/forecast values

This is now imprecise because the NFP headline is available:
actual=172K, forecast=85K, previous=179K, surpriseK=87.
The missing parts are CPI actual/forecast plus labor quality/market confirmation.

Rules implemented:
1. If employmentEvent.status === fred_actual_calendar_forecast_previous and CPI nextMajor quality is date-only:
   Generic event-missing wording becomes:
   CPI actual/forecast remains missing; NFP headline is available but still requires sector composition, wage pressure, USD/yields confirmation, and replay alignment.

2. Section 7 deterministic technical text now says:
   blank CPI actual/forecast values and incomplete employment confirmation evidence
   instead of:
   blank event actual/forecast values

3. Section 5 bearish invalidation removes support/break wording and uses:
   If USD/yields fail to confirm the stronger labor signal, or if CPI/real-yield reaction turns gold-supportive, the bearish case weakens.

Preserved:
- Validators unchanged.
- Macro logic unchanged.
- Employment computation unchanged.
- Technical indicators unchanged.
- Strategy modules unchanged.
- Safe Report core logic unchanged.
- No credential/FRED key files included or overwritten.

Next:
v2.41.3 - BLS Sector Composition Parser
