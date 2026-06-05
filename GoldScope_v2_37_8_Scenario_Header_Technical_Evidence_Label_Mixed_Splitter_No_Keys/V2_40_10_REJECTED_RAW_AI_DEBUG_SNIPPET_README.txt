GoldScope v2.40.10 - Rejected Raw AI Debug Snippet

Builds on v2.40.9.

Purpose:
Small debug/observability patch only.

Behavior:
When high-severity validation rejects the raw AI output:
- Safe Report is still generated exactly as before.
- A short RAW AI DEBUG SNIPPETS section is appended below the Safe Report.
- It shows only 3-5 short snippets around issue terms such as:
  - RSI / overbought / oversold
  - NFP / labor / payrolls
  - Confirmed evidence + technical terms
- It does not show the full raw AI output.

Why:
This lets us see the exact raw wording that triggered a validator issue before adding more regex rules.

Important guardrail:
- Does not change macro logic.
- Does not sanitize NFP/CPI/yield logic.
- Does not change validator rules.
- Does not change Safe Report logic.
- Does not change strategy modules or technical indicators.

No credential/FRED key files are included or overwritten.
