GoldScope v2.33.1 - Technical Logic Sanity + NFP Direction Validator

Builds on v2.33.

Fixes:
1. Technical data sanity guard
   - Filters zero/negative support levels.
   - Marks technicalContext as unreliable if EMA values are too far from price.
   - Marks RSI=100/0 as possible bad data or overextension.
   - Caps technicalConfidence at 20 when technical data is unreliable.
   - Prevents unreliable technicalContext from becoming directional evidence.

2. NFP direction validator
   - Weak NFP/labor + falling yields/USD should be gold-supportive, not bearish.
   - Strong NFP/labor + rising yields/USD should be gold-negative, not bullish.
   - Strong NFP with falling USD should be labeled as abnormal/contradictory reaction, not simple bullish confirmation.

3. EMA alignment logic
   - EMA20 below EMA200 cannot be described as bullish by itself.
   - Price above EMA200 alone is only mild support.

4. Conceptual example guard
   - Flags "e.g. strong payrolls", "e.g. rate hikes", etc. when forecast/actual fields are blank.

No credential/FRED key files are included or overwritten.
