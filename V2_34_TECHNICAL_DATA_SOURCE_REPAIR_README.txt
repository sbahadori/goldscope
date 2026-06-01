GoldScope v2.34 - Technical Data Source Repair

Builds on v2.33.4.

Purpose:
Repair the technical data layer so GoldScope does not depend only on Yahoo GC=F intraday data.

New data-source order:
1. Yahoo XAUUSD=X 90d / 1h
2. Yahoo XAUUSD=X 1y / 1d
3. Yahoo GC=F 90d / 1h
4. Yahoo GC=F 1y / 1d
5. Stooq xauusd daily fallback

New quality controls:
- OHLC validation
- zero/negative price removal
- expected gold price range guard
- median-distance outlier filtering
- large discontinuity candle removal
- last-price-vs-median sanity
- qualityScore and qualityLabel for each source attempt
- selected source and all attempts are stored in technicalContext.sourceSelection

Expected behavior:
- Prefer XAUUSD=X over GC=F when available.
- Use GC=F only as futures proxy fallback.
- If all sources are weak/bad, technicalContext remains unreliable/masked.
- The AI sees only usable technical signals when the chosen source passes quality checks.

No credential/FRED key files are included or overwritten.
