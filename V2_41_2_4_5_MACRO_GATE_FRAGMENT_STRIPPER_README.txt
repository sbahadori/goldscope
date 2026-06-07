GoldScope v2.41.2.4.5 - Macro Gate Fragment Stripper

Builds on v2.41.2.4.4.

Purpose:
Fix remaining false high-severity NFP direction rejection where the validator flags exact deterministic macro gates.

Observed:
The rejected debug snippet showed correct gates:
- If NFP materially weakens labor expectations and yields/USD fall, then gold may rise.
- If NFP strengthens labor expectations and yields/USD rise, then gold may fall.

Root cause:
The exact gates can appear with markdown/italic formatting or be merged into a contaminated line/block. The previous skip logic was line-level and failed when multiple gates appeared in one line or with markdown residue.

Fix:
1. Add normalizeMacroGateLineText().
2. Add getExactMacroGatePhrases(snapshot).
3. Add stripExactMacroGatePhrasesFromLine(line, snapshot).
4. Add lineContainsOnlyExactMacroGates(line, snapshot).
5. NFP validator now:
   - skips pure exact macro-gate lines
   - strips exact gate fragments from mixed lines
   - validates only the remaining non-gate text for true NFP direction inversion.

Preserved:
- Strict NFP validator still catches genuine inversions.
- Technical numeric scrubber preserved.
- Macro logic unchanged.
- Employment computation unchanged.
- Technical indicators unchanged.
- Strategy modules unchanged.
- Safe Report core logic unchanged.
- No credential/FRED key files included or overwritten.
