GoldScope v2.36.1 - Replay UI Fix + Run Readiness Gate

Builds on v2.36.

Fixes:
1. Makes Event Replay Evidence UI visible before Prompt Preview in AI Engine.
   Buttons:
   - Capture Pre-Event Anchor
   - Save Post-Event Replay
   - Clear Replay Records

2. Adds replay workflow guards:
   - Capture anchor requires technical context to be loaded and not still loading.
   - Save post-event replay requires a pre-event anchor and loaded technical context.

Expected workflow:
1. Load technical context.
2. Wait until status says technical context ready.
3. Click Capture Pre-Event Anchor.
4. After event or after a later technical refresh, click Load technical context again.
5. Click Save Post-Event Replay.
6. Preview Prompt.
7. Run AI Analysis.

No credential/FRED key files are included or overwritten.
