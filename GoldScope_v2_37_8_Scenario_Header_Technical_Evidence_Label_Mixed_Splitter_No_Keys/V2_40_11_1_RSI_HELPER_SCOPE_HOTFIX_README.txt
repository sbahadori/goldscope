GoldScope v2.40.11.1 - RSI Helper Scope Hotfix

Builds on v2.40.11.

Purpose:
Fix runtime ReferenceError:
containsDefinitiveRsiOverboughtClaim is not defined

Cause:
v2.40.11 changed the RSI validator to call scoped helper functions, but the helper function was not reliably available in module/global scope at runtime.

Fix:
- Places containsDefinitiveRsiOverboughtClaim() before validateAiGoldReport() at module scope.
- Places containsDefinitiveRsiOversoldClaim() before validateAiGoldReport() at module scope.
- Keeps v2.40.11 validator behavior unchanged.

No logic changes:
- No change to macro logic.
- No change to NFP/CPI/yield validators.
- No change to Safe Report logic.
- No change to strategy modules or technical indicators.
- No credential/FRED key files are included or overwritten.
