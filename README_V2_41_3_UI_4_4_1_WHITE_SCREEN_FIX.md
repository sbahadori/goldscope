# GoldScope v2.41.3-ui.4.4.1 - Technical White Screen Fix

Builds on v2.41.3-ui.4.4.

Root cause fixed:
`setCandleCountSafe()` referenced `storedCandles.length` before `storedCandles` was initialized in the same component render. This can produce a runtime ReferenceError when the Technical tab mounts.

Fix:
- Remove the premature `storedCandles` reference from `setCandleCountSafe`.
- Keep in-chart wheel zoom and drag/pan behavior.
- Preserve Reset zoom and maximize chart behavior.

Preserved:
- Report generator unchanged.
- Validators unchanged.
- Macro/employment logic unchanged.
- BLS parser untouched.
- No synthetic data.
- No Math.random.
- No TradingView/Chart.js/CDN added.
