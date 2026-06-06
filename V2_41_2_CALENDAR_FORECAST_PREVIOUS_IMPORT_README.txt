GoldScope v2.41.2 - Calendar Forecast/Previous Import

Builds on v2.41.1.11 stable checkpoint.

Purpose:
Import forecast and previous values for Employment Situation/NFP when actual payroll is available from FRED but forecast/previous are missing.

Implemented for:
- Employment Situation - May 2026
- id: bls-nfp-2026-06-05
- forecast: 85K
- previous: 179K
- source: User-provided calendar/provider import

Why:
FRED/PAYEMS can provide actual payroll change, but it does not provide market forecast/consensus.
The forecast/previous values come from external calendar/provider/manual enrichment.

Behavior:
1. If eventResults/calendar already have forecast/previous, those take priority.
2. If they are missing and a calendar import exists, the import fills:
   - forecast
   - previous
   - forecastSource
   - previousSource
   - forecastPreviousImport metadata

3. If FRED PAYEMS actual is also available:
   - actual stays from FRED PAYEMS fallback
   - forecast/previous come from calendar/provider import
   - surpriseK is calculated
   - surpriseDirection is calculated

Expected result for current snapshot:
actual=172K
forecast=85K
previous=179K
surpriseK=87
surpriseDirection=stronger_than_expected
previousDeltaK=-7
previousComparison=near_previous
status=fred_actual_calendar_forecast_previous

Guardrails:
- The import does not infer sector composition.
- sectorConcentration remains not_yet_verified until BLS sector parser is implemented.
- The system should not attribute jobs to Leisure/Hospitality or World Cup without sector evidence.
- Gold impact remains conditional and still requires DXY, DGS10, DFII10, and gold post-event reaction.

UI:
Event Results now shows an import badge and an "Apply forecast/previous to form" button when an import exists.

Preserved:
- Validators unchanged.
- Macro logic unchanged.
- Employment data logic extended only for forecast/previous readiness.
- Technical indicators unchanged.
- Strategy modules unchanged.
- Safe Report core logic unchanged.
- No credential/FRED key files included or overwritten.

Next:
v2.41.3 - BLS Sector Composition Parser
