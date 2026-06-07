# GoldScope v2.41.6.3 - Trade Scenario Timeline Cards Redesign

Builds on the stable v2.41.6.2.2 runtime-safe version.

Purpose:
Redesign the GoldScope Trade Scenario Dashboard from side-by-side scenario cards into:
- A full-width Primary Scenario Hero Card
- A vertical ranked Alternative Scenarios section
- Scenario Timeline Cards
- Mini schematic scenario path charts

Important:
- The UI still reads from `snapshot.tradeScenarioPlan`.
- It does not parse AI output or Section 11 text.
- It does not create new levels, targets, stops, triggers, or probabilities.
- It does not modify Technical Dashboard, AI report logic, Section 11 generation, BLS parser, or tradeScenarioPlan generation.

New UI:
- Primary scenario is visually emphasized at the top.
- Alternatives are stacked vertically and ranked by existing order/rank.
- Each scenario has a schematic scenario path chart:
  - Sell on rebound: rebound -> rejection -> lower
  - Breakdown sell: range -> break -> retest -> lower
  - Support bounce buy: support touch -> bounce -> recovery
  - Breakout buy: range -> breakout -> hold -> higher
- Each scenario includes Trigger -> Entry -> Stop -> Targets flow.
- Source attribution is preserved.
- Proxy warning and decision footer are preserved.

No broker connection. No automatic trading. Research software only.
