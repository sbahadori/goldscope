GoldScope v2.37.5 - Snapshot Numeric Grounding Prompt Patch

Builds on v2.37.4.

Purpose:
Reduce raw AI hallucination of technical numbers, especially RSI14 and Stochastic RSI values.

Changes:
1. Adds TECHNICAL NUMERIC FACTS block before GOLDSCOPE STATE SNAPSHOT in the prompt.

2. The block lists only allowed technical numeric facts:
   - Allowed RSI14 values by timeframe
   - Allowed StochRSI K values by timeframe
   - Allowed StochRSI D values by timeframe
   - Required RSI/StochRSI phrase from technicalLanguageHints.requiredPhrase

3. Prompt now says:
   - Do not mention any RSI14, StochRSI K, or StochRSI D numeric value unless it appears in the allowed lists.
   - Do not round to a new value that is not in the allowed lists.
   - Do not invent RSI14=35, StochRSI=85, or any other unlisted technical number.
   - If technicalLanguageHints.requiredPhrase exists, copy it exactly in Technical confirmation and do not create a new RSI/StochRSI sentence.

No changes:
- No validator changes.
- No Safe Report logic changes.
- No macro logic changes.
- No strategy module changes.
- No technical indicator formula changes.
- No candlestick formula changes.
- No credential/FRED key files included or overwritten.
