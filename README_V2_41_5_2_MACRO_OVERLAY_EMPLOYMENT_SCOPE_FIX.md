# GoldScope v2.41.5.2 - Macro Overlay Employment Scope Fix

Builds on v2.41.5.1.

Fix:
`macroFundamentalOverlayMapper()` already defined the scoped employment event as `e`, but the BLS v2.41.5 merge accidentally referenced `employment` inside the reason builder.

Crash:
ReferenceError: employment is not defined

Change:
- Replaces accidental `employment.*` references inside `macroFundamentalOverlayMapper()` with the scoped `e.*`.

Preserved:
- BLS Sector Composition Parser unchanged.
- Recompute employment helper unchanged.
- Section 11 unchanged.
- tradeScenarioPlan object unchanged.
- Evidence table strict replacement unchanged.
- Final note grammar cleanup unchanged.
- Technical indicators unchanged.
- Technical Dashboard UI unchanged.
- No synthetic data.
- No Math.random.
- No keys or credentials included.
