GoldScope v2.36.4 - Dedicated Event Replay Controls

Builds on v2.36.3.

Fix:
- Adds dedicated manual replay controls directly inside the Event Replay tab.
- Does not put replay action buttons inside AI Engine, avoiding white-screen runtime crashes.

New controls in Event Replay:
- Capture Pre-Event Anchor
- Save Post-Event Replay
- Clear Manual Replay
- Back to AI Engine

Workflow:
1. Open AI Engine.
2. Load technical context and wait until ready.
3. Open Event Replay tab.
4. Click Capture Pre-Event Anchor.
5. After the event or after a later technical refresh, return to AI Engine and load technical context again.
6. Return to Event Replay.
7. Click Save Post-Event Replay.
8. Return to AI Engine and Preview Prompt.
9. replayEvidence.count should reflect saved manual replay records.

Storage:
- Uses localStorage key: goldscope.manualReplayRecords.v1
- No credentials, server, or API key required.

No credential/FRED key files are included or overwritten.
