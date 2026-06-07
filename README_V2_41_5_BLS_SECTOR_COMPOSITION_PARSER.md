# GoldScope v2.41.5 - BLS Sector Composition Parser

Builds on stable checkpoint v2.41.4.3.1.

Goal:
Parse BLS/employment sector composition text and use it to evaluate the quality of the NFP headline, without turning the headline into a confirmed macro signal by itself.

Added/changed:
1. Robust `parseSectorCompositionText()`:
   - Leisure and hospitality
   - Health care
   - Government
   - Professional and business services
   - Manufacturing
   - plus optional related sectors when text is available.
2. `laborCompositionAnalyzer()` now classifies:
   - sectorConcentration = broad_based / concentrated / mixed / not_yet_verified
   - compositionSignal = composition_verified / composition_not_verified
   - laborQualitySignal = headline_confirmed / headline_quality_weak / mixed / not_verified
3. If sector composition is verified, Employment Event Intelligence can show:
   - compositionSignal=composition_verified
   - laborQualitySignal=...
4. If manufacturing/professional services/temp-help are weak, labor strength is treated as less certain.
5. Gold impact remains conditional and still requires:
   - wage pressure
   - DXY
   - DGS10
   - DFII10
   - gold post-event reaction
   - replay alignment

Preserved:
- Section 11 Trade Scenario Planner.
- tradeScenarioPlan object.
- Evidence table strict replacement.
- Final note grammar cleanup.
- Macro logic framework.
- Technical indicators.
- Technical Dashboard UI.
- No synthetic data.
- No Math.random.
- No keys or credentials included.

Important guardrail:
A stronger-than-expected NFP headline must not be treated as confirmed bearish for gold unless sector composition, wages, USD/yields, and post-event market reaction confirm it.
