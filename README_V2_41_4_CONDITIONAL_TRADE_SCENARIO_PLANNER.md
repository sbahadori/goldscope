# GoldScope v2.41.4 - Conditional Trade Scenario Planner

Adds a deterministic, rule-based trade scenario planner.

Scope:
- Adds `tradeScenarioPlan` builder functions.
- Adds deterministic Section 11: Conditional trade scenario plan.
- Adds basic trade-plan validation diagnostics.
- Keeps all trade outputs conditional and research-only.
- Does not execute trades.
- Does not connect to a broker.

Preserved:
- Technical indicators unchanged.
- Macro logic unchanged.
- Employment computation unchanged.
- BLS parser untouched.
- Report validators preserved.
- Technical Dashboard UI preserved.

Core scenarios:
1. Sell on rebound.
2. Breakdown sell.
3. Support bounce buy.
4. Breakout buy.

Guardrails:
- No direct `buy now` / `sell now` instruction.
- Stop loss required.
- Trigger required.
- Fundamental overlay required.
- CPI and NFP wording must remain conditional when confirmation data is incomplete.
