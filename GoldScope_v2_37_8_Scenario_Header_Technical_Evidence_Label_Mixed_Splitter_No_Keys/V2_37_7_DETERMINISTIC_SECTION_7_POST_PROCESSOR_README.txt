GoldScope v2.37.7 - Deterministic Section 7 Post-Processor

Builds on v2.37.6.

Purpose:
Eliminate raw AI hallucinations inside Section 7 by replacing only the Technical confirmation section with deterministic technicalConfirmationText after raw AI output and before validation.

Changes:
1. Adds replaceSection7WithDeterministicTechnicalConfirmation(reportText, snapshot).
2. After raw AI output is cleaned and before validation:
   - Section 7 is replaced from "7. Technical confirmation" up to before "8. Decision gates".
3. If Section 7 is missing but Section 8 exists:
   - deterministic Section 7 is inserted immediately before Section 8.
4. If neither Section 7 nor Section 8 exists:
   - output is left unchanged and validator/completion gate handles it.
5. The validator still runs after this post-processing.

Guardrails:
- Only Section 7 is modified.
- Macro sections are not changed.
- Bullish/bearish cases are not changed.
- Decision gates are not changed.
- Final note is not changed.
- Macro errors such as directional overclaim, self-contradiction, NFP/CPI direction errors remain validator-detectable.

Preserved:
- No validator changes.
- No Safe Report logic changes.
- No macro logic changes.
- No technical indicator formula changes.
- No candlestick formula changes.
- No strategy module changes.
- No RSI/StochRSI validator changes.
- No credential/FRED key files included or overwritten.
