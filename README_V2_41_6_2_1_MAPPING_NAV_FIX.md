# GoldScope v2.41.6.2.1 - Fundamental Context Source Mapping + Dashboard Navigation Fix

Builds on v2.41.6.2.

Fixes:
1. Dashboard action buttons now work:
   - Open Analytics
   - Open AI Analysis

Cause:
ProductDashboardPage was defined outside App but called setActive directly.
Fix:
App now passes `onNavigate={setActive}` into ProductDashboardPage.

2. fundamentalContext.replayEvidence now maps from:
   - snapshot.replayEvidence.latest
   - snapshot.replayEvidence.recent
   - deterministicScenarioLab.replaySignal
   - replayCompact fallback

3. If replaySignal.missingReplay=false, fundamentalContext no longer reports:
   - recordCount=0
   - alignment=missing
   - reliability=missing

4. sourceTrace.calendarEvents now counts:
   - snapshot.calendar.upcomingHighImpact
   - calendar.eventRiskSummary.next72h
   - calendar.eventRiskSummary.highNext72h
   - calendar.nextMajor fallback

5. sourceTrace.replayRecords now uses fundamentalContext.replayEvidence.recordCount.

Not changed:
- Technical Dashboard logic
- Trade Scenario Dashboard logic
- Section 11
- AI report validators and final note guard
- BLS parser
- technical indicators
- tradeScenarioPlan object
