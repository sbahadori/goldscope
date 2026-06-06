GoldScope v2.41.1.4 - Bold-Colon Confirmed Evidence Relabel Fix

Builds on v2.41.1.3.

Purpose:
Prevent unnecessary Safe Report fallback when the raw AI writes markdown labels with the colon inside bold text, such as:
- **Confirmed evidence:** Technical context ...

Changes:
1. Technical label normalizer now catches:
   - **Confirmed evidence:** Technical context ...
   - **Confirmed evidence**: Technical context ...
   - - **Confirmed evidence:** RSI / StochRSI / EMA / MACD / ADX / strategy modules ...
   - Confirmed evidence: Technical context ...

2. Pure technical confirmed evidence becomes:
   Technical confirmation context: ...

3. Mixed macro + technical evidence is split:
   Confirmed evidence: macro part.
   Technical confirmation context: technical part.

4. Safe Report punctuation cleanup:
   "confirmed., news" -> "confirmed; news"

Preserved:
- Validators unchanged.
- Macro logic unchanged.
- Employment data logic unchanged.
- Technical indicators unchanged.
- Strategy modules unchanged.
- Safe Report core logic unchanged apart from punctuation cleanup.
- No credential/FRED key files included or overwritten.
