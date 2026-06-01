GoldScope v2.35.3 - Technical Fact Validator + Think-Tag Rejection

Builds on v2.35.

Adds high-severity validation for:
1. Thinking artifacts
   - <think>
   - </think>
   - /think
   - hidden reasoning / planning artifacts

2. RSI fact validation
   - If AI says RSI is overbought, at least one provided RSI value must be > 70.
   - If AI says RSI is oversold, at least one provided RSI value must be < 30.

3. Technical confirmed-evidence misuse
   - Technical context must not be placed under Confirmed evidence.
   - Technicals are confirmation/contradiction context only.

4. Case-specific technical wording checks
   - If multiTimeframe/technicalBias is bearish:
     - Bullish case should say technicals weaken bullish case.
     - Bearish case should say technicals support bearish conditional case.
   - If technicalBias is bullish:
     - Bullish case should say technicals support bullish conditional case.
     - Bearish case should say technicals weaken bearish case.

High-severity issues trigger the existing validation-gated safe report.

No credential/FRED key files are included or overwritten.
