GoldScope v2.36 - Event Replay Evidence Layer

Builds on v2.35.4.

Purpose:
Add replay evidence so GoldScope can store post-event market reactions after NFP/CPI/FOMC and use them in future scenario reports.

Adds:
1. Local replay storage
   - Uses browser localStorage key: goldscope.eventReplayRecords.v1
   - Stores up to 200 replay records locally.
   - No server, API key, or credential file required.

2. Replay workflow
   - Capture Pre-Event Anchor:
     saves nextMajor event, current technical context, and current gold proxy price before the event.
   - Save Post-Event Replay:
     saves current technical context and gold proxy price after the event.
   - Clear Replay Records:
     removes local replay records.

3. Replay record fields
   - event id/name/date/time/category
   - eventOutcome previous/forecast/actual/surpriseDirection placeholders
   - before/after market fields:
     goldPrice, usdIndex, nominalYield, realYield
   - technicalBefore/technicalAfter
   - reaction classification:
     gold_supportive_reaction, gold_negative_reaction,
     contradictory_gold_resilience, contradictory_gold_weakness,
     muted_reaction, insufficient_reaction_data
   - qualityScore

4. Snapshot integration
   - replayEvidence.latest
   - replayEvidence.recent
   - replayEvidence.count
   - replayEvidence.replaySignal
   - replayEvidence.summary
   - dataReadiness.replayRecords
   - contextQualityFlags.replayReliability

Current limitation:
- USD/yield before/after fields are placeholders unless manually extended later.
- This version captures technical and gold proxy reaction automatically from the current technical context.
- Future version should auto-fill DXY/nominal yield/real yield from FRED or another market data source.

No credential/FRED key files are included or overwritten.
