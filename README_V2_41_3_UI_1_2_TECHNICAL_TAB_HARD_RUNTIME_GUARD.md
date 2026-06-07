# GoldScope v2.41.3-ui.1.2 - Technical Tab Hard Runtime Guard

Builds on v2.41.3-ui.1.1.

Purpose:
Fix persistent white screen when clicking the Technical tab.

Approach:
The previous panel was too complex and still had runtime-risky assumptions.
This version replaces the whole TechnicalDashboardPanel with a hardened version:

- wraps render body in try/catch
- uses local safe getters
- uses local safe formatter
- guards missing/partial technicalContext
- avoids all Chart.js/CDN/Math.random
- uses SVG only if numeric levels exist
- shows an error card instead of white-screen if a render error happens

No report, validator, macro, employment, post-processing, or technical-computation logic changed.

Expected:
Clicking Technical should never white-screen. If data is malformed, an in-panel error card should appear instead.
