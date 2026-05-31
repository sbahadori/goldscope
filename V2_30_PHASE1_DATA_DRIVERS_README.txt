GoldScope v2.30 - Phase 1 Data Drivers

What changed:
- Keeps v2.29 AI guards.
- Confirms complete 11-series FRED driver registry in App.jsx.
- Changes default GDELT query from retail gold-price query to macro-focused query.
- Adds retail/company-noise filtering and macro relevance scoring before news reaches AI.
- FRED cache is invalidated automatically if cached rows are fewer than FRED_SERIES.length.
- FRED health message now shows loaded/expected count and first failed series.
- Default AI model remains qwen3:8b, with smaller local alternatives available.

Important:
- Do not run the Claude auto-patcher on top of this version; it uses fragile regex and can corrupt App.jsx.
- No credential/FRED key files are included or overwritten.
