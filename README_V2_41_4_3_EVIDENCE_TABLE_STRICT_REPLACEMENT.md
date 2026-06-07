# GoldScope v2.41.4.3 - Evidence Table Strict Deterministic Replacement

Builds on v2.41.4.2.

Fix:
The v2.41.4.2 cleanup was partial because old Evidence table wording could survive earlier report generators.

Changes:
1. Deterministically replaces the Evidence table Macro row after all post-processing and before validation/display:
   | Macro | Macro coverage complete; NFP headline conditionally gold-negative; CPI still date-only | Mixed/conditional until USD/yields, sector/wage detail, and CPI outcome confirm | Partial |

2. Deterministically replaces the Evidence table Technical context row:
   | Technical context | Yahoo:GC=F bearish technical confirmation context; RSI14 is oversold; Stochastic RSI is also oversold; MACD bearish; ADX direction bearish | Technical confirmation context only; cannot override CPI/labor confirmation gaps | Usable / confirmation context only |

3. Final research note no longer says technical context dominates. It is normalized to:
   Technical context is bearish and weakens the bullish case, but directional bias remains blocked until CPI outcome, USD/yields reaction, employment-quality confirmation, and replay alignment improve.

Preserved:
- Section 11 unchanged.
- `tradeScenarioPlan` object unchanged.
- Macro logic unchanged.
- Technical indicators unchanged.
- Employment computation unchanged.
- Technical Dashboard UI unchanged.
- BLS parser unchanged.
- No synthetic data.
- No Math.random.
- No keys or credentials included.
