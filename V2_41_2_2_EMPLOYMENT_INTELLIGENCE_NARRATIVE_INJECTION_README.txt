GoldScope v2.41.2.2 - Employment Intelligence Narrative Injection

Builds on v2.41.2.1.

Purpose:
The employment event data and surprise calculation are now correct, but the AI narrative still sometimes says "NFP/CPI outcomes are missing".
This patch injects deterministic employment-aware narrative wording when the NFP headline is known.

Trigger:
employmentEvent.status === "fred_actual_calendar_forecast_previous"
and
employmentEvent.headline.surpriseDirection === "stronger_than_expected"

Injected interpretation:
- NFP headline is available and stronger than expected.
- Sector composition, wage pressure, USD/yields confirmation, and replay alignment remain incomplete.
- CPI actual/forecast remains missing/date-only.
- The labor signal is conditionally_bearish, not confirmed bearish.

Section changes:
1. Section 1 / Dominant scenario:
   Replaces broad "NFP/CPI missing" wording with:
   NFP headline is available and stronger than expected, but confirmation evidence is incomplete; CPI actual/forecast remains missing.

2. Section 4 / Bullish case:
   Adds:
   Employment headline beat currently weakens the bullish case unless USD/yields and gold reaction contradict the first-order labor signal.

3. Section 5 / Bearish case:
   Adds:
   Conditional evidence: Employment headline is stronger than expected with surpriseK=87, which is conditionally gold-negative if USD/yields confirm, but sector composition and wage pressure are not yet verified.

4. Section 6 / Wait-neutral case:
   Distinguishes known NFP headline from missing CPI/confirmation evidence.

Preserved:
- Validators unchanged.
- Macro logic unchanged.
- Employment computation unchanged.
- Technical indicators unchanged.
- Strategy modules unchanged.
- Safe Report core logic unchanged.
- No credential/FRED key files included or overwritten.

Next:
v2.41.3 - BLS Sector Composition Parser
