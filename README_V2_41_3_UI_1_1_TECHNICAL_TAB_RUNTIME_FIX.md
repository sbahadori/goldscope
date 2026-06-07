# GoldScope v2.41.3-ui.1.1 - Technical Tab Runtime Fix

Builds on v2.41.3-ui.1.

Purpose:
Fix white screen when clicking the Technical tab.

Root cause:
`TechnicalDashboardPanel()` referenced `safeValue(...)`, but that helper was not guaranteed to exist in the component scope at runtime.

Fix:
- Adds a local `fmtSafe(value, fallback)` formatter inside `TechnicalDashboardPanel()`.
- Replaces `safeValue(...)` calls with `fmtSafe(...)`.
- No report, validator, macro, employment, or technical-computation logic changed.

Expected result:
The Technical tab should render instead of showing a blank page.
