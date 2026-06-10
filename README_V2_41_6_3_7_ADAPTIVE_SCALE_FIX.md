# GoldScope v2.41.6.3.7 - Adaptive Scenario Scale Fix

Builds on v2.41.6.3.6.

Problem fixed:
The mini scenario graph previously used a fully linear raw-price scale. When one distant target (for example 4100) existed together with a tight cluster around 4365/4337/4312, the cluster became visually compressed.

Solution:
- Replaced the raw linear mini-chart scale with an adaptive scenario scale.
- The scale is still fully dynamic and derives only from the scenario's real numeric levels.
- Ordered price levels are preserved.
- Large gaps are compressed using sqrt-weighted spacing.
- Close but distinct levels now get more readable vertical separation.
- Axis labels and connector lines still point to the correct level positions.

Preserved:
- No hardcoded trading levels
- snapshot.tradeScenarioPlan as the source
- Technical dashboard, AI report, BLS parser, fundamentalContext
