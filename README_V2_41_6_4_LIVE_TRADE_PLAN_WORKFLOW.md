# GoldScope v2.41.6.4 - Live Trade Plan Tab + No-AI Build Flow

Builds on v2.41.6.3.8.

Purpose:
Trade Scenario Dashboard / Trade Targets should not require AI Analysis first.

Added:
- New top navigation tab: `Trade Targets`
- Dashboard button: `Build Trade Plan`
- Dashboard button: `Open Trade Targets`
- AI Analysis button: `Build Trade Plan`
- App-scoped handler: `buildAndOpenTradePlan()`

Workflow:
1. User clicks Build Trade Plan.
2. If technical context is missing/error, the app calls `loadTechnicalContext()`.
3. App builds a live snapshot via `buildGoldScopeContextSnapshot()`.
4. If needed, app ensures `snapshot.tradeScenarioPlan = buildGoldTradeScenarioPlan(snapshot)`.
5. Snapshot is saved to `localStorage.goldscope.latestSnapshot.v1`.
6. User is navigated to `tradePlan`.

Architecture:
- App / Control Center builds the deterministic snapshot.
- TradeScenarioDashboardPanel remains a display panel.
- TradeScenarioDashboardPanel still reads from `snapshot.tradeScenarioPlan`.
- AI output is not parsed and is not required.

Preserved:
- AI report logic
- Section 11
- Technical Dashboard
- BLS parser
- fundamentalContext
- tradeScenarioPlan generation logic
