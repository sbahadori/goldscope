# GoldScope v2.41.5.3 - BLS Sector Parser Data Path + Final Note Guard Restore

Builds on v2.41.5.2.

Fixes:
1. If `sectorCompositionText` is empty, the Employment row explicitly says:
   `sectorCompositionText missing; BLS parser not executed; compositionSignal=composition_not_verified`

2. If `sectorCompositionText` exists but no sector can be parsed:
   `parserStatus=sector_text_present_but_unparsed; compositionSignal=composition_not_verified`

3. If `sectorCompositionText` exists and sectors are parsed:
   - employmentEvent.details.sectorBreakdown
   - employmentEvent.details.sectorConcentration
   - employmentEvent.details.compositionSignal
   - employmentEvent.details.laborQualitySignal

4. The BLS parser no longer silently treats generic notes as successful sector input. The dedicated `sectorCompositionText` field is the authoritative input.

5. Final research note is deterministically restored to:
   `Technical context is bearish and weakens the bullish case, but directional bias remains blocked until CPI outcome, USD/yields reaction, employment-quality confirmation, and replay alignment improve.`

6. The phrase `confirmed technical bearishness` is blocked/replaced.

Preserved:
- Section 11 unchanged.
- tradeScenarioPlan object unchanged.
- Trade level source attribution unchanged.
- Technical indicators unchanged.
- Technical Dashboard UI unchanged.
- Main macro framework unchanged.
- No synthetic data.
- No Math.random.
- No keys or credentials included.
