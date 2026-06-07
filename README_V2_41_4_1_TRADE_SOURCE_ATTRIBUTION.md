# GoldScope v2.41.4.1 - Trade Scenario Plan Source Attribution + Wording Cleanup

Builds on v2.41.4 Conditional Trade Scenario Planner.

Changes:
1. Adds `snapshot.tradeScenarioPlan = buildGoldTradeScenarioPlan(snapshot)` to the GoldScope context snapshot.
2. Adds source attribution for scenario entry, stop, and target levels:
   - EMA20
   - EMA50
   - support cluster
   - resistance cluster
   - Bollinger lower extension
   - extended objective
3. Adds explicit proxy-level warning:
   - These are approximate proxy levels from GC=F technical context, not exact spot XAUUSD levels.
4. Cleans Final research note wording so it does not say NFP data is missing when NFP headline is available.
5. Section 11 now prints source lines for entry/stop/targets.

Preserved:
- Macro logic unchanged.
- Technical indicator calculations unchanged.
- Employment computation unchanged.
- Technical Dashboard UI unchanged.
- BLS parser unchanged.
- No synthetic data.
- No Math.random.
- No keys or credentials included.
