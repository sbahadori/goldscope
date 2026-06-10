# GoldScope v2.41.6.3.5 - Dynamic Scenario Path Logic Sequencing Fix

Builds on v2.41.6.3.3.

Goal:
Make the scenario path mini charts dynamic and logically sequenced.

Changes:
- Y-axis positions are calculated dynamically from scenario levels:
  - entryZone / entryTrigger / saferEntry
  - stopLoss
  - activationTrigger / trigger / validity
  - takeProfit / targets
- No fixed trading levels are hardcoded in the chart.
- Scenario charts now visually separate:
  - setup phase
  - trigger phase
  - entry + follow-through phase
- Entry is placed after Trigger in the scenario sequence.
- Setup path is faint/dashed.
- Active path is stronger.
- Invalidation path is faint/dashed.
- TP levels are shown individually on the right axis.
- Right-axis labels are aligned in the same SVG coordinate system as the plotted levels.

Important:
- X-axis remains schematic / sequence-based.
- Y-axis is dynamic based on the scenario/technical levels.
- No new levels, targets, stops, or triggers are created.
- UI still reads from snapshot.tradeScenarioPlan.
- AI output is not parsed.

Preserved:
- Technical Dashboard
- Trade scenario planner
- AI report logic
- Section 11
- BLS parser
- fundamentalContext
