GoldScope v2.27 - Qwen No-Think Output Cleaner

Fix:
- Qwen3 sometimes returns meta-reasoning or thinking text.
- Smoke test now sends /no_think.
- Main GoldScope prompt starts with /no_think.
- Prompt explicitly forbids hidden reasoning/planning text.
- Output cleaner removes <think>...</think>, <thinking>...</thinking>, and common leaked planning lines.
- Smoke test checks whether final cleaned output is exactly OK.

No credential/FRED key files are included or overwritten.
