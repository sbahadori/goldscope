GoldScope v2.41.1.7 - NFP Invalidation Direction Guard

Builds on v2.41.1.6.

Purpose:
Prevent Safe Report fallback caused by validator detecting ambiguous NFP examples inside Invalidation conditions.

Problem observed:
Raw AI wrote a bullish-case invalidation line like:
Invalidation conditions: If macro weakens (e.g., strong NFP, rising yields/USD), ...

The validator correctly treats strong NFP + rising yields/USD as gold-negative, but the phrase was ambiguous inside a bullish-case context and triggered:
nfp_direction_error_strong_labor.

Fix:
1. Adds normalizeNfpDirectionalInvalidationPhrases(reportText).
2. In Section 4 Bullish case:
   strong NFP/labor + rising yields/USD is rewritten to:
   Invalidation conditions: if labor data strengthens expectations and yields/USD rise, the bullish case weakens; if hot inflation lifts real yields, the bullish case weakens.

3. In Section 5 Bearish case:
   weak NFP/labor + falling yields/USD is rewritten to:
   Invalidation conditions: if labor data weakens expectations and yields/USD fall, the bearish case weakens; if real yields fall despite hot inflation, the bearish case weakens.

4. Parenthetical examples are made explicit:
   strong NFP + rising yields/USD = gold-negative / weakens bullish case
   weak NFP + falling yields/USD = gold-supportive / weakens bearish case

Preserved:
- Validators unchanged.
- Macro logic unchanged.
- Employment data logic unchanged.
- Technical indicators unchanged.
- Strategy modules unchanged.
- Safe Report core logic unchanged.
- No credential/FRED key files included or overwritten.
