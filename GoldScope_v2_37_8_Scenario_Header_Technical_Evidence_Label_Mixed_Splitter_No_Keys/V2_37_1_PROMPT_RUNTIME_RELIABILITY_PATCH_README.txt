GoldScope v2.37.1 - Prompt Runtime Reliability Patch

Built on v2.37 Candlestick Pattern Layer, preserving the v2.40.16 validation chain.

Purpose:
Improve prompt/runtime reliability without changing macro logic, technical indicators, strategy modules, or validators.

Changes:
1. SYSTEM STATE SUMMARY remains at the very top of buildRealGoldScopePrompt()
   - deterministicScenarioLab.dominant
   - FRED loaded count
   - missingCriticalMacroDrivers
   - replayRecords
   - nextMajor event and eventData.quality
   - newsStrength
   - maxRecommendedConfidence

2. Hard Wait-Neutral anchor remains active
   If dominant=Wait/neutral, replayRecords=0, eventData=date-only, and missing critical macro drivers exist:
   - Section 1 must be Wait-Neutral.
   - Bullish/Bearish can only be described as conditional pressure.

3. GC=F proxy disclaimer strengthened
   If technicalContext uses GC=F:
   - It is gold futures proxy data, not direct spot XAUUSD.
   - Do not present GC=F support/resistance, EMA, or price levels as exact spot XAUUSD levels.

4. Optional stop-token flag added but NOT forced
   USE_THINKING_STOP_TOKENS = false
   If enabled manually, Ollama options will include:
   stop: ["<think>", "<thinking>"]

Reason for default false:
Stop tokens can produce blank or truncated output when a local model starts with <think>.
The safer default remains:
- system no-thinking instruction
- stripThinkingArtifactsLocal()
- retry once on thinking artifact
- validator as source of truth

No changes:
- No macro scoring changes.
- No technical indicator changes.
- No candlestick formula changes.
- No strategy module changes.
- No Safe Report core logic changes.
- No validator severity changes.
- No credential/FRED key files included or overwritten.
