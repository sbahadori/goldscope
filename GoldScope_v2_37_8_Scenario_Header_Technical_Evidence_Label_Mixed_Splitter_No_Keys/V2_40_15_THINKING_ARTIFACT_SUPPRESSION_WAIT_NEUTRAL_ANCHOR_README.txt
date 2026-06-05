GoldScope v2.40.15 - Thinking Artifact Suppression + Hard Wait-Neutral Prompt Anchor

Builds on v2.40.14.

Purpose:
Reduce high-severity rejections caused by:
- thinking_artifact_leak
- dominant_scenario_overclaim_error
- self_contradictory_directional_scenario_error

Changes:
1. Prompt hard Wait-Neutral anchor
   Adds a SYSTEM STATE SUMMARY at the top of the prompt.
   If deterministicScenarioLab.dominant is Wait/neutral, replayRecords=0,
   eventData= date-only, and missing critical drivers exist, the prompt explicitly
   requires Section 1 to be Wait-Neutral.

2. Self-consistency check
   Adds a short pre-output checklist:
   missing macro drivers + missing replay + blank event values => Wait-Neutral.

3. Ollama no-thinking system message
   Adds a system message instructing the model not to output think tags or hidden reasoning.

4. Lower model temperature
   temperature: 0.15 -> 0.1
   retry temperature: 0.05

5. Retry once only for thinking artifacts
   If raw model output contains <think>, </think>, <thinking>, </thinking>, or /think,
   the system retries once with a stricter prompt.
   It does NOT retry for macro/technical validation errors.

6. Thinking artifact cleaning
   Adds stripThinkingArtifacts() and hasThinkingArtifact().
   The validator remains the final source of truth.

Important decision:
- No Ollama stop tokens were added for <think>.
  Stop tokens can cause blank/truncated output when a local model starts with <think>.
  Retry-once + cleaner is safer.

No changes:
- No change to macro scoring.
- No change to technical indicators.
- No change to strategy modules.
- No change to Safe Report generation logic.
- No change to NFP/CPI/yield validators.
- No credential/FRED key files are included or overwritten.
