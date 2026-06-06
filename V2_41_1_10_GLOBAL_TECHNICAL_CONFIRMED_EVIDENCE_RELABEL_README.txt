GoldScope v2.41.1.10 - Global Technical Confirmed Evidence Relabel

Builds on v2.41.1.9.

Purpose:
Close the remaining fallback caused by:
- **Confirmed evidence:** Technical context (Yahoo:GC=F bearish, 75% usable data).

Why v2.41.1.9 was insufficient:
Earlier relabelers were section-aware and pattern-aware. A line could still survive if the section boundary or intermediate post-processing shape changed.

Fix:
Adds forceGlobalTechnicalConfirmedEvidenceRelabel(reportText, snapshot), executed as the final text mutation before validation.

Behavior:
- Scans the entire post-processed output line by line.
- Preserves "Confirmed evidence: none."
- Any remaining Confirmed evidence line containing:
  technical context, technical bias, technical analysis, technicals, Yahoo:GC=F, GC=F, RSI, StochRSI, MACD, ADX, EMA, Bollinger, Keltner, support, resistance, or strategy modules
  is converted to:
  Technical confirmation context: ...

- Mixed macro + technical lines are split into Conditional evidence + Technical confirmation context.
- Runs after sanitizer, scenario/header processing, cleanup, Section 7 replacement, masked sanitizer, and immediately before validation.

Preserved:
- Validators unchanged.
- Macro logic unchanged.
- Employment data logic unchanged.
- Technical indicators unchanged.
- Strategy modules unchanged.
- Safe Report core logic unchanged.
- No credential/FRED key files included or overwritten.
