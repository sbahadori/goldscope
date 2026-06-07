# GoldScope v2.41.3-ui.1.5 - Clean Level Map Legend

Builds on v2.41.3-ui.1.4.

Purpose:
Fix level-map label overlap in the Technical tab.

Problem:
The SVG chart had too many price-level labels placed directly on the right side of the chart. When price levels were close, labels overlapped and became unreadable.

Fix:
- Removes text labels from the chart itself.
- Keeps horizontal level lines and endpoint markers.
- Adds a grouped legend/table beside the chart.
- Groups levels into Price, EMA, Bands, Resistance, and Support.
- Keeps the panel snapshot-driven and UI-only.

Preserved:
- Technical tab reads localStorage snapshot only.
- No report generator changes.
- No validator changes.
- No macro/employment logic changes.
- No BLS parser changes.
- No CDN / no Math.random.
- npm scripts dev/build/preview preserved.

No credential/FRED key files included or overwritten.
