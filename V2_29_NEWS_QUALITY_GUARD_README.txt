GoldScope v2.29 - News Quality Guard

Changes:
1. Adds newsStrength:
   - strong
   - moderate
   - weak

2. Adds sourceTier per news item:
   - high
   - medium
   - low

3. If only one macro-relevant news item exists and it is low-tier/retail-style, newsStrength becomes weak.

4. Prompt now says:
   - Do not call a single weak news item confirmed directional evidence.
   - If newsStrength is weak, news must be described as weak/limited.
   - Weak news cannot be placed under Confirmed evidence.

No credential/FRED key files are included or overwritten.
