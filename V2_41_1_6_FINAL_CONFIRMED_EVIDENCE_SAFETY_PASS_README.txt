GoldScope v2.41.1.6 - Final Confirmed Evidence Safety Pass

Builds on v2.41.1.5.

Purpose:
Close the remaining Safe Report fallback caused by raw AI placing technical context under Confirmed evidence in Sections 4/5.

Problem observed:
Raw AI still wrote:
- **Confirmed evidence:** Technical context is bearish (Yahoo:GC=F, 75 quality=usable).

Even after earlier relabel/downgrade patches, one pattern could survive and trigger:
technical_confirmed_evidence_error.

Fix:
1. Adds forceRelabelRemainingTechnicalConfirmedEvidence(reportText, snapshot).
2. Runs it inside the scenario post-processor after:
   - technical label normalizer
   - macro confirmed-evidence overclaim downgrade
3. Runs it again as a final safety pass after post-processed output cleanup and before:
   - deterministic Section 7 replacement
   - validation

Behavior:
- Any remaining Confirmed evidence line in Sections 4/5 containing technical context becomes:
  Technical confirmation context: ...

- If mixed macro + technical:
  macro part becomes Conditional evidence
  technical part becomes Technical confirmation context

- Confirmed evidence: none. is preserved.

Preserved:
- Validators unchanged.
- Macro logic unchanged.
- Employment data logic unchanged.
- Technical indicators unchanged.
- Strategy modules unchanged.
- Safe Report core logic unchanged.
- No credential/FRED key files included or overwritten.
