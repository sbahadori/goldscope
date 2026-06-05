GoldScope v2.40.15.1 - Thinking Helper Scope Hotfix

Builds on v2.40.15.

Purpose:
Fix runtime ReferenceError:
stripThinkingArtifacts is not defined

Cause:
v2.40.15 added thinking-artifact helpers, but callOllama could not access stripThinkingArtifacts at runtime.

Fix:
- Adds local helper functions directly inside callOllama:
  - hasThinkingArtifactLocal()
  - stripThinkingArtifactsLocal()
- Repoints callOllama to use local helpers.
- Adds a local hasThinkingArtifactLocal() inside validateAiGoldReport as a guard if needed.

No logic changes:
- No change to macro scoring.
- No change to technical indicators.
- No change to strategy modules.
- No change to Safe Report generation logic.
- No change to validators except local helper scope safety.
- No credential/FRED key files are included or overwritten.
