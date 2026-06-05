GoldScope v2.40.8 - Raw AI Technical Evidence Sanitizer

Builds on v2.40.7.

Purpose:
Small post-processing patch before validation. It sanitizes raw AI technical wording only.

What it changes before validation:
- "Confirmed evidence: Technical context" -> "Technical confirmation context:"
- "Confirmed evidence: EMA / RSI / MACD / ADX / strategy modules" -> "Technical confirmation context:"
- "RSI is overbought" -> technicalLanguageHints.requiredPhrase
  Example: "RSI14 is not at a classic extreme; Stochastic RSI is overbought."

Activation condition:
- Sanitizer only applies when technicalContext.technicalLanguageHints.requiredPhrase exists.

Important guardrail:
- It does NOT change macro logic.
- It does NOT change NFP/CPI/yield decision gates.
- It does NOT suppress NFP direction errors.
- It does NOT change scenario labels or confidence.
- It only changes technical-evidence wording before validator runs.

No changes:
- No change to validator rules.
- No change to RSI numeric parser.
- No change to strategy modules.
- No change to technical quality gate.
- No change to technical indicator formulas.
- No change to Safe Report logic.
- No credential/FRED key files are included or overwritten.
