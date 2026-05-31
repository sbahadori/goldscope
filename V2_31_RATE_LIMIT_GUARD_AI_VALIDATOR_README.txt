GoldScope v2.31 - Rate Limit Guard + AI Output Validator

Scope:
- Keeps v2.30 data-driver improvements.
- Adds local request pacing helpers for FRED and GDELT.
- Adds AI output validation after Ollama returns a report.

Validator catches:
- invented NFP/PAYEMS/CPI numeric thresholds when actual/forecast are blank
- CPI / real-yield logic contradictions
- rising real-yield described as gold-supportive
- wrong next-event date
- avoid-window paraphrase mismatch
- non-report artifacts such as leading Chinese text
- missing <END_GOLDSCOPE_REPORT>

If validation fails:
- The AI output is still shown
- A section named AI OUTPUT VALIDATION is appended
- UI status becomes: validation failed: review output

No credential/FRED key files are included or overwritten.

Important:
If FRED or GDELT returns 429, wait several minutes before refreshing again.
Frequent manual refresh can still hit provider-side rate limits.
