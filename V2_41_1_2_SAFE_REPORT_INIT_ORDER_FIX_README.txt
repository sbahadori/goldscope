GoldScope v2.41.1.2 - Safe Report Init Order Fix

Builds on v2.41.1.1.

Purpose:
Fix runtime ReferenceError:
Cannot access 'eventEvidenceWording' before initialization
at buildValidationSafeGoldReport.

Cause:
macroWording used eventEvidenceWording before eventEvidenceWording was declared.

Fix:
Moves employmentEvent / employmentSafeText / eventEvidenceWording / employmentEvidenceRow declarations before macroWording.

Preserved:
- Employment data logic unchanged.
- Safe Report employment awareness unchanged.
- Markdown technical label relabel fix unchanged.
- Validators unchanged.
- Macro logic unchanged.
- Technical indicators unchanged.
- Strategy modules unchanged.
- No credential/FRED key files included or overwritten.
