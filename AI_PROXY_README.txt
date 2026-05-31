GoldScope v2.24 - Real GoldScope Context Prompt

This package does not include or overwrite:
- public/config/ai_credentials.json
- FRED key/config files
- secret files

AI Engine v2.24:
- Keeps the stable Ollama proxy path from v2.23.
- Uses real GoldScope context:
  - Scenario Lab deterministic state
  - FRED macro drivers
  - GDELT news summary
  - macro calendar and next catalyst
  - event replay evidence
  - source health and data readiness
- Adds Prompt Preview and AI record export for debugging.
- Output is research only, not financial advice.

Run order:
1. Start Ollama.
2. Start Start-AI-Proxy.bat.
3. Start GoldScope.
4. AI Engine -> Check proxy.
5. Check Ollama.
6. Run smoke test.
7. Preview prompt.
8. Run real GoldScope AI analysis.
