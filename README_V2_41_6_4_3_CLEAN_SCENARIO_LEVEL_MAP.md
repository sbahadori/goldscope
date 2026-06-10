# GoldScope v2.41.6.4.3 - Clean Scenario Level Map + Source Note

Builds on v2.41.6.4.2.

Fixes:
- Replaces the misleading schematic mini path with a cleaner current-anchored scenario level map.
- Pre-trigger segment starts from the current technical snapshot price and moves only to the next required condition.
- Removes exaggerated artificial dips/spikes in scenario sketches.
- Keeps the chart explicitly schematic: X-axis is sequence, Y-axis is dynamic from scenario levels.
- Adds a price-source note: trade targets use GC=F/Yahoo proxy snapshot levels and may differ from live TradingView OANDA:XAUUSD spot quote.

Preserved:
- snapshot.tradeScenarioPlan as the source.
- scenario.chartAlignment panels.
- AI report logic.
- Technical indicators.
- BLS parser.
- Section 11.
