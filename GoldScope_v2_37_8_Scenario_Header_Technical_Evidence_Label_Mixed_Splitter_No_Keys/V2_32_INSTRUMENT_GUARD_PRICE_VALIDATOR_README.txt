GoldScope v2.32 - Instrument Guard + Price-Level Validator

Scope:
- Builds on v2.31.
- Adds stricter guardrails so the AI does not confuse mining-company/equity news with XAUUSD/spot-gold movement.
- Adds price-level hallucination validation.

New validator checks:
1. Mining/equity news must not be interpreted as XAUUSD price action.
2. Phrases like "gold price drop" are flagged when only company/retail news is available.
3. Price levels such as $2,300/oz, above 2300, below 2300, support/resistance are flagged if snapshot has no spotPrice or technicalContext.
4. Existing v2.31 checks remain active:
   - invented NFP/PAYEMS/CPI thresholds
   - CPI/real-yield contradictions
   - wrong next-event date
   - avoid-window mismatch
   - output artifacts
   - missing end marker

No credential/FRED key files are included or overwritten.
