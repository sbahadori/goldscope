GoldScope v2.41.2.4.1 - Safe Report Employment Row Scope Fix

Builds on v2.41.2.4.

Purpose:
Fix runtime crash:
ReferenceError: buildEmploymentEventReportRow is not defined
at buildValidationSafeGoldReport(...)

Root cause:
buildValidationSafeGoldReport() is defined at module/global scope.
buildEmploymentEventReportRow() was defined later inside the App() scope.
Normal AI report path could still work, but Safe Report fallback path could not access the helper.

Fix:
- Adds a module-scope buildEmploymentEventReportRow(snapshot) before buildValidationSafeGoldReport().
- Keeps employment event row generation available to Safe Report fallback.
- Does not change validators, macro logic, employment computation, technical indicators, strategy modules, or Safe Report core decision logic.

Preserved from v2.41.2.4:
- Invented example cleanup
- Known-NFP invalidation cleanup
- Employment surprise recompute
- Employment narrative injection
- Known NFP vs missing CPI wording cleanup
- Section 7 deterministic replacement

Expected result:
Safe Report fallback no longer crashes if triggered.
