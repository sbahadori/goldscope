# GoldScope v2.41.6.4.1 - No White Screen Hotfix

Builds on v2.41.6.4.

Root cause:
`buildAndOpenTradePlan` was defined inside AIScenarioEngine scope, but the Dashboard view tried to call it from the App-level views object. That caused a runtime ReferenceError during initial render and produced a white screen.

Fix:
- Added App-level `tradePlanWorkflowStatus`.
- Added App-level `requestTradePlanBuild()`.
- Dashboard no longer directly calls AIScenarioEngine-internal functions.
- Dashboard queues a deterministic trade-plan build request in localStorage and navigates to AI Analysis.
- AIScenarioEngine consumes the pending request on mount and runs `buildAndOpenTradePlan()`.
- AI is not called. The flow still builds deterministic snapshot + tradeScenarioPlan only.

Preserved:
- TradeScenarioDashboardPanel still only reads `snapshot.tradeScenarioPlan`.
- AI report logic unchanged.
- Section 11 unchanged.
- Technical Dashboard unchanged.
- BLS parser unchanged.
