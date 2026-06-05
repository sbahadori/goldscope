GoldScope v2.28 - Evidence Label Guard + Confidence Cap

Fixes:
- Prevents AI from calling future unobserved outcomes "confirmed".
- Adds news relevance classification:
  - macro-relevant
  - mixed-relevance
  - low-relevance
- Adds contextQualityFlags.newsRelevance and macroRelevantNewsCount.
- Adds maxRecommendedConfidence so the AI should not exceed the deterministic/quality-based cap.
- Strengthens prompt instructions:
  - no "Confirmed: Weak NFP" when NFP actual/forecast is blank
  - no overstatement of low-relevance gold-company or retail gold-price articles
  - future events must be labeled conditional/unconfirmed

No credential/FRED key files are included or overwritten.
