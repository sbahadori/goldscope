# GoldScope v2 - FRED Macro Drivers

Clean from-scratch Vite/React project.

## Includes

- Gold-only XAUUSD research terminal
- TradingView OANDA:XAUUSD chart embed
- GDELT News Intelligence through Vite proxy
- FRED Macro Drivers through Vite proxy
- FRED API key entered locally in Settings
- Explainable gold-pressure rules
- Source Health
- Bias Engine: GDELT news score + FRED macro score
- No broker connection
- No automatic trading
- No direct buy/sell recommendation

## Run

Extract to:

C:\src\Gold\goldscope-v2-fred

Then run:

Start-GoldScope-v2.bat

Open:

http://localhost:3000/

## FRED Setup

1. Open Settings.
2. Paste your FRED API key locally.
3. Click Refresh FRED.
4. Open FRED Macro Drivers tab.

Do not share your API key in chat.

## FRED series used

- DGS10: US 10Y Treasury yield
- DGS2: US 2Y Treasury yield
- DFII10: 10Y real yield proxy / TIPS yield
- DFF: Effective Fed Funds Rate
- CPIAUCSL: Headline CPI
- CPILFESL: Core CPI
- PCEPI: PCE inflation
- PCEPILFE: Core PCE inflation
- UNRATE: Unemployment Rate
- PAYEMS: Nonfarm Payrolls
- DTWEXBGS: Nominal Broad US Dollar Index

## Test URLs after app is running

GDELT:
http://localhost:3000/api/gdelt/api/v2/doc/doc?query=%22gold%20price%22%20sourcelang%3Aenglish&mode=ArtList&format=json&maxrecords=3&timespan=1d

FRED example:
http://localhost:3000/api/fred/fred/series/observations?series_id=DGS10&api_key=YOUR_KEY&file_type=json&sort_order=desc&limit=3

## Security note

For local personal use, storing a FRED key in browser localStorage is acceptable for testing.
For production, move FRED calls to a backend/serverless proxy and keep API keys out of the browser.


## v2.1 - Read FRED API key from file

This version reads the FRED key from:

public/config/fred_api_key.txt

Steps:
1. Open:
   public/config/fred_api_key.txt
2. Replace:
   PASTE_YOUR_FRED_API_KEY_HERE
   with your real FRED key.
3. Save the file.
4. Restart the app or click "Reload key from file" in Settings.
5. Click "Refresh FRED".

Important:
This is only for local personal use. Any file inside public/ is served by Vite and can be read by the browser.
For production, use a backend or serverless proxy and never expose keys to the frontend.
