# GoldScope v2.41.4.2 - Evidence Table Consistency Cleanup

Builds on v2.41.4.1.

Scope:
Only Evidence table wording cleanup.

Rules implemented:
1. Evidence table Technical context reliability must not be `Confirmed`.
   It is normalized to `Usable / confirmation context only`.
2. Evidence table must not use `RSI <30`.
   It uses the required RSI wording:
   `RSI14 is oversold; Stochastic RSI is also oversold.`
3. Evidence table Macro row must not conflict with Section 1.
   It is normalized to:
   `Macro coverage complete; NFP headline conditionally gold-negative; CPI still date-only.`
4. Section 11 is not changed.
5. `tradeScenarioPlan` object is not changed.
6. Macro logic, technical indicators, employment computation, and UI are not changed.

Preserved:
- Trade Scenario Planner from v2.41.4.1.
- Source attribution in Section 11.
- GC=F proxy warning.
- No synthetic data.
- No Math.random.
- No keys or credentials included.
