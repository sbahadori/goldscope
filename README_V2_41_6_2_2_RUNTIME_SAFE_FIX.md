# GoldScope v2.41.6.2.2 - Runtime Safe Navigation + Fundamental Mapping Fix

Builds on v2.41.6.2.

Why:
v2.41.6.2.1 caused a white-screen runtime failure. This patch rolls back to v2.41.6.2 and applies the fixes more safely.

Fixes:
1. Dashboard buttons now work without scope errors:
   - Open Analytics
   - Open AI Analysis
   - Refresh macro/news

Implementation:
- ProductDashboardPage receives navigation and refresh handlers from App:
  `onNavigate={setTab}`
  `onRefreshMacroNews={() => { refreshFred(); refreshGdelt(); }}`

2. fundamentalContext replay mapping:
- Reads from snapshot.replayEvidence.latest
- Reads from snapshot.replayEvidence.recent
- Reads from deterministicScenarioLab.replaySignal
- Falls back to replayCompact

3. fundamentalContext sourceTrace:
- calendarEvents counts calendar.upcomingHighImpact, eventRiskSummary lists, or nextMajor fallback.
- replayRecords uses replayEvidence.recordCount.

Not changed:
- Technical Dashboard engine
- Trade Scenario Dashboard
- Section 11
- AI report logic
- BLS parser
- tradeScenarioPlan object
