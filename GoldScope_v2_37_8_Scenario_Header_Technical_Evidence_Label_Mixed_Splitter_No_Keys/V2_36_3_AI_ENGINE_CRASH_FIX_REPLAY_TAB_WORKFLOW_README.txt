GoldScope v2.36.3 - AI Engine Crash Fix + Replay Tab Workflow

Builds on v2.36.2.

Fix:
- Removes unsafe Replay action buttons from inside AI Engine.
- The AI Engine now shows only a safe "Open Event Replay" button.
- This prevents runtime white-screen crashes caused by Replay helper functions being out of scope inside AIScenarioEngine.
- Replay workflow should be handled from the separate Event Replay tab.

Workflow:
1. Open AI Engine.
2. Load technical context and wait until ready.
3. Open Event Replay from the safe button, or use the Event Replay tab directly.
4. Capture/save replay there if controls are available.
5. Return to AI Engine.
6. Preview Prompt.
7. Run AI Analysis.

No credential/FRED key files are included or overwritten.
