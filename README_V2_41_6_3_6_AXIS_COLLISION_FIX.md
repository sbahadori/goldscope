# GoldScope v2.41.6.3.6 - Scenario Axis Collision Avoidance

Builds on v2.41.6.3.5.

Fix:
The previous dynamic scenario mini-charts placed all right-axis labels exactly at their level Y.
When Entry/SL/TP levels were close, labels overlapped badly.

Changes:
- Keeps plotted dots and guide lines at their real dynamic Y positions.
- Adds collision avoidance for the right-side axis labels.
- Axis text is distributed with a minimum vertical gap.
- Curved connector lines map each adjusted label back to the true level position.
- TP levels are displayed as individual callouts.
- No fixed trading levels are hardcoded.
- UI still reads from snapshot.tradeScenarioPlan.

Preserved:
- Trade scenario planner
- Technical dashboard
- AI report logic
- Section 11
- BLS parser
- fundamentalContext
