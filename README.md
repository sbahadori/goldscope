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


## v2.2 - FRED Stable Local Layer

Changes:
- FRED key still loads from public/config/fred_api_key.txt
- FRED cache TTL changed to 4 hours
- FRED minimum refresh guard changed to 10 minutes
- Adds Macro Regime Summary:
  - Yield pressure
  - Real-yield pressure
  - USD pressure
  - Inflation pressure
  - Labor pressure
- Adds FRED cache status in Macro Drivers
- Adds Clear FRED cache button in Settings

Local policy:
- Use Refresh FRED manually.
- The app uses cache if fresh.
- Do not repeatedly call FRED.
- For BI/DataOps later, scheduling should move to Airflow and MinIO/ClickHouse.


## v2.3 - Populated Macro Calendar

Changes:
- Adds a 30-day sample macro calendar for XAUUSD risk planning.
- Includes events such as:
  - Initial Jobless Claims
  - ISM Manufacturing PMI
  - ISM Services PMI
  - NFP / Unemployment
  - CPI / Core CPI
  - PPI / Core PPI
  - Retail Sales
  - FOMC / Fed Speech Window
  - GDP Estimate
  - PCE / Core PCE
- Adds manual event form.
- Adds importance filters.
- Adds avoid-window flag for high-impact events.
- Stores edited calendar events in localStorage.

Important:
The v2.3 calendar is a practical sample calendar, not an official release calendar.
For production, connect Trading Economics or another official calendar API.

GitHub safety:
- public/config/fred_api_key.txt is ignored by .gitignore.
- Commit only public/config/fred_api_key.example.txt.


## v2.4 - Official Macro Calendar Seed

This version replaces the sample calendar with officially-sourced events relevant to gold/XAUUSD:
- Federal Reserve FOMC decisions and SEP meetings
- BLS CPI, PPI, Employment Situation, JOLTS, ECI
- BEA GDP and Personal Income & Outlays / PCE releases
- EIA Weekly Petroleum Status Report dates for oil/inflation monitoring
- OPEC/OPEC+ official source watchlist item without invented dates

Source file:
public/data/official_gold_calendar_2026.json

Important:
- This is an official-date seed, not yet live auto-sync.
- For production, ingest official BLS ICS, BEA JSON/calendar, Fed FOMC calendar, EIA WPSR schedule, and Trading Economics calendar through backend/DataOps.


## v2.5 - Auto-updating Official Calendar

This version adds a local Node updater:

```powershell
npm run update:calendar
```

The updater writes:

```text
public/data/official_gold_calendar_2026.json
public/data/calendar_source_health.json
```

Sources currently attempted:
- Federal Reserve FOMC calendar page
- BLS monthly schedule pages
- BEA release schedule page
- EIA Weekly Petroleum Status Report schedule page
- Optional Trading Economics Calendar API if credentials are configured

Run app with calendar update:

```powershell
npm run dev:calendar
```

or just double-click:

```text
Start-GoldScope-v2.bat
```

### Optional Trading Economics setup

Copy:

```text
public/config/trading_economics_credentials.example.txt
```

to:

```text
public/config/trading_economics_credentials.txt
```

Then place your credentials in that file. Do not commit the real credential file.

### Important limitations

The official-source parsers are best-effort HTML parsers. They are appropriate for a local research tool, but the production BI/DataOps implementation should move this to scheduled backend ingestion with source-specific tests, source health, and manual override.


## v2.6 - Event Risk Engine

This version turns official macro dates into a risk workflow.

New features:
- Event Risk tab
- Active avoid-window detection
- Next major catalyst card
- Event risk score
- Pre-event research checklist
- Scenario templates by category:
  - Fed / Rates
  - Inflation
  - Labor
  - Oil / Inflation
  - Growth
- Bias Engine now includes a calendar-risk overlay.
- If a Critical/High event is inside the avoid window, the bias label becomes "High-volatility caution".

Purpose:
The calendar is not directional by itself. It is used to decide when pre-event signals are unreliable and when the user should switch from directional bias to scenario planning.


## v2.7 - Post-Event Reaction Tracker

This version adds a post-event workflow for CPI, NFP, FOMC, PCE, GDP and other gold-relevant catalysts.

New features:
- Post-Event Tracker tab
- Select a recent/nearby calendar event
- Enter actual and forecast values
- Auto-infer surprise direction where possible
- Enter observed market reaction:
  - Gold move %
  - DXY move %
  - US 10Y yield move in basis points
  - Real yield move in basis points
- Classifies observed reaction as:
  - gold-supportive
  - gold-negative
  - mixed/unclear
- Compares expected macro logic with observed reaction:
  - aligned
  - divergent
  - inconclusive
- Saves local reaction records in browser localStorage

Purpose:
This module helps evaluate whether the market reaction confirmed the pre-event scenario.
It does not predict the event and does not generate buy/sell signals.


## v2.8 - Auto Post-Event Tracker

This version adds local automatic post-event tracking.

New features:
- Auto Tracker tab
- Create jobs from Critical/High official calendar events
- Enable/disable auto tracking
- Capture pre-event snapshot
- Capture post-event +15m snapshot
- Capture post-event +60m snapshot
- Calculate:
  - Gold move %
  - DXY move %
  - US 10Y yield move in basis points
- Classify observed reaction:
  - gold-supportive
  - gold-negative
  - mixed/unclear
- Store auto-track jobs in localStorage
- Save auto analyses into reaction records

Important:
This is a local browser tracker. It only works while the app is running.
For reliable production use, move snapshot capture to a backend scheduler or BI/DataOps pipeline.

Market snapshot source:
- Vite proxy to Yahoo chart endpoint for local best-effort snapshot capture.
- This is not a guaranteed institutional market-data feed.
- Real-yield intraday reaction is not available in this local version.


## v2.8.1 - Auto Tracker Job Creation Fix

Changes:
- Auto Tracker now has a stronger button: "Load calendar + create jobs".
- Enabling auto tracking also tries to create jobs if the job list is empty.
- Job horizon increased from 45 days to 180 days.
- Empty-job state now explains what to check.
- Jobs are still created only from future Critical/High events.

If jobs stay zero:
1. Open Macro Calendar.
2. Click "Load generated official file".
3. Confirm official events are visible.
4. Return to Auto Tracker.
5. Click "Load calendar + create jobs".


## v2.9 - Event Replay Tracker

This version adds a better post-event approach:
Instead of depending on manual or real-time snapshots, it reconstructs the reaction after the event using historical intraday market data.

New tab:
- Event Replay

New behavior:
- Finds completed Critical/High official calendar events.
- Fetches intraday data around the event window.
- Reconstructs:
  - pre-event price around T-15m
  - post-event price around T+15m
  - post-event price around T+60m
- Calculates:
  - Gold move %
  - DXY move %
  - US 10Y yield move in basis points
- Classifies +15m and +60m reaction.

Why this is better:
- No need to remember manual buttons.
- No need for the app to be open exactly at event time.
- Can run after the event.

Limitation:
- Intraday historical availability depends on the data provider.
- For production, BI/DataOps should continuously store intraday market data in MinIO/ClickHouse.


## v2.9.1 - Explicit Pre-Event Baseline

Fix:
- Event Replay now explicitly stores and displays the T-15m pre-event baseline.
- The replay record now includes:
  - baseline.gold / baseline.dxy / baseline.us10y
  - post15Point.gold / post15Point.dxy / post15Point.us10y
  - post60Point.gold / post60Point.dxy / post60Point.us10y
- UI now shows a "Pre-Event Baseline: T-15m" box before post-event comparisons.

Important:
The pre-event point is not manually captured. It is reconstructed after the event from historical intraday data.
This is intentional and more reliable than relying on the browser to be open before the event.


## v2.10 - Event Reaction Schedule

This version fixes the conceptual weakness in v2.9.1.

New behavior:
- Each event replay record now includes a clear Event Identity section:
  - event name
  - date/time
  - country
  - category
  - importance
  - official source link
- Each replay creates a structured reaction schedule:
  - T-1d
  - T-4h
  - T-1h
  - T-15m
  - T+15m
  - T+60m
  - T+4h
  - T+1d
- The UI displays all pre-event baseline points and all post-event reaction points.
- T-15m remains the primary short-term baseline for +15m/+60m/+4h/+1d comparisons.
- The record is now auditable: users can see which event the replay belongs to and what exact before/after points were used.

Important:
- Points are reconstructed from historical intraday data after the event.
- If the provider does not have enough intraday history, some points may show n/a.
- For production, intraday market data must be stored continuously in the BI/DataOps platform.


## v2.10.2 - Replay Provider Fallback Fixed

Fixes the App.jsx parse error in v2.10.1 and keeps all helper functions intact.

Behavior:
- Event Replay reconstructs each schedule point independently.
- Each point tries multiple Yahoo intervals: 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1d.
- Gold fallback: XAUUSD=X, GC=F, GLD.
- DXY fallback: DX-Y.NYB, UUP.
- 10Y fallback: ^TNX, IEF.
- If one symbol/interval fails, the whole replay should not fail.
- Provider warnings are shown inside the replay record.


## v2.11 - Export and BI Bridge

This version keeps GoldScope as a local prototype but prepares the work for a later BI/DataOps migration.

New tab:
- Export / BI

New features:
- Export full prototype state to JSON.
- Export selected sections:
  - Calendar events
  - Replay records
  - Manual reaction records
  - Auto tracker jobs
  - Source health
- API keys are redacted from exports.
- Adds a BI migration boundary:
  - What stays in React/GoldScope
  - What later moves to BI/DataOps
- Adds target BI table list:
  - calendar_events
  - event_reaction_jobs
  - market_snapshot_points
  - event_reaction_analysis
  - source_health
  - job_runs

Reason:
For now, continue developing GoldScope locally. Later, move durable jobs, scheduling, snapshots, and storage into the BI/DataOps platform.


## v2.12 - Event Results Center

This version adds an Event Results workflow before Event Replay.

New tab:
- Event Results

New features:
- Select a macro event from the official calendar.
- Save:
  - previous
  - forecast
  - actual
  - surprise direction
  - source
  - notes
- Auto-preview:
  - inferred surprise
  - expected gold impact
- Saved results enrich the event object used by Event Replay.
- Event results are included in Export / BI output.
- Missing completed high-impact events are highlighted.

Why this matters:
Event Replay reconstructs market reaction, but it needs actual/forecast context to decide whether reaction was aligned, divergent or inconclusive.

Future BI target:
Trading Economics or official-source parsers should later enrich these values automatically.


## v2.13 - Scenario Lab

This version adds a structured scenario workflow.

New tab:
- Scenario Lab

New features:
- Builds a scenario model from:
  - FRED macro score
  - GDELT news score
  - Event risk
  - Latest Event Replay result
  - Source health
- Produces three research scenarios:
  - Bullish gold scenario
  - Bearish gold scenario
  - Wait / neutral scenario
- Adds decision gates that reduce confidence.
- Adds editable notes for each scenario.
- Exports scenario snapshots to JSON.
- Scenario notes are included in Export / BI output.

Important:
Scenario Lab is not a buy/sell signal. It is a research framework for comparing conditions, triggers and invalidation points.


## v2.14 - Control Center and Confidence Engine

This version reduces manual complexity.

New default tab:
- Control Center

New behavior:
- The app now opens on Control Center.
- Normal daily workflow:
  1. Run Daily Refresh
  2. Review Scenario Lab
- After a major event:
  1. Fill Event Results if actual/forecast is missing
  2. Run Post-Event Update
  3. Review Scenario Lab
- Macro Calendar no longer needs to be manually loaded first in normal use.
- Auto Tracker is now labeled optional/experimental.
- Event Replay remains the main post-event method.

New Confidence Engine:
- Scenario Lab now shows:
  - Confidence score 0–100
  - Low / Medium / High confidence
  - Reason for confidence level
- Inconclusive replay, source weakness, or active event risk lowers confidence.

Purpose:
GoldScope should feel like a guided research workflow, not a collection of disconnected buttons.


## v2.14.1 - Calendar Repair and Replay Freshness Fix

Fixes:
- Scenario Lab could show "No upcoming major event found" when localStorage or generated calendar state was stale/incomplete.
- Latest Replay Evidence was sorted by savedAt, not by the real event date, so an old event could appear as the latest evidence.
- Calendar state is now repaired by merging loaded/generated calendar data with the embedded official seed.
- Event Risk and Scenario Lab now use a repaired calendar universe.
- Latest Replay Evidence now checks the latest completed major event first.
  - If that event has not been replayed, it shows replay missing instead of showing stale evidence from an older event.
- Scenario confidence is reduced when the latest completed major event has not been replayed.

Why:
Scenario Lab must not silently use stale localStorage. Next catalyst and latest replay evidence must be grounded in event dates, not UI save time.


## v2.15 - Market-Reaction-First Workflow

This version fixes the UX problem where the app seemed to require the user to manually enter actual/forecast values.

Key change:
- Event Results is now optional enrichment only.
- Post-event workflow no longer blocks on missing actual/forecast/previous values.
- Control Center now tells the user to run market-reaction replay after major events.
- Event Replay remains the main post-event method.
- Actual/forecast values will later be automated through Trading Economics or official-source ingestion in the BI/DataOps platform.

Normal workflow:
1. Run Daily Refresh.
2. Review Scenario Lab.
3. After a major event passes, run Post-Event Update.
4. Optionally enrich Event Results if official data is available.
5. Export if needed.

Why:
The user is an end user, not a data provider. The product must not depend on manual entry of economic actual/forecast values.


## v2.16.1 - Stable Smart Analysis

This version fixes the white-page issue caused by the experimental Guided/Advanced tab hiding in v2.16.

Safe changes:
- Adds One-click Smart Analysis in Control Center.
- Keeps all tabs visible for stability.
- Does not use dynamic tab hiding.
- Build validated successfully.

Run Smart Analysis:
1. Loads/repairs official calendar.
2. Refreshes FRED with cache/rate guards.
3. Refreshes GDELT with rate guards.
4. Runs event replay for recent completed high-impact events if available.
5. Opens Scenario Lab.

Use this version instead of v2.16.
