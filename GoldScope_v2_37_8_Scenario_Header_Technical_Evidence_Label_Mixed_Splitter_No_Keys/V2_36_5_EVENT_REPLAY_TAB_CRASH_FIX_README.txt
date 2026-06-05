GoldScope v2.36.5 - Event Replay Tab Crash Fix

Builds on v2.36.4.

Fix:
- Event Replay tab no longer directly accesses live technicalContext variables that may be outside its render scope.
- Manual replay controls now use the latest stored GoldScope snapshot from localStorage.
- This avoids white-screen crashes when opening Event Replay.

New workflow:
1. Open AI Engine.
2. Load technical context and wait until ready.
3. Click Preview Prompt once. This saves the latest GoldScope snapshot.
4. Open Event Replay.
5. Click Capture Pre-Event Anchor.
6. After event/later refresh:
   - Open AI Engine
   - Load technical context
   - Preview Prompt
   - Return to Event Replay
   - Click Save Post-Event Replay
7. Return to AI Engine and Preview Prompt. replayEvidence.count should update.

No credential/FRED key files are included or overwritten.
