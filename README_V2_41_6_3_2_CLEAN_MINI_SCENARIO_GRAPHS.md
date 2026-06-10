# GoldScope v2.41.6.3.2 - Clean Mini Scenario Graphs

Builds on v2.41.6.3.1.

Fix:
The previous mini scenario graph labels were too crowded. Long trigger/entry text overlapped the path.

Changes:
- Removed long values from inside the plotted path.
- Kept only short marker labels inside the mini graph: Trigger, Entry, SL, TP.
- Added a clean right-side Level Axis panel beside each mini graph.
- Right axis shows:
  - SL
  - Entry
  - TP
- Long trigger text remains in the timeline/value grid, not inside the graph.
- No trading levels are recalculated or invented.

Preserved:
- snapshot.tradeScenarioPlan source.
- Technical Dashboard.
- AI report logic.
- Section 11.
- BLS parser.
- fundamentalContext.
