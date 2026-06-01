GoldScope v2.40.12 - Deterministic Macro Gate Language Hints

Builds on v2.40.11.1.

Purpose:
Reduce raw-AI rejection caused by incorrect macro decision-gate wording.

Changes:
- Adds macroGateLanguageHints to the GoldScope snapshot:
  - nfpWeakYieldUsdDown
  - nfpStrongYieldUsdUp
  - cpiHotRealYieldsDown
  - cpiHotRealYieldsUp
- Prompt now instructs the AI:
  "When macroGateLanguageHints exists, copy these gates exactly in the Decision gates section."
- Safe Report also uses these deterministic gates.

Important:
- This is not a sanitizer.
- It does not rewrite raw AI after generation.
- It does not alter NFP/CPI/yield validators.
- Macro logic validator remains active.
- If the raw AI still reverses weak NFP/falling yields, validator should still reject it.

No changes:
- No change to technical indicators.
- No change to strategy modules.
- No change to RSI/StochRSI validator scope.
- No change to Safe Report validation logic.
- No credential/FRED key files are included or overwritten.
