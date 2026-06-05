GoldScope v2.36.2 - Replay State Initialization Fix

Builds on v2.36.1.

Fix:
- Prevents white screen when opening AI Engine.
- replayEvidence is initialized with a safe default object instead of calling getReplayEvidenceSnapshot during initial render.
- Replay records are loaded from localStorage after the component mounts.
- Keeps the Replay UI buttons visible:
  - Capture Pre-Event Anchor
  - Save Post-Event Replay
  - Clear Replay Records

Why:
v2.36.1 could call getReplayEvidenceSnapshot before replay constants/helpers were safely initialized, causing a runtime crash and white page.

No credential/FRED key files are included or overwritten.
