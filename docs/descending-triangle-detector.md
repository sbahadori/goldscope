# Descending Triangle Detector

This module detects exactly one chart pattern: **Descending Triangle** on XAUUSD.

It is designed for GoldScope as a deterministic research layer, not an automatic trading system.

## Files

```text
src/technical/descendingTriangleDetector.js
src/components/DescendingTriangleChart.jsx
src/components/DescendingTriangleScanner.jsx
docs/descending-triangle-detector.md
```

## Detection logic

The detector searches for:

1. Repeated horizontal support touches.
2. Lower-high descending trendline.
3. Price compression toward support.
4. Breakout validation below support.
5. Indicator confirmation from RSI, MACD, Stochastic RSI, Bollinger Bands, EMA, ATR.
6. Higher-timeframe confirmation from 1h, 4h, and 1d.

## Output states

```text
not_detected
candidate_waiting_for_breakdown
testing_support
fake_breakdown_risk
breakdown_confirmed_with_mtf_check
```

## Recommended UI integration

In `src/App.jsx`, import the scanner:

```jsx
import DescendingTriangleScanner from "./components/DescendingTriangleScanner.jsx";
```

Then render it inside the technical tab or a new pattern tab:

```jsx
<DescendingTriangleScanner />
```

## Data source policy

The scanner prefers OANDA spot candles:

```text
/api/oanda/candles?instrument=XAU_USD&granularity=M30&count=800
/api/oanda/candles?instrument=XAU_USD&granularity=H1&count=800
/api/oanda/candles?instrument=XAU_USD&granularity=H4&count=500
/api/oanda/candles?instrument=XAU_USD&granularity=D&count=300
```

If OANDA is unavailable, it falls back to Yahoo XAUUSD=X for diagnostic analysis only.

## Guardrail

The module returns pattern context only. For a valid bearish research scenario, GoldScope should still require:

- close below support zone,
- no immediate fake-breakdown recovery,
- retest failure if available,
- DXY / US10Y / real-yield confirmation,
- no high-impact macro event inside the avoid window.
