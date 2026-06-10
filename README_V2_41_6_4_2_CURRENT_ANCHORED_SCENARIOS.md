# GoldScope v2.41.6.4.2 - Current Anchored Scenario Paths + Hover Guard

Builds on v2.41.6.4.1.

Fixes:
1. Scenario mini charts are now anchored to the current technical price.
   - Pre-trigger path starts from `scenario.chartAlignment.currentPrice`.
   - Sell on rebound: current price -> rebound zone -> rejection -> entry -> lower targets.
   - Breakdown sell: current price -> support/trigger -> confirmed break/retest -> lower targets.
   - Support bounce buy: current price -> support test -> reversal trigger -> entry -> recovery.
   - Breakout buy: current price -> breakout trigger -> hold/entry -> higher targets.
2. Technical chart hover no longer updates legend when hovering outside the plot horizontal bounds.

Important:
- No hardcoded trade levels.
- Levels still come from `snapshot.tradeScenarioPlan` and `scenario.chartAlignment`.
- Mini charts remain schematic, but their pre-trigger section now follows the current chart context.
- AI report, Section 11, BLS parser, and tradeScenarioPlan generation are unchanged.
