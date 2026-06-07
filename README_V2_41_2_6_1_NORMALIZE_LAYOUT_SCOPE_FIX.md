# GoldScope v2.41.2.6.1 - Normalize Layout Scope Fix

Builds on v2.41.2.6.

Purpose:
Fix runtime crash:

```text
ReferenceError: normalizeNumberedReportLayout is not defined
at hasNextEventExactMismatchLocal(...)
at validateAiGoldReport(...)
```

Root cause:
`validateAiGoldReport()` is executed at module/global scope, but `normalizeNumberedReportLayout()` was not available in that scope.

Fix:
- Adds module-scope `normalizeNumberedReportLayout(reportText)` before `validateAiGoldReport()`.
- Removes/renames duplicate lower-scope definition if present.
- Keeps all calls using the global function.

No analytical logic was changed.
No validators were weakened.
No macro/employment/technical computation was changed.

Scripts preserved:
- npm run dev
- npm run build
- npm run preview
