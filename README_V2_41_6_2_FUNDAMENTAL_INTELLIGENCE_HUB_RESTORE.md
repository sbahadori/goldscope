# GoldScope v2.41.6.2 - Fundamental Intelligence Hub Restore

Builds on v2.41.6.1.

Goal:
Restore and centralize the earlier event/calendar/scenario/replay engines into a structured `snapshot.fundamentalContext` object.

Added:
- `buildFundamentalContext()`
- `normalizeCalendarRiskForFundamental()`
- `buildEventForecastsForFundamental()`
- `normalizeReplayForFundamental()`
- `buildFundamentalScenariosForSnapshot()`

Snapshot now includes:
```js
snapshot.fundamentalContext = {
  macroBias,
  macroReliability,
  calendarRisk,
  nextMajorEvent,
  eventForecasts,
  employment,
  replayEvidence,
  fundamentalScenarios,
  fundamentalBias,
  confidenceCaps,
  missingEvidence,
  confirmationRequired,
  sourceTrace
}
```

Important:
- This patch does not move calculations into AI.
- Calendar/event/forecast/replay/scenario logic remains deterministic.
- AI receives `fundamentalContext` as structured input for narrative explanation only.
- UI can later read `snapshot.fundamentalContext` directly.

Preserved:
- Product shell.
- AI Analysis tab.
- Technical Dashboard.
- Trade Scenario Dashboard.
- `snapshot.tradeScenarioPlan`.
- Section 11.
- BLS Sector Composition Parser.
- Evidence table strict replacement.
- Final note guard.
- No broker connection.
- No automatic trading.
- No keys or credentials.
