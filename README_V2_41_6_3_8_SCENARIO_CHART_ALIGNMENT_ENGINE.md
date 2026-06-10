# GoldScope v2.41.6.3.8 - Scenario Chart Alignment Engine

Builds on v2.41.6.3.7.

Purpose:
Add a scenario-to-chart alignment layer so trade scenarios are no longer only schematic. Each scenario receives chart-aware status from current technical/candle context.

Added:
- buildScenarioChartAlignment()
- getTechnicalChartContext()
- ScenarioAlignmentBadge
- ScenarioAlignmentPanel

Each scenario now receives:
```js
scenario.chartAlignment = {
  timeframe,
  preferredTimeframe,
  status, // not_active | watch | near_trigger | triggered | invalidated
  currentPrice,
  currentPriceDistanceToEntry,
  currentPriceDistanceToStop,
  currentPriceDistanceToTrigger,
  nearestSupport,
  nearestResistance,
  emaAlignment,
  candleConfirmation,
  invalidationReason,
  multiTfBias,
  levels
}
```

Rules:
- Sell on rebound prefers 4h.
- Breakdown sell prefers 1h.
- Support bounce buy prefers 1h.
- Breakout buy prefers 4h.
- Buy scenarios are not active unless price/technical context supports them.
- Counter-trend bounce remains watch unless reversal confirmation appears.
- Breakdown requires confirmed break / close / retest context.
- Breakout requires clean hold above trigger.

Important:
- This is UI-level alignment derived from snapshot.technicalContext + snapshot.tradeScenarioPlan.
- It does not create new trade levels.
- It does not parse AI output.
- It does not change Section 11, technical indicators, AI report, BLS parser, or tradeScenarioPlan generation.
