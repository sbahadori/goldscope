GoldScope v2.41 - Employment Event Intelligence Layer

Builds on v2.37.8.

Purpose:
Add composition-aware Employment Situation/NFP intelligence to GoldScope.

Modules added:
1. eventActualForecastExtractor
   - Extracts actual, forecast, previous values from saved event result/calendar event.
   - Parses K/M/B/% formatted values.
   - Computes surpriseK, surpriseDirection, previousDeltaK, previousComparison.

2. blsEmploymentSituationParser
   - Reads unemploymentRate, averageHourlyEarningsMoM, averageHourlyEarningsYoY.
   - Parses employment sector composition from the Event Results sector-composition text/notes.

3. laborCompositionAnalyzer
   - Classifies sector concentration:
     leisure_hospitality_heavy
     temporary_help_heavy
     government_heavy
     higher_quality_private_broadening
     mixed / not_yet_verified
   - Computes share of headline when sector changes and headline actual are available.

4. laborQualityClassifier
   - Combines headline surprise and composition signal.
   - Produces headlineSignal, compositionSignal, laborQualityScore, laborQualityLabel.

5. fedImplicationMapper
   - Maps employment signal to Fed implication:
     less_dovish, less_dovish_but_quality_dependent, more_dovish, etc.

6. goldImpactMapper
   - Maps Fed implication to conditional gold impact.
   - Requires confirmation from DXY, DGS10, DFII10, and gold post-event reaction.

Snapshot additions:
employmentEvent: {
  available,
  status,
  event,
  headline,
  details,
  quality,
  replayContext,
  guardrail
}

Prompt additions:
EMPLOYMENT EVENT INTELLIGENCE block is inserted before the GoldScope state snapshot.

Event Results UI additions:
For Employment Situation / Labor events:
- Unemployment rate
- Average hourly earnings MoM
- Average hourly earnings YoY
- Employment sector composition text box

Important guardrails:
- Do not treat headline NFP actual-vs-forecast as uniformly hawkish or dovish until sector composition, wage pressure, unemployment, USD/yields, and replay reaction are checked.
- If leisure/hospitality is concentrated, describe it as potentially seasonal/event-sensitive unless independent evidence links it to a specific event such as the World Cup.
- Do not invent World Cup causality.

Preserved:
- v2.37.8 post-processors remain.
- Validators unchanged.
- Safe Report logic unchanged.
- Macro logic unchanged.
- Technical indicators/candlestick/strategy modules unchanged.
- No credential/FRED key files are included or overwritten.
