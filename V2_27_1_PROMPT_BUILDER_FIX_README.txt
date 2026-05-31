GoldScope v2.27.1 - Prompt Builder Fix

Fix:
- Smoke test worked, but Preview prompt / Run macro-guarded analysis did not run.
- Cause: prompt builder referenced undefined variables:
  - sourceHealth instead of health
  - gdeltNews instead of existing news/newsScore context
- Added defensive try/catch around Preview prompt and Run analysis.
- If prompt builder fails again, the UI will show the error instead of silently doing nothing.

No credential/FRED key files are included or overwritten.
