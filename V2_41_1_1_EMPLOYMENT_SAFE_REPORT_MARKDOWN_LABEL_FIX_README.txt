GoldScope v2.41.1.1 - Employment Safe Report Awareness + Markdown Technical Label Relabel Fix

Builds on v2.41.1.

Purpose:
Small polish/fix before v2.41.2 Calendar Forecast/Previous Import.

Changes:
1. Employment-aware Safe Report
   If employmentEvent.status === "partial_fred_backfill", Safe Report now explicitly states:
   - PAYEMS actual=<value> from FRED
   - UNRATE=<value> from FRED
   - forecast/previous/wage data/sector composition are missing
   - surpriseDirection=forecast_missing
   - goldImpact=wait_for_confirmation

2. Safe Report wording no longer says all event actual/forecast data is missing.
   It separates:
   - Next CPI actual/forecast missing
   - Prior Employment Situation event is partially available from FRED

3. Evidence table now includes an Employment event intelligence row when partial FRED backfill exists.

4. Markdown technical evidence relabel fix
   The technical label normalizer now catches:
   - **Confirmed evidence**: Technical context ...
   - - **Confirmed evidence**: Technical context ...
   - Confirmed evidence: Technical context ...
   - Confirmed evidence: RSI / StochRSI / EMA / MACD / ADX / strategy modules ...

5. Pure technical confirmed evidence becomes:
   Technical confirmation context: ...

6. Mixed macro + technical confirmed evidence is split:
   Confirmed evidence: macro part.
   Technical confirmation context: technical part.

Preserved:
- Validators unchanged.
- Macro logic unchanged.
- Technical indicators unchanged.
- Strategy modules unchanged.
- Employment data logic unchanged.
- Safe Report core logic preserved, only wording/enrichment changed.
- No credential/FRED key files included or overwritten.
