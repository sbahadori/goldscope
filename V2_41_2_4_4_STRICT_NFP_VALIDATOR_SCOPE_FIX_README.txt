GoldScope v2.41.2.4.4 - Strict NFP Validator Scope Fix

Builds on v2.41.2.4.3.

Purpose:
Fix runtime crash:
ReferenceError: lineWronglyInvertsNfpGateStrict is not defined
at validateAiGoldReport(...)

Root cause:
validateAiGoldReport() runs at module/global scope, but lineWronglyInvertsNfpGateStrict() was inserted in a later/local scope, so the validator could not access it.

Fix:
- Adds module-scope lineHasNfpYieldUsdCondition(line) before validateAiGoldReport().
- Adds module-scope lineWronglyInvertsNfpGateStrict(line) before validateAiGoldReport().
- Renames any later duplicate local helper to avoid confusion.

Preserved:
- v2.41.2.4.3 technical numeric scrubber.
- Strict NFP inversion logic.
- Macro logic unchanged.
- Employment computation unchanged.
- Technical indicators unchanged.
- Strategy modules unchanged.
- Safe Report core logic unchanged.
- No credential/FRED key files included or overwritten.
