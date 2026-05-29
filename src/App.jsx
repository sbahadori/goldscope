
import React, { useEffect, useMemo, useState } from "react";

const C = {
  bg: "#070b12",
  card: "#101827",
  card2: "#151f31",
  border: "#25324a",
  text: "#f8fafc",
  muted: "#9fb0c8",
  gold: "#f59e0b",
  green: "#10b981",
  red: "#ef4444",
  blue: "#60a5fa",
  purple: "#a78bfa",
  gray: "#64748b",
};

const DEFAULT_SETTINGS = {
  gdeltQuery: '"gold price" sourcelang:english',
  gdeltTimespan: "1d",
  gdeltMaxRecords: 20,
  fredApiKey: "",
  refreshIntervalMinutes: 15,
  autoRefresh: false,
};

const GDELT_MIN_INTERVAL_MS = 7000;
const FRED_MIN_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes guard
const GDELT_CACHE_TTL_MS = 10 * 60 * 1000;
const FRED_CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours local cache

const KEYS = {
  settings: "goldscope.v2.settings",
  gdeltLastFetch: "goldscope.v2.gdelt.lastFetchAt",
  fredLastFetch: "goldscope.v2.fred.lastFetchAt",
  gdeltCache: "goldscope.v2.gdelt.cache",
  fredCache: "goldscope.v2.fred.cache",
};

const FRED_KEY_FILE_PATH = "/config/fred_api_key.txt";
const FRED_KEY_PLACEHOLDER = "PASTE_YOUR_FRED_API_KEY_HERE";

const FRED_SERIES = [
  {
    id: "DGS10",
    title: "US 10Y Treasury Yield",
    group: "Rates",
    mode: "level",
    unit: "%",
    goldRule: "inverse",
    explanation: "Rising nominal yields usually increase the opportunity cost of holding gold.",
  },
  {
    id: "DGS2",
    title: "US 2Y Treasury Yield",
    group: "Fed expectations",
    mode: "level",
    unit: "%",
    goldRule: "inverse",
    explanation: "The 2Y yield reflects near-term Fed expectations; rising values often pressure XAUUSD.",
  },
  {
    id: "DFII10",
    title: "10Y Real Yield Proxy",
    group: "Real yields",
    mode: "level",
    unit: "%",
    goldRule: "inverse",
    explanation: "Real yields are one of the most important macro drivers for gold; rising real yields are usually negative.",
  },
  {
    id: "DFF",
    title: "Effective Fed Funds Rate",
    group: "Policy rate",
    mode: "level",
    unit: "%",
    goldRule: "inverse_slow",
    explanation: "Higher-for-longer policy rates can support the dollar and pressure gold.",
  },
  {
    id: "CPIAUCSL",
    title: "Headline CPI YoY",
    group: "Inflation",
    mode: "yoy",
    unit: "% YoY",
    goldRule: "inflation",
    explanation: "Inflation can support gold as a hedge, but hot inflation can also trigger hawkish Fed pressure.",
  },
  {
    id: "CPILFESL",
    title: "Core CPI YoY",
    group: "Inflation",
    mode: "yoy",
    unit: "% YoY",
    goldRule: "inflation",
    explanation: "Core CPI is important for Fed reaction expectations; rising core inflation is often mixed for gold.",
  },
  {
    id: "PCEPI",
    title: "PCE Inflation YoY",
    group: "Inflation",
    mode: "yoy",
    unit: "% YoY",
    goldRule: "inflation",
    explanation: "PCE is central to Fed inflation monitoring; softer PCE can reduce yield pressure.",
  },
  {
    id: "PCEPILFE",
    title: "Core PCE YoY",
    group: "Inflation",
    mode: "yoy",
    unit: "% YoY",
    goldRule: "inflation",
    explanation: "Core PCE is a key Fed-preferred inflation signal; cooling core PCE may support gold via lower yields.",
  },
  {
    id: "UNRATE",
    title: "Unemployment Rate",
    group: "Labor",
    mode: "level",
    unit: "%",
    goldRule: "unemployment",
    explanation: "A rising unemployment rate may increase rate-cut expectations and support gold.",
  },
  {
    id: "PAYEMS",
    title: "Nonfarm Payrolls",
    group: "Labor",
    mode: "level",
    unit: "thousand",
    goldRule: "payrolls",
    explanation: "Strong payroll growth can support USD/yields; labor weakness may support gold.",
  },
  {
    id: "DTWEXBGS",
    title: "Nominal Broad US Dollar Index",
    group: "Dollar",
    mode: "level",
    unit: "index",
    goldRule: "inverse",
    explanation: "A stronger dollar usually pressures XAUUSD because gold is dollar-denominated.",
  },
];

const MOCK_NEWS = [
  {
    id: "mock-gdelt-1",
    title: "Fallback: Gold traders weigh dollar strength, Treasury yields and Fed expectations",
    source: "Mock market feed",
    url: "#",
    publishedAt: new Date().toISOString(),
    summary: "This appears when live GDELT data is unavailable or rate-limited.",
    category: "general gold",
    impact: "uncertain",
    confidence: 50,
    freshness: 80,
  },
];

const MOCK_FRED = [
  {
    id: "DGS10",
    title: "US 10Y Treasury Yield",
    group: "Rates",
    latestDate: "mock",
    latest: 4.45,
    previous: 4.39,
    change: 0.06,
    unit: "%",
    pressure: "negative",
    score: -1,
    explanation: "Mock data. Rising 10Y yield is usually negative for gold.",
  },
  {
    id: "DFII10",
    title: "10Y Real Yield Proxy",
    group: "Real yields",
    latestDate: "mock",
    latest: 2.05,
    previous: 2.00,
    change: 0.05,
    unit: "%",
    pressure: "negative",
    score: -1,
    explanation: "Mock data. Rising real yield is usually negative for gold.",
  },
  {
    id: "DTWEXBGS",
    title: "Nominal Broad US Dollar Index",
    group: "Dollar",
    latestDate: "mock",
    latest: 126.2,
    previous: 125.8,
    change: 0.4,
    unit: "index",
    pressure: "negative",
    score: -1,
    explanation: "Mock data. Rising dollar index is usually negative for XAUUSD.",
  },
];

const OFFICIAL_CALENDAR_SEED = [
  {
    "id": "eia-wpsr-2026-06-03",
    "date": "2026-06-03",
    "time": "10:30",
    "country": "US",
    "name": "EIA Weekly Petroleum Status Report",
    "category": "Oil / Inflation",
    "importance": "Medium",
    "previous": "",
    "forecast": "",
    "actual": "",
    "expectedImpact": "Oil inventory/supply shocks can influence crude prices, inflation expectations and risk sentiment. Gold impact is usually indirect through inflation, yields and USD.",
    "volatilityRisk": "Medium",
    "avoidWindow": "30–60 minutes around release if oil volatility is high",
    "source": "EIA official WPSR schedule",
    "sourceUrl": "https://www.eia.gov/petroleum/supply/weekly/schedule.php",
    "official": true,
    "notes": "Standard release: Wednesday 10:30 a.m. ET; holiday weeks may shift."
  },
  {
    "id": "bls-nfp-2026-06-05",
    "date": "2026-06-05",
    "time": "08:30",
    "country": "US",
    "name": "Employment Situation - May 2026",
    "category": "Labor",
    "importance": "High",
    "previous": "",
    "forecast": "",
    "actual": "",
    "expectedImpact": "Strong payrolls/unemployment surprise can lift USD/yields and pressure gold; weak labor can support gold via rate-cut expectations.",
    "volatilityRisk": "High",
    "avoidWindow": "Avoid new entries 2h before and 1h after release",
    "source": "BLS official release schedule",
    "sourceUrl": "https://www.bls.gov/schedule/2026/06_sched.htm",
    "official": true,
    "notes": ""
  },
  {
    "id": "bls-cpi-2026-06-10",
    "date": "2026-06-10",
    "time": "08:30",
    "country": "US",
    "name": "Consumer Price Index - May 2026",
    "category": "Inflation",
    "importance": "High",
    "previous": "",
    "forecast": "",
    "actual": "",
    "expectedImpact": "Soft CPI generally supports gold through lower yields; hot CPI can pressure gold if Fed expectations turn hawkish.",
    "volatilityRisk": "High",
    "avoidWindow": "Avoid new entries 2h before and 1h after release",
    "source": "BLS official release schedule",
    "sourceUrl": "https://www.bls.gov/schedule/2026/06_sched.htm",
    "official": true,
    "notes": ""
  },
  {
    "id": "eia-wpsr-2026-06-10",
    "date": "2026-06-10",
    "time": "10:30",
    "country": "US",
    "name": "EIA Weekly Petroleum Status Report",
    "category": "Oil / Inflation",
    "importance": "Medium",
    "previous": "",
    "forecast": "",
    "actual": "",
    "expectedImpact": "Oil inventory/supply shocks can influence crude prices, inflation expectations and risk sentiment. Gold impact is usually indirect through inflation, yields and USD.",
    "volatilityRisk": "Medium",
    "avoidWindow": "30–60 minutes around release if oil volatility is high",
    "source": "EIA official WPSR schedule",
    "sourceUrl": "https://www.eia.gov/petroleum/supply/weekly/schedule.php",
    "official": true,
    "notes": "Standard release: Wednesday 10:30 a.m. ET; holiday weeks may shift."
  },
  {
    "id": "bls-ppi-2026-06-11",
    "date": "2026-06-11",
    "time": "08:30",
    "country": "US",
    "name": "Producer Price Index - May 2026",
    "category": "Inflation",
    "importance": "Medium",
    "previous": "",
    "forecast": "",
    "actual": "",
    "expectedImpact": "PPI can influence inflation expectations and Fed pricing; strong PPI may pressure gold through yields.",
    "volatilityRisk": "Medium",
    "avoidWindow": "30–60 minutes around release",
    "source": "BLS official release schedule",
    "sourceUrl": "https://www.bls.gov/schedule/2026/06_sched.htm",
    "official": true,
    "notes": ""
  },
  {
    "id": "eia-wpsr-2026-06-17",
    "date": "2026-06-17",
    "time": "10:30",
    "country": "US",
    "name": "EIA Weekly Petroleum Status Report",
    "category": "Oil / Inflation",
    "importance": "Medium",
    "previous": "",
    "forecast": "",
    "actual": "",
    "expectedImpact": "Oil inventory/supply shocks can influence crude prices, inflation expectations and risk sentiment. Gold impact is usually indirect through inflation, yields and USD.",
    "volatilityRisk": "Medium",
    "avoidWindow": "30–60 minutes around release if oil volatility is high",
    "source": "EIA official WPSR schedule",
    "sourceUrl": "https://www.eia.gov/petroleum/supply/weekly/schedule.php",
    "official": true,
    "notes": "Standard release: Wednesday 10:30 a.m. ET; holiday weeks may shift."
  },
  {
    "id": "fed-fomc-2026-06-17",
    "date": "2026-06-17",
    "time": "14:00",
    "country": "US",
    "name": "FOMC policy decision + SEP",
    "category": "Fed / Rates",
    "importance": "Critical",
    "previous": "",
    "forecast": "",
    "actual": "",
    "expectedImpact": "Critical for gold. Hawkish dots/statement can lift USD and real yields, pressuring XAUUSD; dovish reaction can support gold.",
    "volatilityRisk": "Extreme",
    "avoidWindow": "Avoid new entries 2h before and 1h after statement/press conference",
    "source": "Federal Reserve official FOMC calendar",
    "sourceUrl": "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    "official": true,
    "notes": "Meeting associated with Summary of Economic Projections."
  },
  {
    "id": "eia-wpsr-2026-06-24",
    "date": "2026-06-24",
    "time": "10:30",
    "country": "US",
    "name": "EIA Weekly Petroleum Status Report",
    "category": "Oil / Inflation",
    "importance": "Medium",
    "previous": "",
    "forecast": "",
    "actual": "",
    "expectedImpact": "Oil inventory/supply shocks can influence crude prices, inflation expectations and risk sentiment. Gold impact is usually indirect through inflation, yields and USD.",
    "volatilityRisk": "Medium",
    "avoidWindow": "30–60 minutes around release if oil volatility is high",
    "source": "EIA official WPSR schedule",
    "sourceUrl": "https://www.eia.gov/petroleum/supply/weekly/schedule.php",
    "official": true,
    "notes": "Standard release: Wednesday 10:30 a.m. ET; holiday weeks may shift."
  },
  {
    "id": "bea-gdp-2026-06-25",
    "date": "2026-06-25",
    "time": "08:30",
    "country": "US",
    "name": "GDP Third Estimate - Q1 2026",
    "category": "Growth",
    "importance": "Medium",
    "previous": "",
    "forecast": "",
    "actual": "",
    "expectedImpact": "Growth surprises can move yields and USD; weak GDP can support gold if recession-risk rises.",
    "volatilityRisk": "Medium",
    "avoidWindow": "30–60 minutes around release",
    "source": "BEA official release schedule",
    "sourceUrl": "https://www.bea.gov/news/schedule",
    "official": true,
    "notes": ""
  },
  {
    "id": "bls-jolts-2026-06-30",
    "date": "2026-06-30",
    "time": "10:00",
    "country": "US",
    "name": "JOLTS - May 2026",
    "category": "Labor",
    "importance": "Medium",
    "previous": "",
    "forecast": "",
    "actual": "",
    "expectedImpact": "Labor tightness can affect Fed expectations; weaker openings may support gold through lower yields.",
    "volatilityRisk": "Medium",
    "avoidWindow": "30–60 minutes around release",
    "source": "BLS official release schedule",
    "sourceUrl": "https://www.bls.gov/schedule/2026/06_sched.htm",
    "official": true,
    "notes": ""
  },
  {
    "id": "eia-wpsr-2026-07-01",
    "date": "2026-07-01",
    "time": "10:30",
    "country": "US",
    "name": "EIA Weekly Petroleum Status Report",
    "category": "Oil / Inflation",
    "importance": "Medium",
    "previous": "",
    "forecast": "",
    "actual": "",
    "expectedImpact": "Oil inventory/supply shocks can influence crude prices, inflation expectations and risk sentiment. Gold impact is usually indirect through inflation, yields and USD.",
    "volatilityRisk": "Medium",
    "avoidWindow": "30–60 minutes around release if oil volatility is high",
    "source": "EIA official WPSR schedule",
    "sourceUrl": "https://www.eia.gov/petroleum/supply/weekly/schedule.php",
    "official": true,
    "notes": "Standard release: Wednesday 10:30 a.m. ET; holiday weeks may shift."
  },
  {
    "id": "bls-nfp-2026-07-02",
    "date": "2026-07-02",
    "time": "08:30",
    "country": "US",
    "name": "Employment Situation - June 2026",
    "category": "Labor",
    "importance": "High",
    "previous": "",
    "forecast": "",
    "actual": "",
    "expectedImpact": "Major XAUUSD volatility risk through USD and Treasury-yield repricing.",
    "volatilityRisk": "High",
    "avoidWindow": "Avoid new entries 2h before and 1h after release",
    "source": "BLS official release schedule",
    "sourceUrl": "https://www.bls.gov/schedule/2026/07_sched.htm",
    "official": true,
    "notes": ""
  },
  {
    "id": "bea-pce-2026-07-07",
    "date": "2026-07-07",
    "time": "08:30",
    "country": "US",
    "name": "Personal Income and Outlays / PCE - May 2026",
    "category": "Inflation",
    "importance": "High",
    "previous": "",
    "forecast": "",
    "actual": "",
    "expectedImpact": "Core PCE is Fed-sensitive. Softer PCE can support gold; hot PCE may pressure gold via yields.",
    "volatilityRisk": "High",
    "avoidWindow": "Avoid new entries 2h before and 1h after release",
    "source": "BEA official release schedule",
    "sourceUrl": "https://www.bea.gov/news/schedule",
    "official": true,
    "notes": ""
  },
  {
    "id": "eia-wpsr-2026-07-08",
    "date": "2026-07-08",
    "time": "10:30",
    "country": "US",
    "name": "EIA Weekly Petroleum Status Report",
    "category": "Oil / Inflation",
    "importance": "Medium",
    "previous": "",
    "forecast": "",
    "actual": "",
    "expectedImpact": "Oil inventory/supply shocks can influence crude prices, inflation expectations and risk sentiment. Gold impact is usually indirect through inflation, yields and USD.",
    "volatilityRisk": "Medium",
    "avoidWindow": "30–60 minutes around release if oil volatility is high",
    "source": "EIA official WPSR schedule",
    "sourceUrl": "https://www.eia.gov/petroleum/supply/weekly/schedule.php",
    "official": true,
    "notes": "Standard release: Wednesday 10:30 a.m. ET; holiday weeks may shift."
  },
  {
    "id": "bls-cpi-2026-07-14",
    "date": "2026-07-14",
    "time": "08:30",
    "country": "US",
    "name": "Consumer Price Index - June 2026",
    "category": "Inflation",
    "importance": "High",
    "previous": "",
    "forecast": "",
    "actual": "",
    "expectedImpact": "One of the most important monthly gold catalysts because it moves Fed expectations, USD and real yields.",
    "volatilityRisk": "High",
    "avoidWindow": "Avoid new entries 2h before and 1h after release",
    "source": "BLS official release schedule",
    "sourceUrl": "https://www.bls.gov/schedule/2026/07_sched.htm",
    "official": true,
    "notes": ""
  },
  {
    "id": "bls-ppi-2026-07-15",
    "date": "2026-07-15",
    "time": "08:30",
    "country": "US",
    "name": "Producer Price Index - June 2026",
    "category": "Inflation",
    "importance": "Medium",
    "previous": "",
    "forecast": "",
    "actual": "",
    "expectedImpact": "Can influence inflation expectations and rate-path repricing.",
    "volatilityRisk": "Medium",
    "avoidWindow": "30–60 minutes around release",
    "source": "BLS official release schedule",
    "sourceUrl": "https://www.bls.gov/schedule/2026/07_sched.htm",
    "official": true,
    "notes": ""
  },
  {
    "id": "eia-wpsr-2026-07-15",
    "date": "2026-07-15",
    "time": "10:30",
    "country": "US",
    "name": "EIA Weekly Petroleum Status Report",
    "category": "Oil / Inflation",
    "importance": "Medium",
    "previous": "",
    "forecast": "",
    "actual": "",
    "expectedImpact": "Oil inventory/supply shocks can influence crude prices, inflation expectations and risk sentiment. Gold impact is usually indirect through inflation, yields and USD.",
    "volatilityRisk": "Medium",
    "avoidWindow": "30–60 minutes around release if oil volatility is high",
    "source": "EIA official WPSR schedule",
    "sourceUrl": "https://www.eia.gov/petroleum/supply/weekly/schedule.php",
    "official": true,
    "notes": "Standard release: Wednesday 10:30 a.m. ET; holiday weeks may shift."
  },
  {
    "id": "eia-wpsr-2026-07-22",
    "date": "2026-07-22",
    "time": "10:30",
    "country": "US",
    "name": "EIA Weekly Petroleum Status Report",
    "category": "Oil / Inflation",
    "importance": "Medium",
    "previous": "",
    "forecast": "",
    "actual": "",
    "expectedImpact": "Oil inventory/supply shocks can influence crude prices, inflation expectations and risk sentiment. Gold impact is usually indirect through inflation, yields and USD.",
    "volatilityRisk": "Medium",
    "avoidWindow": "30–60 minutes around release if oil volatility is high",
    "source": "EIA official WPSR schedule",
    "sourceUrl": "https://www.eia.gov/petroleum/supply/weekly/schedule.php",
    "official": true,
    "notes": "Standard release: Wednesday 10:30 a.m. ET; holiday weeks may shift."
  },
  {
    "id": "eia-wpsr-2026-07-29",
    "date": "2026-07-29",
    "time": "10:30",
    "country": "US",
    "name": "EIA Weekly Petroleum Status Report",
    "category": "Oil / Inflation",
    "importance": "Medium",
    "previous": "",
    "forecast": "",
    "actual": "",
    "expectedImpact": "Oil inventory/supply shocks can influence crude prices, inflation expectations and risk sentiment. Gold impact is usually indirect through inflation, yields and USD.",
    "volatilityRisk": "Medium",
    "avoidWindow": "30–60 minutes around release if oil volatility is high",
    "source": "EIA official WPSR schedule",
    "sourceUrl": "https://www.eia.gov/petroleum/supply/weekly/schedule.php",
    "official": true,
    "notes": "Standard release: Wednesday 10:30 a.m. ET; holiday weeks may shift."
  },
  {
    "id": "fed-fomc-2026-07-29",
    "date": "2026-07-29",
    "time": "14:00",
    "country": "US",
    "name": "FOMC policy decision",
    "category": "Fed / Rates",
    "importance": "Critical",
    "previous": "",
    "forecast": "",
    "actual": "",
    "expectedImpact": "Critical for gold through rate-path expectations, USD, Treasury yields and real yields.",
    "volatilityRisk": "Extreme",
    "avoidWindow": "Avoid new entries 2h before and 1h after decision",
    "source": "Federal Reserve official FOMC calendar",
    "sourceUrl": "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    "official": true,
    "notes": ""
  },
  {
    "id": "bea-gdp-2026-07-30",
    "date": "2026-07-30",
    "time": "08:30",
    "country": "US",
    "name": "GDP Advance Estimate - Q2 2026",
    "category": "Growth",
    "importance": "High",
    "previous": "",
    "forecast": "",
    "actual": "",
    "expectedImpact": "Advance GDP can trigger growth/yield repricing; weak GDP may support gold through recession-risk demand.",
    "volatilityRisk": "High",
    "avoidWindow": "Avoid new entries 1–2h before and after release",
    "source": "BEA official release schedule",
    "sourceUrl": "https://www.bea.gov/news/schedule",
    "official": true,
    "notes": ""
  },
  {
    "id": "bls-eci-2026-07-31",
    "date": "2026-07-31",
    "time": "08:30",
    "country": "US",
    "name": "Employment Cost Index - Q2 2026",
    "category": "Wages / Inflation",
    "importance": "Medium",
    "previous": "",
    "forecast": "",
    "actual": "",
    "expectedImpact": "Wage pressure affects inflation persistence and Fed expectations; strong ECI can pressure gold through yields.",
    "volatilityRisk": "Medium",
    "avoidWindow": "30–60 minutes around release",
    "source": "BLS official release schedule",
    "sourceUrl": "https://www.bls.gov/schedule/2026/07_sched.htm",
    "official": true,
    "notes": ""
  },
  {
    "id": "bea-pce-2026-08-04",
    "date": "2026-08-04",
    "time": "08:30",
    "country": "US",
    "name": "Personal Income and Outlays / PCE - June 2026",
    "category": "Inflation",
    "importance": "High",
    "previous": "",
    "forecast": "",
    "actual": "",
    "expectedImpact": "Fed-sensitive inflation release; can move real-yield pressure on gold.",
    "volatilityRisk": "High",
    "avoidWindow": "Avoid new entries 2h before and 1h after release",
    "source": "BEA official release schedule",
    "sourceUrl": "https://www.bea.gov/news/schedule",
    "official": true,
    "notes": ""
  },
  {
    "id": "eia-wpsr-2026-08-05",
    "date": "2026-08-05",
    "time": "10:30",
    "country": "US",
    "name": "EIA Weekly Petroleum Status Report",
    "category": "Oil / Inflation",
    "importance": "Medium",
    "previous": "",
    "forecast": "",
    "actual": "",
    "expectedImpact": "Oil inventory/supply shocks can influence crude prices, inflation expectations and risk sentiment. Gold impact is usually indirect through inflation, yields and USD.",
    "volatilityRisk": "Medium",
    "avoidWindow": "30–60 minutes around release if oil volatility is high",
    "source": "EIA official WPSR schedule",
    "sourceUrl": "https://www.eia.gov/petroleum/supply/weekly/schedule.php",
    "official": true,
    "notes": "Standard release: Wednesday 10:30 a.m. ET; holiday weeks may shift."
  },
  {
    "id": "eia-wpsr-holiday-2026-09-10",
    "date": "2026-09-10",
    "time": "12:00",
    "country": "US",
    "name": "EIA WPSR holiday-delayed release",
    "category": "Oil / Inflation",
    "importance": "Medium",
    "previous": "",
    "forecast": "",
    "actual": "",
    "expectedImpact": "Oil inventory data can affect crude prices and inflation expectations, indirectly affecting gold through yields and risk sentiment.",
    "volatilityRisk": "Medium",
    "avoidWindow": "30–60 minutes around release if oil volatility is high",
    "source": "EIA official WPSR holiday release schedule",
    "sourceUrl": "https://www.eia.gov/petroleum/supply/weekly/schedule.php",
    "official": true,
    "notes": "Official holiday exception listed by EIA."
  },
  {
    "id": "fed-fomc-2026-09-16",
    "date": "2026-09-16",
    "time": "14:00",
    "country": "US",
    "name": "FOMC policy decision + SEP",
    "category": "Fed / Rates",
    "importance": "Critical",
    "previous": "",
    "forecast": "",
    "actual": "",
    "expectedImpact": "Critical for gold. SEP/dot plot can reset rate expectations and real-yield pressure.",
    "volatilityRisk": "Extreme",
    "avoidWindow": "Avoid new entries 2h before and 1h after statement/press conference",
    "source": "Federal Reserve official FOMC calendar",
    "sourceUrl": "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    "official": true,
    "notes": "Meeting associated with Summary of Economic Projections."
  },
  {
    "id": "eia-wpsr-holiday-2026-10-15",
    "date": "2026-10-15",
    "time": "12:00",
    "country": "US",
    "name": "EIA WPSR holiday-delayed release",
    "category": "Oil / Inflation",
    "importance": "Medium",
    "previous": "",
    "forecast": "",
    "actual": "",
    "expectedImpact": "Oil inventory data can affect crude prices and inflation expectations, indirectly affecting gold through yields and risk sentiment.",
    "volatilityRisk": "Medium",
    "avoidWindow": "30–60 minutes around release if oil volatility is high",
    "source": "EIA official WPSR holiday release schedule",
    "sourceUrl": "https://www.eia.gov/petroleum/supply/weekly/schedule.php",
    "official": true,
    "notes": "Official holiday exception listed by EIA."
  },
  {
    "id": "fed-fomc-2026-10-28",
    "date": "2026-10-28",
    "time": "14:00",
    "country": "US",
    "name": "FOMC policy decision",
    "category": "Fed / Rates",
    "importance": "Critical",
    "previous": "",
    "forecast": "",
    "actual": "",
    "expectedImpact": "Critical for gold through dollar/yield repricing.",
    "volatilityRisk": "Extreme",
    "avoidWindow": "Avoid new entries 2h before and 1h after decision",
    "source": "Federal Reserve official FOMC calendar",
    "sourceUrl": "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    "official": true,
    "notes": ""
  },
  {
    "id": "eia-wpsr-holiday-2026-11-12",
    "date": "2026-11-12",
    "time": "12:00",
    "country": "US",
    "name": "EIA WPSR holiday-delayed release",
    "category": "Oil / Inflation",
    "importance": "Medium",
    "previous": "",
    "forecast": "",
    "actual": "",
    "expectedImpact": "Oil inventory data can affect crude prices and inflation expectations, indirectly affecting gold through yields and risk sentiment.",
    "volatilityRisk": "Medium",
    "avoidWindow": "30–60 minutes around release if oil volatility is high",
    "source": "EIA official WPSR holiday release schedule",
    "sourceUrl": "https://www.eia.gov/petroleum/supply/weekly/schedule.php",
    "official": true,
    "notes": "Official holiday exception listed by EIA."
  },
  {
    "id": "fed-fomc-2026-12-09",
    "date": "2026-12-09",
    "time": "14:00",
    "country": "US",
    "name": "FOMC policy decision + SEP",
    "category": "Fed / Rates",
    "importance": "Critical",
    "previous": "",
    "forecast": "",
    "actual": "",
    "expectedImpact": "Critical for gold. Year-end dot plot and policy guidance can strongly affect USD/yields.",
    "volatilityRisk": "Extreme",
    "avoidWindow": "Avoid new entries 2h before and 1h after statement/press conference",
    "source": "Federal Reserve official FOMC calendar",
    "sourceUrl": "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    "official": true,
    "notes": "Meeting associated with Summary of Economic Projections."
  },
  {
    "id": "opec-source-watch-no-date",
    "date": "2026-12-31",
    "time": "00:00",
    "country": "Global",
    "name": "OPEC/OPEC+ official meeting watchlist",
    "category": "Oil / Inflation",
    "importance": "Watchlist",
    "previous": "",
    "forecast": "",
    "actual": "",
    "expectedImpact": "No official upcoming dated OPEC/OPEC+ meeting is seeded here. Monitor OPEC official press releases; production decisions can move oil and inflation expectations, indirectly affecting gold.",
    "volatilityRisk": "Watchlist",
    "avoidWindow": "N/A",
    "source": "OPEC official website / Press releases",
    "sourceUrl": "https://www.opec.org",
    "official": true,
    "notes": "Source monitor only, not a scheduled event."
  }
];

function toISODate(date) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function nextWeekday(startDate, weekday) {
  const d = new Date(startDate);
  const diff = (weekday + 7 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function nthBusinessDayOfMonth(year, monthIndex, n) {
  const d = new Date(year, monthIndex, 1);
  let count = 0;
  while (d.getMonth() === monthIndex) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count += 1;
    if (count === n) return new Date(d);
    d.setDate(d.getDate() + 1);
  }
  return new Date(year, monthIndex, Math.min(28, n + 1));
}

function eventTimeToTimestamp(event) {
  const time = event.time || "08:30";
  return new Date(`${event.date}T${time}:00`).getTime();
}

function timeToEventText(event) {
  const ts = eventTimeToTimestamp(event);
  if (!Number.isFinite(ts)) return "unknown";
  const diff = ts - Date.now();
  const abs = Math.abs(diff);
  const hours = Math.floor(abs / 36e5);
  const days = Math.floor(hours / 24);
  if (diff < 0) return days > 0 ? `${days}d ago` : `${hours}h ago`;
  if (hours < 1) return "within 1h";
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

function isHighImpactEvent(event) {
  return ["Critical", "High"].includes(event.importance);
}

function getEventRiskScore(event) {
  const importanceScore = event.importance === "Critical" ? 5 : event.importance === "High" ? 4 : event.importance === "Medium" ? 2 : 1;
  const volScore = event.volatilityRisk === "Extreme" ? 5 : event.volatilityRisk === "High" ? 4 : event.volatilityRisk === "Medium" ? 2 : 1;
  const timeToEventHours = (eventTimeToTimestamp(event) - Date.now()) / 36e5;
  let proximityScore = 0;
  if (timeToEventHours >= -1 && timeToEventHours <= 2) proximityScore = 5;
  else if (timeToEventHours > 2 && timeToEventHours <= 24) proximityScore = 3;
  else if (timeToEventHours > 24 && timeToEventHours <= 72) proximityScore = 2;
  return importanceScore + volScore + proximityScore;
}

function getEventScenario(event) {
  const cat = String(event.category || "").toLowerCase();
  if (cat.includes("fed") || cat.includes("rates")) {
    return {
      upside: "Dovish tone, lower dots, or softer rate-path guidance may support gold through lower USD/yields.",
      downside: "Hawkish guidance, higher-for-longer language, or stronger dots may pressure gold through real yields.",
      watch: "Watch DXY, US 2Y/10Y yields, real yields, and first 15–60 minutes after the decision.",
    };
  }
  if (cat.includes("inflation") || /cpi|ppi|pce/i.test(event.name)) {
    return {
      upside: "Softer inflation may support gold if yields fall and Fed-cut expectations rise.",
      downside: "Hot inflation may pressure gold if markets price a more hawkish Fed reaction.",
      watch: "Compare actual vs forecast; watch real-yield and dollar reaction, not just the headline number.",
    };
  }
  if (cat.includes("labor") || /payroll|employment|jobless|unemployment|jolts/i.test(event.name)) {
    return {
      upside: "Labor weakness may support gold through lower yields and higher rate-cut expectations.",
      downside: "Strong labor data may lift USD/yields and pressure gold.",
      watch: "Focus on payrolls, unemployment, wage growth, revisions, and yield reaction.",
    };
  }
  if (cat.includes("oil") || /oil|petroleum|eia|opec/i.test(event.name)) {
    return {
      upside: "Oil supply shock can increase inflation/risk concerns and may support gold indirectly.",
      downside: "Oil-driven inflation can be bearish if it raises yields and hawkish Fed expectations.",
      watch: "Gold impact is indirect. Watch crude, inflation expectations, yields, and risk sentiment.",
    };
  }
  return {
    upside: "Weak growth or risk-off reaction may support gold.",
    downside: "Strong growth or risk-on reaction may pressure gold through USD/yields.",
    watch: "Watch actual-vs-forecast and cross-market confirmation.",
  };
}

function isAvoidWindow(event, warningHours = 2, afterHours = 1) {
  if (!isHighImpactEvent(event)) return false;
  const ts = eventTimeToTimestamp(event);
  if (!Number.isFinite(ts)) return false;
  const diffHours = (ts - Date.now()) / 36e5;
  return diffHours >= -afterHours && diffHours <= warningHours;
}

function summarizeCalendarRisk(events) {
  const now = Date.now();
  const future = events
    .filter((e) => eventTimeToTimestamp(e) >= now - 36e5)
    .sort((a, b) => eventTimeToTimestamp(a) - eventTimeToTimestamp(b));

  const activeAvoid = future.filter((e) => isAvoidWindow(e));
  const next24h = future.filter((e) => eventTimeToTimestamp(e) - now <= 24 * 36e5);
  const next72h = future.filter((e) => eventTimeToTimestamp(e) - now <= 72 * 36e5);
  const highNext72h = next72h.filter(isHighImpactEvent);
  const nextEvent = future[0] || null;
  const nextMajor = future.find(isHighImpactEvent) || null;

  let status = "Normal";
  let color = "blue";
  let message = "No immediate high-impact macro event is inside the active avoid window.";

  if (activeAvoid.length) {
    status = "No-trade caution active";
    color = "negative";
    message = "A Critical/High macro event is inside the avoid window. Treat directional bias as unstable until the event reaction settles.";
  } else if (highNext72h.length) {
    status = "Major event ahead";
    color = "warning";
    message = "A Critical/High event is approaching. Avoid overconfidence and reduce reliance on pre-event signals.";
  }

  return { status, color, message, activeAvoid, next24h, next72h, highNext72h, nextEvent, nextMajor };
}

function parseNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function signed(value, decimals = 2) {
  const n = parseNumberOrNull(value);
  if (n === null) return "n/a";
  return `${n > 0 ? "+" : ""}${n.toFixed(decimals)}`;
}

function inferEventSurprise(event, actual, forecast, manualSurprise) {
  if (manualSurprise && manualSurprise !== "auto") return manualSurprise;
  const a = parseNumberOrNull(actual);
  const f = parseNumberOrNull(forecast);
  if (a === null || f === null) return "unknown";

  const category = String(event?.category || "").toLowerCase();
  const name = String(event?.name || "").toLowerCase();

  if (category.includes("inflation") || /cpi|ppi|pce|inflation/.test(name)) {
    if (a > f) return "hotter-than-expected";
    if (a < f) return "cooler-than-expected";
    return "in-line";
  }

  if (category.includes("labor") || /payroll|employment|unemployment|jobless|jolts/.test(name)) {
    if (/unemployment|jobless/.test(name)) {
      if (a > f) return "weaker-than-expected";
      if (a < f) return "stronger-than-expected";
    }
    if (a > f) return "stronger-than-expected";
    if (a < f) return "weaker-than-expected";
    return "in-line";
  }

  if (category.includes("growth") || /gdp|retail|pmi|ism/.test(name)) {
    if (a > f) return "stronger-than-expected";
    if (a < f) return "weaker-than-expected";
    return "in-line";
  }

  return "unknown";
}

function expectedGoldImpactFromSurprise(event, surprise) {
  const category = String(event?.category || "").toLowerCase();
  const name = String(event?.name || "").toLowerCase();

  if (surprise === "dovish") return "supportive";
  if (surprise === "hawkish") return "negative";

  if (category.includes("inflation") || /cpi|ppi|pce|inflation/.test(name)) {
    if (surprise === "cooler-than-expected") return "supportive";
    if (surprise === "hotter-than-expected") return "mixed/negative";
  }

  if (category.includes("labor") || /payroll|employment|unemployment|jobless|jolts/.test(name)) {
    if (surprise === "weaker-than-expected") return "supportive";
    if (surprise === "stronger-than-expected") return "negative";
  }

  if (category.includes("growth") || /gdp|retail|pmi|ism/.test(name)) {
    if (surprise === "weaker-than-expected") return "supportive";
    if (surprise === "stronger-than-expected") return "negative";
  }

  if (category.includes("oil")) {
    return "indirect/mixed";
  }

  return "uncertain";
}

function computeObservedMarketReaction(record) {
  const gold = parseNumberOrNull(record.goldMovePct);
  const dxy = parseNumberOrNull(record.dxyMovePct);
  const y10 = parseNumberOrNull(record.yield10yMoveBp);
  const real = parseNumberOrNull(record.realYieldMoveBp);

  let score = 0;
  const evidence = [];

  if (gold !== null) {
    if (gold > 0.05) { score += 2; evidence.push("gold rose"); }
    else if (gold < -0.05) { score -= 2; evidence.push("gold fell"); }
  }
  if (dxy !== null) {
    if (dxy < -0.05) { score += 1; evidence.push("DXY fell"); }
    else if (dxy > 0.05) { score -= 1; evidence.push("DXY rose"); }
  }
  if (y10 !== null) {
    if (y10 < -1) { score += 1; evidence.push("10Y yield fell"); }
    else if (y10 > 1) { score -= 1; evidence.push("10Y yield rose"); }
  }
  if (real !== null) {
    if (real < -1) { score += 2; evidence.push("real yield fell"); }
    else if (real > 1) { score -= 2; evidence.push("real yield rose"); }
  }

  let reaction = "mixed/unclear";
  if (score >= 3) reaction = "gold-supportive";
  else if (score <= -3) reaction = "gold-negative";

  return { score, reaction, evidence };
}

function evaluateReactionAlignment(expectedImpact, observedReaction) {
  if (expectedImpact === "supportive" && observedReaction === "gold-supportive") return "aligned";
  if ((expectedImpact === "negative" || expectedImpact === "mixed/negative") && observedReaction === "gold-negative") return "aligned";
  if (expectedImpact === "uncertain" || expectedImpact === "indirect/mixed" || observedReaction === "mixed/unclear") return "inconclusive";
  return "divergent";
}

function analyzePostEventReaction(event, record) {
  const surprise = inferEventSurprise(event, record.actual, record.forecast, record.surprise);
  const expectedImpact = expectedGoldImpactFromSurprise(event, surprise);
  const observed = computeObservedMarketReaction(record);
  const alignment = evaluateReactionAlignment(expectedImpact, observed.reaction);

  let interpretation = "Reaction is inconclusive. Wait for confirmation from gold, DXY, and yields.";
  if (alignment === "aligned" && observed.reaction === "gold-supportive") {
    interpretation = "Observed market reaction confirms a gold-supportive interpretation. Watch whether gold holds gains after the first reaction window.";
  } else if (alignment === "aligned" && observed.reaction === "gold-negative") {
    interpretation = "Observed market reaction confirms a gold-negative interpretation. Watch whether yields/USD remain elevated.";
  } else if (alignment === "divergent") {
    interpretation = "Observed reaction diverges from the simple macro surprise logic. Do not force the original scenario; market positioning, revisions, Fed context, or risk sentiment may dominate.";
  }

  return {
    surprise,
    expectedImpact,
    observedReaction: observed.reaction,
    observedScore: observed.score,
    evidence: observed.evidence,
    alignment,
    interpretation,
  };
}
const MARKET_SYMBOLS = {
  goldSpot: "XAUUSD=X",
  goldFuture: "GC=F",
  dxy: "DX-Y.NYB",
  us10y: "^TNX",
};

const EVENT_PRE_OFFSETS = [
  { key: "pre1d", label: "T-1d", ms: -24 * 60 * 60000, toleranceMs: 90 * 60000 },
  { key: "pre4h", label: "T-4h", ms: -4 * 60 * 60000, toleranceMs: 45 * 60000 },
  { key: "pre1h", label: "T-1h", ms: -60 * 60000, toleranceMs: 30 * 60000 },
  { key: "pre15m", label: "T-15m", ms: -15 * 60000, toleranceMs: 20 * 60000 },
];

const EVENT_POST_OFFSETS = [
  { key: "post15m", label: "T+15m", ms: 15 * 60000, toleranceMs: 20 * 60000 },
  { key: "post60m", label: "T+60m", ms: 60 * 60000, toleranceMs: 30 * 60000 },
  { key: "post4h", label: "T+4h", ms: 4 * 60 * 60000, toleranceMs: 60 * 60000 },
  { key: "post1d", label: "T+1d", ms: 24 * 60 * 60000, toleranceMs: 90 * 60000 },
];

function formatOffsetLabel(offset) {
  return offset?.label || "";
}

function buildEventIdentity(event) {
  return {
    title: event?.name || "Unknown event",
    date: event?.date || "",
    time: event?.time || "",
    country: event?.country || "US",
    category: event?.category || "Macro",
    importance: event?.importance || "Medium",
    source: event?.source || "",
    sourceUrl: event?.sourceUrl || "",
    official: Boolean(event?.official),
    eventTimestamp: new Date(eventTimeToTimestamp(event)).toISOString(),
    timezoneNote: "Event time is treated as local dashboard time unless the source explicitly provides timezone handling.",
  };
}

async function fetchYahooLatest(symbol) {
  const url = `/api/yahoo/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1m`;
  const response = await fetch(url, { headers: { Accept: "application/json,text/plain,*/*" } });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Yahoo ${symbol} HTTP ${response.status}: ${raw.slice(0, 120)}`);

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`Yahoo ${symbol} returned non-JSON response.`);
  }

  const result = data?.chart?.result?.[0];
  const meta = result?.meta || {};
  const quote = result?.indicators?.quote?.[0] || {};
  const closes = Array.isArray(quote.close) ? quote.close.filter((x) => Number.isFinite(Number(x))) : [];
  const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : [];

  const price = Number(meta.regularMarketPrice ?? closes[closes.length - 1]);
  if (!Number.isFinite(price)) throw new Error(`Yahoo ${symbol} did not return a valid price.`);

  return {
    symbol,
    price,
    currency: meta.currency || "",
    exchangeName: meta.exchangeName || "",
    exchangeTimezoneName: meta.exchangeTimezoneName || "",
    marketState: meta.marketState || "",
    timestamp: timestamps.length ? new Date(timestamps[timestamps.length - 1] * 1000).toISOString() : new Date().toISOString(),
    source: "Yahoo chart proxy",
  };
}

async function captureMarketSnapshot() {
  let gold;
  try {
    gold = await fetchYahooLatest(MARKET_SYMBOLS.goldSpot);
  } catch {
    gold = await fetchYahooLatest(MARKET_SYMBOLS.goldFuture);
  }

  const [dxyResult, us10yResult] = await Promise.allSettled([
    fetchYahooLatest(MARKET_SYMBOLS.dxy),
    fetchYahooLatest(MARKET_SYMBOLS.us10y),
  ]);

  const dxy = dxyResult.status === "fulfilled" ? dxyResult.value : null;
  const us10y = us10yResult.status === "fulfilled" ? us10yResult.value : null;

  return {
    capturedAt: new Date().toISOString(),
    gold,
    dxy,
    us10y,
    notes: [
      dxy ? null : "DXY unavailable",
      us10y ? null : "US10Y proxy unavailable",
    ].filter(Boolean),
  };
}

function computeMarketMoves(pre, post) {
  const goldMovePct = pre?.gold?.price && post?.gold?.price ? ((post.gold.price - pre.gold.price) / pre.gold.price) * 100 : null;
  const dxyMovePct = pre?.dxy?.price && post?.dxy?.price ? ((post.dxy.price - pre.dxy.price) / pre.dxy.price) * 100 : null;
  const yield10yMoveBp = pre?.us10y?.price && post?.us10y?.price ? (post.us10y.price - pre.us10y.price) * 10 : null;

  return {
    goldMovePct,
    dxyMovePct,
    yield10yMoveBp,
    realYieldMoveBp: null,
  };
}

function buildAutoReactionAnalysis(event, preSnapshot, postSnapshot) {
  const moves = computeMarketMoves(preSnapshot, postSnapshot);
  const record = {
    actual: event.actual || "",
    forecast: event.forecast || "",
    surprise: "auto",
    goldMovePct: moves.goldMovePct === null ? "" : String(moves.goldMovePct),
    dxyMovePct: moves.dxyMovePct === null ? "" : String(moves.dxyMovePct),
    yield10yMoveBp: moves.yield10yMoveBp === null ? "" : String(moves.yield10yMoveBp),
    realYieldMoveBp: moves.realYieldMoveBp === null ? "" : String(moves.realYieldMoveBp),
  };
  return {
    moves,
    analysis: analyzePostEventReaction(event, record),
  };
}

function autoJobStatus(job) {
  const eventTs = eventTimeToTimestamp(job.event);
  const now = Date.now();
  if (job.completedAt) return "completed";
  if (now < eventTs - 2 * 36e5) return "scheduled";
  if (now >= eventTs - 2 * 36e5 && now < eventTs) return "pre-window";
  if (now >= eventTs && now < eventTs + 15 * 60000) return "event-reaction-window";
  if (now >= eventTs + 15 * 60000 && now < eventTs + 60 * 60000) return "post-15-ready";
  if (now >= eventTs + 60 * 60000) return "post-60-ready";
  return "tracking";
}

async function fetchYahooWindow(symbol, startMs, endMs, interval = "1m") {
  const period1 = Math.floor(startMs / 1000);
  const period2 = Math.floor(endMs / 1000);
  const url = `/api/yahoo/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=${interval}&includePrePost=true`;
  const response = await fetch(url, { headers: { Accept: "application/json,text/plain,*/*" } });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Yahoo ${symbol} ${interval} HTTP ${response.status}: ${raw.slice(0, 120)}`);

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`Yahoo ${symbol} ${interval} returned non-JSON response.`);
  }

  const result = data?.chart?.result?.[0];
  const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : [];
  const quote = result?.indicators?.quote?.[0] || {};
  const close = Array.isArray(quote.close) ? quote.close : [];
  const meta = result?.meta || {};

  const points = timestamps
    .map((ts, i) => ({
      t: ts * 1000,
      price: Number(close[i]),
    }))
    .filter((p) => Number.isFinite(p.price));

  if (!points.length) throw new Error(`Yahoo ${symbol} ${interval} returned no usable points.`);

  return {
    symbol,
    interval,
    meta,
    points,
    source: "Yahoo historical chart proxy",
  };
}

async function fetchYahooWindowWithFallback(symbol, startMs, endMs) {
  const intervals = ["1m", "5m", "15m"];
  let lastError = null;
  for (const interval of intervals) {
    try {
      return await fetchYahooWindow(symbol, startMs, endMs, interval);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error(`No data for ${symbol}`);
}

function nearestPoint(series, targetMs, toleranceMs = 20 * 60000) {
  if (!series?.points?.length) return null;
  let best = null;
  let bestDiff = Infinity;
  for (const p of series.points) {
    const diff = Math.abs(p.t - targetMs);
    if (diff < bestDiff) {
      best = p;
      bestDiff = diff;
    }
  }
  if (!best || bestDiff > toleranceMs) return null;
  return { ...best, diffMs: bestDiff };
}

function movePct(pre, post) {
  if (!pre?.price || !post?.price) return null;
  return ((post.price - pre.price) / pre.price) * 100;
}

function moveBpFromTnx(pre, post) {
  if (!pre?.price || !post?.price) return null;
  // Yahoo ^TNX is typically quoted as yield*10.
  // Difference in ^TNX points * 10 approximates basis points.
  return (post.price - pre.price) * 10;
}

function pickSeriesPoint(series, targetMs, toleranceMs) {
  return nearestPoint(series, targetMs, toleranceMs);
}

function buildMarketPointBundle(seriesMap, eventMs, offset) {
  const targetMs = eventMs + offset.ms;
  return {
    key: offset.key,
    label: offset.label,
    targetTime: new Date(targetMs).toISOString(),
    gold: pickSeriesPoint(seriesMap.gold, targetMs, offset.toleranceMs),
    dxy: pickSeriesPoint(seriesMap.dxy, targetMs, offset.toleranceMs),
    us10y: pickSeriesPoint(seriesMap.us10y, targetMs, offset.toleranceMs),
  };
}

function computeMovesBetweenPoints(basePoint, postPoint) {
  return {
    goldMovePct: movePct(basePoint?.gold, postPoint?.gold),
    dxyMovePct: movePct(basePoint?.dxy, postPoint?.dxy),
    yield10yMoveBp: moveBpFromTnx(basePoint?.us10y, postPoint?.us10y),
    realYieldMoveBp: null,
  };
}

function buildAnalysisForMoves(event, moves) {
  const record = {
    actual: event.actual || "",
    forecast: event.forecast || "",
    surprise: "auto",
    goldMovePct: moves.goldMovePct === null ? "" : String(moves.goldMovePct),
    dxyMovePct: moves.dxyMovePct === null ? "" : String(moves.dxyMovePct),
    yield10yMoveBp: moves.yield10yMoveBp === null ? "" : String(moves.yield10yMoveBp),
    realYieldMoveBp: "",
  };
  return analyzePostEventReaction(event, record);
}

function buildReplayRecord(event, seriesMap, windowLabel = "market reaction first workflow fixed") {
  const eventMs = eventTimeToTimestamp(event);
  const identity = buildEventIdentity(event);

  const prePoints = {};
  for (const offset of EVENT_PRE_OFFSETS) {
    prePoints[offset.key] = buildMarketPointBundle(seriesMap, eventMs, offset);
  }

  const postPoints = {};
  for (const offset of EVENT_POST_OFFSETS) {
    postPoints[offset.key] = buildMarketPointBundle(seriesMap, eventMs, offset);
  }

  // Main baseline for short-term reaction remains T-15m.
  const primaryBaseline = prePoints.pre15m || prePoints.pre1h || prePoints.pre4h || prePoints.pre1d;

  const comparisons = {};
  for (const offset of EVENT_POST_OFFSETS) {
    const postPoint = postPoints[offset.key];
    const moves = computeMovesBetweenPoints(primaryBaseline, postPoint);
    comparisons[offset.key] = {
      baselineKey: primaryBaseline?.key || "pre15m",
      baselineLabel: primaryBaseline?.label || "T-15m",
      postKey: offset.key,
      postLabel: offset.label,
      moves,
      analysis: buildAnalysisForMoves(event, moves),
    };
  }

  return {
    id: `replay-${event.id}-${Date.now()}`,
    savedAt: new Date().toISOString(),
    eventId: event.id,
    eventName: event.name,
    eventDate: event.date,
    eventTime: event.time,
    eventTimestamp: new Date(eventMs).toISOString(),
    eventIdentity: identity,
    category: event.category,
    source: "event replay / historical reconstruction",
    window: windowLabel,
    actual: event.actual || "",
    forecast: event.forecast || "",

    reactionSchedule: {
      preOffsets: EVENT_PRE_OFFSETS,
      postOffsets: EVENT_POST_OFFSETS,
      prePoints,
      postPoints,
      primaryBaselineKey: primaryBaseline?.key || "pre15m",
      comparisons,
    },

    // Backward-compatible fields for existing UI and old records.
    baseline: {
      label: primaryBaseline?.label || "T-15m pre-event baseline",
      targetTime: primaryBaseline?.targetTime,
      gold: primaryBaseline?.gold,
      dxy: primaryBaseline?.dxy,
      us10y: primaryBaseline?.us10y,
    },
    post15Point: postPoints.post15m,
    post60Point: postPoints.post60m,
    post15Moves: comparisons.post15m?.moves,
    post60Moves: comparisons.post60m?.moves,
    post15Analysis: comparisons.post15m?.analysis,
    post60Analysis: comparisons.post60m?.analysis,
    points: {
      goldPre: primaryBaseline?.gold,
      dxyPre: primaryBaseline?.dxy,
      us10yPre: primaryBaseline?.us10y,
      goldPost15: postPoints.post15m?.gold,
      dxyPost15: postPoints.post15m?.dxy,
      us10yPost15: postPoints.post15m?.us10y,
      goldPost60: postPoints.post60m?.gold,
      dxyPost60: postPoints.post60m?.dxy,
      us10yPost60: postPoints.post60m?.us10y,
    },
    seriesMeta: {
      gold: seriesMap.gold ? { symbol: seriesMap.gold.symbol, interval: seriesMap.gold.interval } : null,
      dxy: seriesMap.dxy ? { symbol: seriesMap.dxy.symbol, interval: seriesMap.dxy.interval } : null,
      us10y: seriesMap.us10y ? { symbol: seriesMap.us10y.symbol, interval: seriesMap.us10y.interval } : null,
    },
  };
}

async function fetchPointAroundTarget(symbol, targetMs, toleranceMs, label = "") {
  const windowMs = Math.max(toleranceMs * 4, 3 * 60 * 60000);
  const startMs = targetMs - windowMs;
  const endMs = targetMs + windowMs;

  const intervals = ["1m", "2m", "5m", "15m", "30m", "60m", "90m", "1d"];
  let lastError = null;

  for (const interval of intervals) {
    try {
      const series = await fetchYahooWindow(symbol, startMs, endMs, interval);
      const point = nearestPoint(series, targetMs, toleranceMs);
      if (point) {
        return {
          ...point,
          symbol,
          interval,
          label,
          provider: "Yahoo chart proxy",
        };
      }
      lastError = new Error(`${symbol} ${interval}: no point within tolerance for ${label}`);
    } catch (err) {
      lastError = err;
    }
  }

  return {
    unavailable: true,
    symbol,
    label,
    error: lastError?.message || "unavailable",
    targetTime: new Date(targetMs).toISOString(),
  };
}

function usablePoint(point) {
  return point && !point.unavailable && Number.isFinite(Number(point.price));
}

async function fetchFirstUsablePoint(symbols, targetMs, toleranceMs, label) {
  const errors = [];
  for (const symbol of symbols) {
    const point = await fetchPointAroundTarget(symbol, targetMs, toleranceMs, label);
    if (usablePoint(point)) return point;
    if (point?.error) errors.push(`${symbol}: ${point.error}`);
  }
  return {
    unavailable: true,
    symbol: symbols.join(" / "),
    label,
    error: errors.join(" | ") || "all symbols unavailable",
    targetTime: new Date(targetMs).toISOString(),
  };
}

async function fetchMarketPointBundleAt(eventMs, offset) {
  const targetMs = eventMs + offset.ms;

  const [gold, dxy, us10y] = await Promise.all([
    fetchFirstUsablePoint([MARKET_SYMBOLS.goldSpot, MARKET_SYMBOLS.goldFuture, "GLD"], targetMs, offset.toleranceMs, offset.label),
    fetchFirstUsablePoint([MARKET_SYMBOLS.dxy, "UUP"], targetMs, offset.toleranceMs, offset.label),
    fetchFirstUsablePoint([MARKET_SYMBOLS.us10y, "IEF"], targetMs, offset.toleranceMs, offset.label),
  ]);

  return {
    key: offset.key,
    label: offset.label,
    targetTime: new Date(targetMs).toISOString(),
    gold: usablePoint(gold) ? gold : null,
    dxy: usablePoint(dxy) ? dxy : null,
    us10y: usablePoint(us10y) ? us10y : null,
    errors: [
      usablePoint(gold) ? null : gold?.error,
      usablePoint(dxy) ? null : dxy?.error,
      usablePoint(us10y) ? null : us10y?.error,
    ].filter(Boolean),
  };
}

async function reconstructEventFromHistory(event) {
  const eventMs = eventTimeToTimestamp(event);
  const identity = buildEventIdentity(event);

  const prePoints = {};
  for (const offset of EVENT_PRE_OFFSETS) {
    prePoints[offset.key] = await fetchMarketPointBundleAt(eventMs, offset);
  }

  const postPoints = {};
  for (const offset of EVENT_POST_OFFSETS) {
    postPoints[offset.key] = await fetchMarketPointBundleAt(eventMs, offset);
  }

  const primaryBaseline =
    prePoints.pre15m ||
    prePoints.pre1h ||
    prePoints.pre4h ||
    prePoints.pre1d;

  const comparisons = {};
  for (const offset of EVENT_POST_OFFSETS) {
    const postPoint = postPoints[offset.key];
    const moves = computeMovesBetweenPoints(primaryBaseline, postPoint);
    comparisons[offset.key] = {
      baselineKey: primaryBaseline?.key || "pre15m",
      baselineLabel: primaryBaseline?.label || "T-15m",
      postKey: offset.key,
      postLabel: offset.label,
      moves,
      analysis: buildAnalysisForMoves(event, moves),
    };
  }

  const allErrors = [
    ...Object.values(prePoints).flatMap((p) => p.errors || []),
    ...Object.values(postPoints).flatMap((p) => p.errors || []),
  ];

  return {
    id: `replay-${event.id}-${Date.now()}`,
    savedAt: new Date().toISOString(),
    eventId: event.id,
    eventName: event.name,
    eventDate: event.date,
    eventTime: event.time,
    eventTimestamp: new Date(eventMs).toISOString(),
    eventIdentity: identity,
    category: event.category,
    source: "event replay / per-point historical reconstruction",
    window: "market reaction first workflow fixed",
    actual: event.actual || "",
    forecast: event.forecast || "",

    reactionSchedule: {
      preOffsets: EVENT_PRE_OFFSETS,
      postOffsets: EVENT_POST_OFFSETS,
      prePoints,
      postPoints,
      primaryBaselineKey: primaryBaseline?.key || "pre15m",
      comparisons,
      providerMode: "per-point fallback",
      errors: allErrors.slice(0, 20),
    },

    baseline: {
      label: primaryBaseline?.label || "T-15m pre-event baseline",
      targetTime: primaryBaseline?.targetTime,
      gold: primaryBaseline?.gold,
      dxy: primaryBaseline?.dxy,
      us10y: primaryBaseline?.us10y,
    },
    post15Point: postPoints.post15m,
    post60Point: postPoints.post60m,
    post15Moves: comparisons.post15m?.moves,
    post60Moves: comparisons.post60m?.moves,
    post15Analysis: comparisons.post15m?.analysis,
    post60Analysis: comparisons.post60m?.analysis,
    points: {
      goldPre: primaryBaseline?.gold,
      dxyPre: primaryBaseline?.dxy,
      us10yPre: primaryBaseline?.us10y,
      goldPost15: postPoints.post15m?.gold,
      dxyPost15: postPoints.post15m?.dxy,
      us10yPost15: postPoints.post15m?.us10y,
      goldPost60: postPoints.post60m?.gold,
      dxyPost60: postPoints.post60m?.dxy,
      us10yPost60: postPoints.post60m?.us10y,
    },
    seriesMeta: {
      gold: { symbol: "XAUUSD=X / GC=F / GLD", interval: "per-point fallback" },
      dxy: { symbol: "DX-Y.NYB / UUP", interval: "per-point fallback" },
      us10y: { symbol: "^TNX / IEF", interval: "per-point fallback" },
    },
  };
}


function generateMacroCalendar() {
  // Officially-sourced seed. For production, replace this with source ingestion
  // from BLS ICS, BEA JSON, Fed calendar, EIA schedule, and Trading Economics.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return OFFICIAL_CALENDAR_SEED
    .filter((e) => !e.date || new Date(`${e.date}T23:59:00`) >= today || e.importance === "Watchlist")
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

function eventStableKey(event) {
  if (!event) return "";
  const id = String(event.id || "").trim();
  if (id) return id;
  return `${event.date || ""}|${event.time || ""}|${event.name || ""}|${event.source || ""}`.toLowerCase();
}

function mergeCalendarEvents(...groups) {
  const map = new Map();
  for (const group of groups) {
    const arr = Array.isArray(group) ? group : [];
    for (const event of arr) {
      if (!event || !event.date || !event.name) continue;
      const key = eventStableKey(event);
      const previous = map.get(key) || {};
      map.set(key, { ...previous, ...event });
    }
  }
  return [...map.values()].sort((a, b) => `${a.date || ""} ${a.time || ""} ${a.name || ""}`.localeCompare(`${b.date || ""} ${b.time || ""} ${b.name || ""}`));
}

function repairCalendarEvents(events) {
  // Always merge generated/local calendar with the embedded official seed.
  // This prevents stale localStorage or parser failures from hiding upcoming events.
  return mergeCalendarEvents(OFFICIAL_CALENDAR_SEED, events);
}

function latestCompletedMajorEvent(events) {
  const now = Date.now();
  return [...(events || [])]
    .filter((e) => isHighImpactEvent(e))
    .filter((e) => eventTimeToTimestamp(e) <= now)
    .sort((a, b) => eventTimeToTimestamp(b) - eventTimeToTimestamp(a))[0] || null;
}

function matchReplayToEvent(record, event) {
  if (!record || !event) return false;
  if (record.eventId && event.id && record.eventId === event.id) return true;
  const sameDate = String(record.eventDate || "") === String(event.date || "");
  const sameName =
    String(record.eventName || "").toLowerCase().includes(String(event.name || "").toLowerCase()) ||
    String(event.name || "").toLowerCase().includes(String(record.eventName || "").toLowerCase());
  return sameDate && sameName;
}

function safeDate(value) {
  if (!value) return "never";
  if (value === "mock") return "mock";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

function pct(n, decimals = 2) {
  if (!Number.isFinite(n)) return "n/a";
  return n.toFixed(decimals);
}

function ageText(dateValue) {
  if (!dateValue) return "never";
  const ts = new Date(dateValue).getTime();
  if (!Number.isFinite(ts)) return String(dateValue);
  const mins = Math.max(0, Math.floor((Date.now() - ts) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function readCacheAge(key) {
  try {
    const cached = JSON.parse(localStorage.getItem(key) || "null");
    if (!cached?.savedAt) return null;
    return { savedAt: cached.savedAt, ageMs: Date.now() - cached.savedAt };
  } catch {
    return null;
  }
}

function cacheStatusText(key, ttlMs) {
  const c = readCacheAge(key);
  if (!c) return "no cache";
  const remaining = Math.max(0, ttlMs - c.ageMs);
  const ageMinutes = Math.floor(c.ageMs / 60000);
  const remMinutes = Math.floor(remaining / 60000);
  return remaining > 0 ? `cache age ${ageMinutes}m · valid ${remMinutes}m more` : `cache expired · age ${ageMinutes}m`;
}

function validObs(obs) {
  return Array.isArray(obs)
    ? obs
        .filter((o) => o && o.value !== "." && o.value !== null && o.value !== undefined && !Number.isNaN(Number(o.value)))
        .map((o) => ({ date: o.date, value: Number(o.value) }))
    : [];
}

function computePressure(config, latest, previous, yoyLatest, yoyPrev) {
  const change = latest - previous;
  const absChange = Math.abs(change);
  let pressure = "neutral";
  let score = 0;

  if (config.goldRule === "inverse") {
    if (change > 0) {
      pressure = "negative";
      score = -1;
    } else if (change < 0) {
      pressure = "supportive";
      score = 1;
    }
  }

  if (config.goldRule === "inverse_slow") {
    if (change > 0.02) {
      pressure = "negative";
      score = -1;
    } else if (change < -0.02) {
      pressure = "supportive";
      score = 1;
    } else {
      pressure = "neutral";
      score = 0;
    }
  }

  if (config.goldRule === "inflation") {
    const inflationChange = yoyLatest - yoyPrev;
    if (inflationChange > 0.05) {
      pressure = "mixed";
      score = 0;
    } else if (inflationChange < -0.05) {
      pressure = "supportive";
      score = 1;
    } else {
      pressure = "neutral";
      score = 0;
    }
  }

  if (config.goldRule === "unemployment") {
    if (change > 0) {
      pressure = "supportive";
      score = 1;
    } else if (change < 0) {
      pressure = "negative";
      score = -1;
    }
  }

  if (config.goldRule === "payrolls") {
    if (change > 0) {
      pressure = "negative";
      score = -1;
    } else if (change < 0) {
      pressure = "supportive";
      score = 1;
    }
  }

  if (absChange < 0.000001) {
    pressure = "neutral";
    score = 0;
  }

  return { pressure, score };
}

async function fetchFredSeries(config, apiKey) {
  const params = new URLSearchParams({
    series_id: config.id,
    api_key: apiKey,
    file_type: "json",
    sort_order: "desc",
    limit: "24",
  });

  const url = `/api/fred/fred/series/observations?${params.toString()}`;
  const response = await fetch(url, { headers: { Accept: "application/json,text/plain,*/*" } });
  const raw = await response.text();

  if (!response.ok) {
    throw new Error(`FRED HTTP ${response.status}: ${raw.slice(0, 160)}`);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`FRED returned non-JSON text: ${raw.slice(0, 160)}`);
  }

  const obs = validObs(data.observations);
  if (obs.length < 2) throw new Error(`FRED series ${config.id} has insufficient observations.`);

  let latest = obs[0].value;
  let previous = obs[1].value;
  let displayLatest = latest;
  let displayPrevious = previous;

  if (config.mode === "yoy") {
    if (obs.length < 14) throw new Error(`FRED series ${config.id} needs at least 14 observations for YoY calculation.`);
    const oneYearAgo = obs[12].value;
    const prevYearAgo = obs[13].value;
    displayLatest = ((obs[0].value / oneYearAgo) - 1) * 100;
    displayPrevious = ((obs[1].value / prevYearAgo) - 1) * 100;
  }

  const change = displayLatest - displayPrevious;
  const pressureObj = computePressure(config, displayLatest, displayPrevious, displayLatest, displayPrevious);

  return {
    id: config.id,
    title: config.title,
    group: config.group,
    latestDate: obs[0].date,
    latest: displayLatest,
    previous: displayPrevious,
    change,
    unit: config.unit,
    pressure: pressureObj.pressure,
    score: pressureObj.score,
    explanation: config.explanation,
    rawLatest: latest,
    rawPrevious: previous,
  };
}

async function fetchFredAll(apiKey) {
  if (!apiKey || apiKey.trim().length < 10) {
    throw new Error("FRED API key is missing or too short. Add it in Settings.");
  }

  const results = await Promise.allSettled(FRED_SERIES.map((s) => fetchFredSeries(s, apiKey.trim())));
  const rows = [];
  const errors = [];

  results.forEach((r, index) => {
    if (r.status === "fulfilled") rows.push(r.value);
    else errors.push(`${FRED_SERIES[index].id}: ${r.reason?.message || "unknown error"}`);
  });

  if (!rows.length) {
    throw new Error(`All FRED requests failed. First error: ${errors[0] || "unknown error"}`);
  }

  return { rows, errors };
}

function classifyArticle(article) {
  const text = `${article.title || ""} ${article.domain || ""}`.toLowerCase();
  let category = "general gold";
  if (/fed|federal reserve|fomc|powell|rate/.test(text)) category = "Fed / rates";
  else if (/inflation|cpi|ppi|pce/.test(text)) category = "inflation";
  else if (/dollar|usd|dxy/.test(text)) category = "DXY / dollar";
  else if (/yield|treasury|real yield/.test(text)) category = "Treasury / real yields";
  else if (/geopolitical|safe haven|war|conflict/.test(text)) category = "geopolitical risk";
  else if (/central bank|reserve/.test(text)) category = "central bank buying";
  else if (/etf|inflow|outflow|fund/.test(text)) category = "ETF flows";

  let impact = "uncertain";
  if (/safe haven|war|conflict|dovish|rate cut|lower yields|falling dollar|central bank buying/.test(text)) impact = "bullish";
  if (/higher yields|strong dollar|hawkish|rate hike|strong jobs|risk appetite/.test(text)) impact = impact === "bullish" ? "uncertain" : "bearish";

  return {
    id: article.url || `${article.title}-${article.seendate}`,
    title: article.title || "Untitled",
    source: article.domain || "GDELT",
    url: article.url || "#",
    publishedAt: article.seendate || article.datetime || new Date().toISOString(),
    summary: article.title || "No summary available.",
    category,
    impact,
    confidence: category === "general gold" ? 50 : 70,
    freshness: 80,
  };
}

async function fetchGdeltNews(settings) {
  const params = new URLSearchParams({
    query: settings.gdeltQuery || '"gold price" sourcelang:english',
    mode: "ArtList",
    format: "json",
    maxrecords: String(Math.min(Math.max(Number(settings.gdeltMaxRecords || 20), 3), 50)),
    timespan: settings.gdeltTimespan || "1d",
    sort: "hybridrel",
  });

  const response = await fetch(`/api/gdelt/api/v2/doc/doc?${params.toString()}`, {
    headers: { Accept: "application/json,text/plain,*/*" },
  });

  const raw = await response.text();
  if (!response.ok) throw new Error(`GDELT HTTP ${response.status}: ${raw.slice(0, 160)}`);

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`GDELT returned non-JSON text: ${raw.slice(0, 160)}`);
  }

  return (Array.isArray(data.articles) ? data.articles : []).map(classifyArticle);
}

function useStoredSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(KEYS.settings)) || {}) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    localStorage.setItem(KEYS.settings, JSON.stringify(settings));
  }, [settings]);

  return [settings, setSettings];
}

function colorFor(value) {
  const v = String(value || "").toLowerCase();
  if (["live", "supportive", "bullish", "good"].includes(v)) return C.green;
  if (["negative", "bearish", "error", "missing-key"].includes(v)) return C.red;
  if (["fallback", "mixed", "uncertain", "warning", "partial"].includes(v)) return C.gold;
  return C.blue;
}

function Badge({ children, value }) {
  const color = colorFor(value || children);
  return (
    <span style={{
      background: `${color}18`,
      color,
      border: `1px solid ${color}55`,
      borderRadius: 999,
      padding: "4px 9px",
      fontSize: 11,
      fontWeight: 800,
      whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      padding: 16,
      ...style,
    }}>
      {children}
    </div>
  );
}

function Title({ icon, title, sub }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
      <span style={{ color: C.gold, fontSize: 20 }}>{icon}</span>
      <div>
        <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
        {sub && <p style={{ color: C.muted, fontSize: 12, margin: "4px 0 0" }}>{sub}</p>}
      </div>
    </div>
  );
}

function TradingViewChart() {
  return (
    <Card style={{ padding: 0, overflow: "hidden", minHeight: 620 }}>
      <div style={{ padding: 14, borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between" }}>
        <strong style={{ color: C.gold }}>Live XAUUSD Chart</strong>
        <Badge value="live">TradingView OANDA:XAUUSD</Badge>
      </div>
      <iframe
        title="TradingView XAUUSD"
        src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_xauusd&symbol=OANDA%3AXAUUSD&interval=60&hidesidetoolbar=0&symboledit=0&saveimage=1&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&hideideas=1"
        style={{ width: "100%", height: 560, border: 0 }}
        allowFullScreen
      />
    </Card>
  );
}

export default function App() {
  const [settings, setSettings] = useStoredSettings();
  const [tab, setTab] = useState("control");
  const [news, setNews] = useState(MOCK_NEWS);
  const [fredRows, setFredRows] = useState(MOCK_FRED);
  const [calendarEvents, setCalendarEvents] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("goldscope.v2.calendar.events") || "null");
      return Array.isArray(stored) && stored.length ? repairCalendarEvents(stored) : generateMacroCalendar();
    } catch {
      return generateMacroCalendar();
    }
  });
  const [calendarFilter, setCalendarFilter] = useState("all");
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [calendarSourceStatus, setCalendarSourceStatus] = useState("using embedded official seed");
  const [calendarSourceHealth, setCalendarSourceHealth] = useState(null);
  const [reactionRecords, setReactionRecords] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("goldscope.v2.reaction.records") || "[]");
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  });
  const [autoTrackJobs, setAutoTrackJobs] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("goldscope.v2.autoTrack.jobs") || "[]");
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  });
  const [autoTrackEnabled, setAutoTrackEnabled] = useState(() => localStorage.getItem("goldscope.v2.autoTrack.enabled") === "true");
  const [autoTrackerStatus, setAutoTrackerStatus] = useState("idle");
  const [marketSnapshotStatus, setMarketSnapshotStatus] = useState("not checked");
  const [replayRecords, setReplayRecords] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("goldscope.v2.replay.records") || "[]");
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  });
  const [replayStatus, setReplayStatus] = useState("idle");
  const [eventResults, setEventResults] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("goldscope.v2.event.results") || "{}");
      return stored && typeof stored === "object" ? stored : {};
    } catch {
      return {};
    }
  });
  const [scenarioNotes, setScenarioNotes] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("goldscope.v2.scenario.notes") || "{}");
      return stored && typeof stored === "object" ? stored : {};
    } catch {
      return {};
    }
  });
  const [eventResultStatus, setEventResultStatus] = useState("idle");
  const [newEvent, setNewEvent] = useState({
    date: toISODate(new Date()),
    time: "08:30",
    country: "US",
    name: "",
    category: "Inflation",
    importance: "Medium",
    previous: "",
    forecast: "",
    actual: "",
    expectedImpact: "",
    volatilityRisk: "Medium",
    avoidWindow: "30–60 minutes around release",
    source: "Manual",
    notes: "",
  });
  const [newsFilter, setNewsFilter] = useState("all");
  const [loadingGdelt, setLoadingGdelt] = useState(false);
  const [loadingFred, setLoadingFred] = useState(false);
  const [cooldown, setCooldown] = useState({ gdelt: 0, fred: 0 });
  const [health, setHealth] = useState({
    gdelt: { status: "fallback", message: "Using fallback news until GDELT refresh succeeds.", lastFetch: null },
    fred: { status: "missing-key", message: "Enter your FRED API key in Settings, then click Refresh FRED.", lastFetch: null },
    tradingView: { status: "live", message: "TradingView chart embed loaded by browser.", lastFetch: new Date().toISOString() },
    tradingEconomics: { status: "missing-key", message: "Not connected yet.", lastFetch: null },
    reddit: { status: "missing-key", message: "Not connected yet.", lastFetch: null },
    youtube: { status: "missing-key", message: "Not connected yet.", lastFetch: null },
  });
  const [fredKeyFileStatus, setFredKeyFileStatus] = useState("not checked");

  async function loadFredKeyFromFile({ force = false } = {}) {
    try {
      const response = await fetch(`${FRED_KEY_FILE_PATH}?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) {
        setFredKeyFileStatus(`file not found: ${FRED_KEY_FILE_PATH}`);
        return null;
      }

      const raw = await response.text();
      const key = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => line && !line.startsWith("#"));

      if (!key || key === FRED_KEY_PLACEHOLDER) {
        setFredKeyFileStatus("file found, but key is empty or placeholder");
        return null;
      }

      if (!/^[a-zA-Z0-9]{16,64}$/.test(key)) {
        setFredKeyFileStatus("file found, but key format looks invalid");
        return null;
      }

      setSettings((prev) => {
        if (!force && prev.fredApiKey && prev.fredApiKey.trim() === key) return prev;
        return { ...prev, fredApiKey: key };
      });

      setFredKeyFileStatus(`loaded from ${FRED_KEY_FILE_PATH}`);
      setHealth((h) => ({
        ...h,
        fred: {
          ...h.fred,
          status: h.fred.status === "live" ? "live" : "missing-key",
          message: "FRED API key loaded from local config file. Click Refresh FRED.",
        },
      }));
      return key;
    } catch (err) {
      setFredKeyFileStatus(`file read failed: ${err.message}`);
      return null;
    }
  }

  useEffect(() => {
    loadFredKeyFromFile();
  }, []);

  useEffect(() => {
    try {
      const c = JSON.parse(localStorage.getItem(KEYS.fredCache) || "null");
      if (c?.rows?.length && Date.now() - c.savedAt < FRED_CACHE_TTL_MS) {
        setFredRows(c.rows);
        setHealth((h) => ({ ...h, fred: { status: "live", message: `Using cached FRED macro drivers (${c.rows.length}).`, lastFetch: new Date(c.savedAt).toISOString() } }));
      }
    } catch {}
    try {
      const c = JSON.parse(localStorage.getItem(KEYS.gdeltCache) || "null");
      if (c?.items?.length && Date.now() - c.savedAt < GDELT_CACHE_TTL_MS) {
        setNews(c.items);
        setHealth((h) => ({ ...h, gdelt: { status: "live", message: `Using cached GDELT news (${c.items.length}).`, lastFetch: new Date(c.savedAt).toISOString() } }));
      }
    } catch {}
  }, []);

  async function loadGeneratedOfficialCalendar() {
    try {
      const response = await fetch(`/data/official_gold_calendar_2026.json?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data) || !data.length) throw new Error("calendar file is empty or invalid");
      const repaired = repairCalendarEvents(data);
      setCalendarEvents(repaired);
      setCalendarSourceStatus(`loaded ${data.length} generated events; repaired calendar has ${repaired.length} events`);
      try {
        const h = await fetch(`/data/calendar_source_health.json?t=${Date.now()}`, { cache: "no-store" });
        if (h.ok) setCalendarSourceHealth(await h.json());
      } catch {}
      return data;
    } catch (err) {
      setCalendarSourceStatus(`failed to load generated calendar: ${err.message}`);
      return null;
    }
  }

  useEffect(() => {
    loadGeneratedOfficialCalendar();
  }, []);

  useEffect(() => {
    localStorage.setItem("goldscope.v2.calendar.events", JSON.stringify(calendarEvents));
  }, [calendarEvents]);

  useEffect(() => {
    localStorage.setItem("goldscope.v2.reaction.records", JSON.stringify(reactionRecords));
  }, [reactionRecords]);

  useEffect(() => {
    localStorage.setItem("goldscope.v2.autoTrack.jobs", JSON.stringify(autoTrackJobs));
  }, [autoTrackJobs]);

  useEffect(() => {
    localStorage.setItem("goldscope.v2.autoTrack.enabled", String(autoTrackEnabled));
  }, [autoTrackEnabled]);

  useEffect(() => {
    localStorage.setItem("goldscope.v2.replay.records", JSON.stringify(replayRecords));
  }, [replayRecords]);

  useEffect(() => {
    localStorage.setItem("goldscope.v2.event.results", JSON.stringify(eventResults));
  }, [eventResults]);

  useEffect(() => {
    localStorage.setItem("goldscope.v2.scenario.notes", JSON.stringify(scenarioNotes));
  }, [scenarioNotes]);

  function getEventResult(eventId) {
    return eventResults?.[eventId] || null;
  }

  function getEnrichedEvent(event) {
    const result = getEventResult(event.id);
    if (!result) return event;
    return {
      ...event,
      previous: result.previous ?? event.previous ?? "",
      forecast: result.forecast ?? event.forecast ?? "",
      actual: result.actual ?? event.actual ?? "",
      resultStatus: result.status || "manual",
      resultSavedAt: result.savedAt,
      resultNotes: result.notes || "",
      surpriseOverride: result.surprise || "auto",
    };
  }

  function saveEventResult(event, values) {
    const enriched = {
      eventId: event.id,
      eventName: event.name,
      eventDate: event.date,
      eventTime: event.time,
      category: event.category,
      source: values.source || "Manual",
      previous: values.previous || "",
      forecast: values.forecast || "",
      actual: values.actual || "",
      surprise: values.surprise || "auto",
      notes: values.notes || "",
      status: "saved",
      savedAt: new Date().toISOString(),
    };

    setEventResults((prev) => ({ ...prev, [event.id]: enriched }));
    setCalendarEvents((items) => items.map((x) => x.id === event.id ? {
      ...x,
      previous: enriched.previous,
      forecast: enriched.forecast,
      actual: enriched.actual,
      resultStatus: "saved",
      resultSavedAt: enriched.savedAt,
    } : x));
    setEventResultStatus(`saved result for ${event.name}`);
  }

  function clearEventResult(eventId) {
    setEventResults((prev) => {
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
    setCalendarEvents((items) => items.map((x) => x.id === eventId ? {
      ...x,
      previous: "",
      forecast: "",
      actual: "",
      resultStatus: "",
      resultSavedAt: "",
    } : x));
    setEventResultStatus("result cleared");
  }


  function latestReplaySignal() {
    const latestEvent = latestCompletedMajorEvent(calendarUniverse);

    if (!latestEvent) {
      return null;
    }

    const matchingReplay = [...(replayRecords || [])]
      .filter((r) => matchReplayToEvent(r, latestEvent))
      .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")))[0];

    if (!matchingReplay) {
      return {
        eventName: latestEvent.name,
        eventDate: latestEvent.date,
        eventTime: latestEvent.time,
        savedAt: "",
        observedReaction: "missing",
        alignment: "missing",
        interpretation: "The latest completed major event has not been replayed yet. Run Post-Event Update or Event Replay before trusting scenario confirmation.",
        missingReplay: true,
      };
    }

    const a60 = matchingReplay.post60Analysis || matchingReplay.reactionSchedule?.comparisons?.post60m?.analysis || null;
    return {
      eventName: matchingReplay.eventName,
      eventDate: matchingReplay.eventDate,
      eventTime: matchingReplay.eventTime,
      savedAt: matchingReplay.savedAt,
      observedReaction: a60?.observedReaction || "unknown",
      alignment: a60?.alignment || "unknown",
      interpretation: a60?.interpretation || "",
      missingReplay: false,
    };
  }

  function buildScenarioModel() {
    const replaySignal = latestReplaySignal();
    const nextMajor = eventRiskSummary?.nextMajor || null;
    const activeRisk = eventRiskSummary?.activeAvoid?.length > 0;

    const macroDirection = fredScore > 1 ? "supportive" : fredScore < -1 ? "negative" : "mixed";
    const newsDirection = newsScore > 1 ? "bullish" : newsScore < -1 ? "bearish" : "mixed";
    const replayDirection = replaySignal?.observedReaction || "none";

    const gates = [];
    if (activeRisk) gates.push("Active high-volatility event window: do not over-trust directional bias.");
    if (health.fred.status === "missing-key") gates.push("FRED is missing; macro pressure is incomplete.");
    if (health.gdelt.status !== "live") gates.push("GDELT is not live; news pressure may be stale/fallback.");
    if (!replayRecords?.length) gates.push("No replay record yet; post-event evidence is missing.");
    if (replaySignal?.missingReplay) gates.push("Latest completed major event has not been replayed yet; latest replay evidence is stale or missing.");
    if (macroDirection !== "mixed" && newsDirection !== "mixed" && ((macroDirection === "supportive" && newsDirection === "bearish") || (macroDirection === "negative" && newsDirection === "bullish"))) {
      gates.push("Macro and news direction conflict; scenario confidence should be reduced.");
    }

    const bullishScore =
      (fredScore > 0 ? 1 : 0) +
      (newsScore > 0 ? 1 : 0) +
      (replayDirection === "gold-supportive" ? 1 : 0) -
      (activeRisk ? 1 : 0);

    const bearishScore =
      (fredScore < 0 ? 1 : 0) +
      (newsScore < 0 ? 1 : 0) +
      (replayDirection === "gold-negative" ? 1 : 0) -
      (activeRisk ? 1 : 0);

    const waitScore =
      (activeRisk ? 2 : 0) +
      (macroDirection === "mixed" ? 1 : 0) +
      (newsDirection === "mixed" ? 1 : 0) +
      (!replaySignal ? 1 : 0) +
      (gates.length ? 1 : 0);

    const dominant = bullishScore > bearishScore && bullishScore > waitScore
      ? "Bullish research scenario"
      : bearishScore > bullishScore && bearishScore > waitScore
        ? "Bearish research scenario"
        : "Wait / neutral scenario";

    let confidenceScore = 50;
    if (macroDirection !== "mixed" && newsDirection !== "mixed") {
      if ((macroDirection === "supportive" && newsDirection === "bullish") || (macroDirection === "negative" && newsDirection === "bearish")) {
        confidenceScore += 15;
      } else {
        confidenceScore -= 15;
      }
    }
    if (replaySignal?.alignment === "aligned") confidenceScore += 20;
    if (replaySignal?.alignment === "divergent") confidenceScore -= 20;
    if (replaySignal?.observedReaction === "mixed/unclear" || replaySignal?.alignment === "inconclusive") confidenceScore -= 15;
    if (!replaySignal) confidenceScore -= 10;
    if (replaySignal?.missingReplay) confidenceScore -= 20;
    if (activeRisk) confidenceScore -= 25;
    if (health.fred.status !== "live" && health.fred.status !== "partial") confidenceScore -= 15;
    if (health.gdelt.status !== "live") confidenceScore -= 10;
    if (gates.length >= 2) confidenceScore -= 10;

    confidenceScore = Math.max(0, Math.min(100, confidenceScore));
    const confidenceLabel = confidenceScore >= 70 ? "High confidence" : confidenceScore >= 45 ? "Medium confidence" : "Low confidence";
    const confidenceReason = confidenceScore >= 70
      ? "Macro/news/replay evidence is relatively consistent."
      : confidenceScore >= 45
        ? "Some evidence supports the scenario, but confirmation is incomplete."
        : "Evidence is weak, conflicting, stale, or event risk is active.";

    return {
      generatedAt: new Date().toISOString(),
      dominant,
      confidence: {
        score: confidenceScore,
        label: confidenceLabel,
        reason: confidenceReason,
        evidenceMode: replaySignal?.missingReplay ? "replay missing" : "market-reaction first",
      },
      scores: { bullishScore, bearishScore, waitScore },
      macroDirection,
      newsDirection,
      replaySignal,
      nextMajor,
      gates,
      scenarios: {
        bullish: {
          title: "Bullish gold scenario",
          thesis: "Gold can strengthen if yields/DXY soften, inflation or labor data supports rate-cut expectations, or risk-off/safe-haven demand increases.",
          triggers: [
            "10Y and real-yield pressure falls",
            "DXY weakens",
            "GDELT/news flow becomes safe-haven or Fed-dovish",
            "Event replay shows gold-supportive reaction that is aligned with macro surprise",
          ],
          invalidation: [
            "DXY and yields rise together",
            "FOMC/Fed tone turns hawkish",
            "Replay shows divergent or gold-negative reaction after a supposedly supportive event",
          ],
          watch: ["XAUUSD chart structure", "DXY", "10Y yield", "real-yield proxy", "next high-impact event"],
        },
        bearish: {
          title: "Bearish gold scenario",
          thesis: "Gold can weaken if USD and yields rise, Fed expectations turn hawkish, or growth/labor data reduces rate-cut expectations.",
          triggers: [
            "10Y and/or real yields rise",
            "DXY strengthens",
            "Strong labor/growth data or hot inflation reprices Fed path hawkishly",
            "Event replay shows gold-negative reaction aligned with macro surprise",
          ],
          invalidation: [
            "Yields fail to hold gains",
            "DXY reverses lower",
            "Safe-haven shock overrides macro pressure",
            "Gold refuses to fall despite bearish macro reaction",
          ],
          watch: ["DXY breakout/failure", "10Y reaction", "Fed repricing", "post-event +60m and +4h replay"],
        },
        wait: {
          title: "Wait / neutral scenario",
          thesis: "The correct action is to wait when signals conflict, event risk is active, or market reaction is inconclusive.",
          triggers: [
            "Critical/High event inside avoid window",
            "Macro and news conflict",
            "Replay result is inconclusive/divergent",
            "FRED or GDELT source health is weak",
          ],
          invalidation: [
            "Event risk passes and reaction becomes aligned",
            "DXY/yields and gold confirm the same direction",
            "News and macro pressure converge",
          ],
          watch: ["event risk status", "source health", "replay alignment", "chart confirmation"],
        },
      },
    };
  }

  const fredScore = useMemo(() => fredRows.reduce((s, r) => s + (Number(r.score) || 0), 0), [fredRows]);
  const newsScore = useMemo(() => {
    const bull = news.filter((n) => n.impact === "bullish").length;
    const bear = news.filter((n) => n.impact === "bearish").length;
    return bull - bear;
  }, [news]);

  const calendarUniverse = useMemo(() => repairCalendarEvents(calendarEvents), [calendarEvents]);
  const eventRiskSummary = useMemo(() => summarizeCalendarRisk(calendarUniverse), [calendarUniverse]);

  const bias = useMemo(() => {
    const total = fredScore + newsScore;
    if (eventRiskSummary.activeAvoid.length) {
      return { label: "High-volatility caution", color: C.gold, text: "A major event is inside the active avoid window. Treat macro/news bias as unstable until the event reaction settles.", total };
    }
    if (health.fred.status === "missing-key" && health.gdelt.status !== "live") {
      return { label: "Data insufficient", color: C.gold, text: "Add FRED key and refresh GDELT before trusting the bias engine.", total };
    }
    if (total >= 3) return { label: "Research bias: Bullish", color: C.green, text: "Gold-supportive macro/news pressure dominates. Confirm with chart and event risk.", total };
    if (total <= -3) return { label: "Research bias: Bearish", color: C.red, text: "Dollar/yield/macro pressure dominates. Watch for reversals around data releases.", total };
    return { label: "Neutral / Wait", color: C.gray, text: "Signals are mixed or weak. Wait for confirmation and high-quality catalysts.", total };
  }, [fredScore, newsScore, health, eventRiskSummary]);

  function cooldownRemaining(kind, minMs, key) {
    const last = Number(localStorage.getItem(key) || "0");
    return Math.max(0, minMs - (Date.now() - last));
  }


  function createAutoTrackJobsFromCalendar() {
    const now = Date.now();
    const horizon = now + 180 * 24 * 36e5;
    const importantEvents = calendarUniverse
      .filter((e) => isHighImpactEvent(e))
      .filter((e) => {
        const ts = eventTimeToTimestamp(e);
        return ts >= now - 24 * 36e5 && ts <= horizon;
      });

    setAutoTrackJobs((existing) => {
      const existingIds = new Set(existing.map((j) => j.eventId));
      const created = importantEvents
        .filter((e) => !existingIds.has(e.id))
        .map((e) => ({
          id: `auto-${e.id}-${Date.now()}`,
          eventId: e.id,
          event: e,
          createdAt: new Date().toISOString(),
          status: autoJobStatus({ event: e }),
          preSnapshot: null,
          postSnapshots: {},
          analyses: {},
          completedAt: null,
          errors: [],
          source: "auto tracker",
        }));
      setAutoTrackerStatus(
        created.length
          ? `created ${created.length} new auto-track jobs`
          : `no new jobs created: check Macro Calendar has Critical/High future events`
      );
      return [...existing, ...created].sort((a, b) => eventTimeToTimestamp(a.event) - eventTimeToTimestamp(b.event));
    });
  }

  async function captureSnapshotForJob(jobId, kind = "manual") {
    setMarketSnapshotStatus(`capturing ${kind} snapshot...`);
    const snapshot = await captureMarketSnapshot();
    setMarketSnapshotStatus(`captured ${kind} snapshot at ${safeDate(snapshot.capturedAt)}`);

    setAutoTrackJobs((jobs) => jobs.map((job) => {
      if (job.id !== jobId) return job;
      const updated = { ...job, status: autoJobStatus(job), lastChecked: new Date().toISOString() };

      if (kind === "pre") {
        updated.preSnapshot = snapshot;
      } else {
        updated.postSnapshots = { ...(job.postSnapshots || {}), [kind]: snapshot };
        if (updated.preSnapshot) {
          updated.analyses = {
            ...(job.analyses || {}),
            [kind]: buildAutoReactionAnalysis(job.event, updated.preSnapshot, snapshot),
          };
        }
      }

      if (updated.postSnapshots?.post60) {
        updated.completedAt = new Date().toISOString();
        updated.status = "completed";
      }

      return updated;
    }));

    return snapshot;
  }

  async function runAutoTrackerCheck() {
    if (!autoTrackJobs.length) {
      setAutoTrackerStatus("no jobs; create jobs from calendar first");
      return;
    }

    setAutoTrackerStatus("checking auto-track jobs...");
    const jobsSnapshot = [...autoTrackJobs].sort((a, b) => eventTimeToTimestamp(a.event) - eventTimeToTimestamp(b.event));
    let actions = 0;

    for (const job of jobsSnapshot) {
      const eventTs = eventTimeToTimestamp(job.event);
      const now = Date.now();
      const isDone = Boolean(job.completedAt || job.postSnapshots?.post60);
      if (isDone) continue;

      try {
        if (!job.preSnapshot && now >= eventTs - 2 * 36e5 && now < eventTs) {
          await captureSnapshotForJob(job.id, "pre");
          actions += 1;
          continue;
        }

        if (!job.preSnapshot && now >= eventTs && now <= eventTs + 10 * 60000) {
          await captureSnapshotForJob(job.id, "pre");
          actions += 1;
          continue;
        }

        if (job.preSnapshot && !job.postSnapshots?.post15 && now >= eventTs + 15 * 60000) {
          await captureSnapshotForJob(job.id, "post15");
          actions += 1;
          continue;
        }

        if (job.preSnapshot && !job.postSnapshots?.post60 && now >= eventTs + 60 * 60000) {
          await captureSnapshotForJob(job.id, "post60");
          actions += 1;
          continue;
        }
      } catch (err) {
        setAutoTrackJobs((jobs) => jobs.map((j) => j.id === job.id ? {
          ...j,
          errors: [...(j.errors || []), { at: new Date().toISOString(), message: err.message }],
          lastChecked: new Date().toISOString(),
        } : j));
      }
    }

    setAutoTrackJobs((jobs) => jobs.map((job) => ({ ...job, status: autoJobStatus(job), lastChecked: new Date().toISOString() })));
    setAutoTrackerStatus(actions ? `auto tracker completed ${actions} action(s)` : "checked; no snapshot action required now");
  }

  function saveAutoAnalysisAsReactionRecord(job, postKey) {
    const bundle = job.analyses?.[postKey];
    const postSnapshot = job.postSnapshots?.[postKey];
    if (!bundle || !postSnapshot) return;

    const record = {
      id: `${job.id}-${postKey}-reaction`,
      savedAt: new Date().toISOString(),
      eventId: job.event.id,
      eventName: job.event.name,
      eventDate: job.event.date,
      eventTime: job.event.time,
      category: job.event.category,
      source: `${job.source} / ${postKey}`,
      actual: job.event.actual || "",
      forecast: job.event.forecast || "",
      surprise: bundle.analysis.surprise,
      goldMovePct: bundle.moves.goldMovePct === null ? "" : String(bundle.moves.goldMovePct),
      dxyMovePct: bundle.moves.dxyMovePct === null ? "" : String(bundle.moves.dxyMovePct),
      yield10yMoveBp: bundle.moves.yield10yMoveBp === null ? "" : String(bundle.moves.yield10yMoveBp),
      realYieldMoveBp: "",
      note: `Auto-tracked ${postKey}. Pre: ${safeDate(job.preSnapshot?.capturedAt)} / Post: ${safeDate(postSnapshot.capturedAt)}`,
      window: postKey,
      analysis: bundle.analysis,
    };

    setReactionRecords((items) => {
      const exists = items.some((x) => x.id === record.id);
      return exists ? items : [record, ...items].slice(0, 100);
    });
  }

  useEffect(() => {
    if (!autoTrackEnabled) return;
    const id = setInterval(() => {
      runAutoTrackerCheck();
    }, 60 * 1000);
    return () => clearInterval(id);
  }, [autoTrackEnabled, autoTrackJobs, calendarEvents]);

  async function refreshGdelt() {
    const rem = cooldownRemaining("gdelt", GDELT_MIN_INTERVAL_MS, KEYS.gdeltLastFetch);
    if (rem > 0) {
      setCooldown((c) => ({ ...c, gdelt: Date.now() + rem }));
      setHealth((h) => ({ ...h, gdelt: { ...h.gdelt, message: `Rate-limit protection: wait ${Math.ceil(rem / 1000)}s before refreshing GDELT again.` } }));
      return;
    }

    setLoadingGdelt(true);
    localStorage.setItem(KEYS.gdeltLastFetch, String(Date.now()));
    setCooldown((c) => ({ ...c, gdelt: Date.now() + GDELT_MIN_INTERVAL_MS }));

    try {
      const items = await fetchGdeltNews(settings);
      if (!items.length) throw new Error("GDELT returned no articles for this query.");
      setNews(items);
      localStorage.setItem(KEYS.gdeltCache, JSON.stringify({ savedAt: Date.now(), items }));
      setHealth((h) => ({ ...h, gdelt: { status: "live", message: `Loaded ${items.length} GDELT articles.`, lastFetch: new Date().toISOString() } }));
    } catch (err) {
      let usedCache = false;
      try {
        const c = JSON.parse(localStorage.getItem(KEYS.gdeltCache) || "null");
        if (c?.items?.length) {
          setNews(c.items);
          usedCache = true;
        } else setNews(MOCK_NEWS);
      } catch { setNews(MOCK_NEWS); }
      setHealth((h) => ({ ...h, gdelt: { status: usedCache ? "live" : "fallback", message: err.message || "GDELT failed.", lastFetch: new Date().toISOString() } }));
    } finally {
      setLoadingGdelt(false);
    }
  }

  async function refreshFred() {
    try {
      const cached = JSON.parse(localStorage.getItem(KEYS.fredCache) || "null");
      if (cached?.rows?.length && Date.now() - cached.savedAt < FRED_CACHE_TTL_MS) {
        setFredRows(cached.rows);
        setHealth((h) => ({
          ...h,
          fred: {
            status: "live",
            message: `Using cached FRED macro drivers (${cached.rows.length}). ${cacheStatusText(KEYS.fredCache, FRED_CACHE_TTL_MS)}.`,
            lastFetch: new Date(cached.savedAt).toISOString(),
          },
        }));
        return;
      }
    } catch {}

    const rem = cooldownRemaining("fred", FRED_MIN_INTERVAL_MS, KEYS.fredLastFetch);
    if (rem > 0) {
      setCooldown((c) => ({ ...c, fred: Date.now() + rem }));
      setHealth((h) => ({ ...h, fred: { ...h.fred, message: `Rate-limit protection: wait ${Math.ceil(rem / 1000)}s before refreshing FRED again.` } }));
      return;
    }

    setLoadingFred(true);
    localStorage.setItem(KEYS.fredLastFetch, String(Date.now()));
    setCooldown((c) => ({ ...c, fred: Date.now() + FRED_MIN_INTERVAL_MS }));

    try {
      const result = await fetchFredAll(settings.fredApiKey);
      setFredRows(result.rows);
      localStorage.setItem(KEYS.fredCache, JSON.stringify({ savedAt: Date.now(), rows: result.rows }));
      setHealth((h) => ({
        ...h,
        fred: {
          status: result.errors.length ? "partial" : "live",
          message: result.errors.length
            ? `Loaded ${result.rows.length} FRED series; ${result.errors.length} failed.`
            : `Loaded ${result.rows.length} FRED macro drivers.`,
          lastFetch: new Date().toISOString(),
        },
      }));
    } catch (err) {
      let usedCache = false;
      try {
        const c = JSON.parse(localStorage.getItem(KEYS.fredCache) || "null");
        if (c?.rows?.length) {
          setFredRows(c.rows);
          usedCache = true;
        } else setFredRows(MOCK_FRED);
      } catch { setFredRows(MOCK_FRED); }
      setHealth((h) => ({ ...h, fred: { status: usedCache ? "live" : "missing-key", message: err.message || "FRED failed.", lastFetch: new Date().toISOString() } }));
    } finally {
      setLoadingFred(false);
    }
  }

  const gdeltWait = Math.max(0, Math.ceil((cooldown.gdelt - Date.now()) / 1000));
  const fredWait = Math.max(0, Math.ceil((cooldown.fred - Date.now()) / 1000));
  const filteredNews = newsFilter === "all" ? news : news.filter((n) => n.impact === newsFilter);

  const tabs = [
    ["control", "Control Center"],
    ["overview", "Overview"],
    ["chart", "Live Chart"],
    ["news", "News Intelligence"],
    ["macro", "FRED Macro Drivers"],
    ["calendar", "Macro Calendar"],
    ["eventRisk", "Event Risk"],
    ["eventResults", "Event Results (Optional)"],
    ["eventReplay", "Event Replay"],
    ["autoPostEvent", "Auto Tracker (Optional)"],
    ["postEvent", "Post-Event Tracker"],
    ["bias", "Bias Engine"],
    ["scenarioLab", "Scenario Lab"],
    ["health", "Source Health"],
    ["export", "Export / BI"],
    ["settings", "Settings"],
  ];

  const btn = (disabled) => ({
    background: disabled ? C.gray : C.gold,
    color: "#111827",
    border: 0,
    borderRadius: 11,
    padding: "9px 13px",
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
  });

  function Overview() {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <TradingViewChart />
          <NewsPanel />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ borderColor: `${bias.color}66` }}>
            <Title icon="⚡" title="Gold Research Bias" sub="Bias + scenario + risk, never direct buy/sell advice." />
            <div style={{ color: bias.color, fontSize: 30, fontWeight: 950 }}>{bias.label}</div>
            <p style={{ color: C.muted, lineHeight: 1.65 }}>{bias.text}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Badge value={fredScore > 0 ? "supportive" : fredScore < 0 ? "negative" : "neutral"}>FRED score: {fredScore}</Badge>
              <Badge value={newsScore > 0 ? "bullish" : newsScore < 0 ? "bearish" : "neutral"}>News score: {newsScore}</Badge>
              <Badge value="warning">Total: {bias.total}</Badge>
            </div>
          </Card>
          <MacroScoreCard />
          <MacroRegime />
          <Card style={{ borderColor: `${colorFor(eventRiskSummary.color)}66` }}>
            <Title icon="🚨" title="Event Risk" sub="Calendar-derived risk state." />
            <div style={{ color: colorFor(eventRiskSummary.color), fontSize: 22, fontWeight: 950 }}>{eventRiskSummary.status}</div>
            <p style={{ color: C.muted, lineHeight: 1.6 }}>{eventRiskSummary.message}</p>
            {eventRiskSummary.nextMajor && (
              <Badge value={eventRiskSummary.nextMajor.importance === "Critical" ? "negative" : "warning"}>
                next major: {eventRiskSummary.nextMajor.name} · {timeToEventText(eventRiskSummary.nextMajor)}
              </Badge>
            )}
          </Card>
          <Card>
            <Title icon="🧾" title="Event Results" sub="Actual / forecast enrichment." />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Badge value="blue">{Object.keys(eventResults || {}).length} saved</Badge>
            </div>
            <p style={{ color: C.muted, lineHeight: 1.6 }}>
              Add actual, forecast and previous values before rerunning Event Replay for stronger interpretation.
            </p>
          </Card>
          <Card>
            <Title icon="🔁" title="Event Replay" sub="Retrospective reaction reconstruction." />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Badge value="supportive">{replayRecords.length} replay records</Badge>
            </div>
            <p style={{ color: C.muted, lineHeight: 1.6 }}>
              Use Event Replay after important events to reconstruct +15m and +60m market reactions without relying on timed manual clicks.
            </p>
          </Card>
          <Card>
            <Title icon="🤖" title="Auto Post-Event Tracking" sub="Local tracking jobs." />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Badge value={autoTrackEnabled ? "supportive" : "warning"}>{autoTrackEnabled ? "enabled" : "disabled"}</Badge>
              <Badge value="blue">{autoTrackJobs.length} jobs</Badge>
              <Badge value="supportive">{autoTrackJobs.filter((j) => j.completedAt).length} completed</Badge>
            </div>
            <p style={{ color: C.muted, lineHeight: 1.6 }}>
              Create jobs from the official calendar and keep the app open to capture pre/post snapshots automatically.
            </p>
          </Card>
          <Card>
            <Title icon="📈" title="Post-Event Reaction" sub="Saved reaction records." />
            <div style={{ fontSize: 28, fontWeight: 950, color: reactionRecords.length ? C.gold : C.muted }}>{reactionRecords.length}</div>
            <p style={{ color: C.muted, lineHeight: 1.6 }}>
              Use this after CPI, NFP, FOMC or PCE to compare actual/forecast with gold, DXY, 10Y yield and real-yield reaction.
            </p>
          </Card>
          <Card>
            <Title icon="🧠" title="Scenario Lab" sub="Structured bullish / bearish / wait cases." />
            <p style={{ color: C.muted, lineHeight: 1.6 }}>
              Use Scenario Lab after Event Results and Event Replay to compare research scenarios and decision gates.
            </p>
          </Card>
          <Card>
            <Title icon="📦" title="Export / BI Bridge" sub="Local records ready for future migration." />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Badge value="blue">calendar {calendarEvents.length}</Badge>
              <Badge value="blue">replay {replayRecords.length}</Badge>
              <Badge value="blue">reactions {reactionRecords.length}</Badge>
              <Badge value="blue">jobs {autoTrackJobs.length}</Badge>
            </div>
            <p style={{ color: C.muted, lineHeight: 1.6 }}>
              Use the Export / BI tab to download local prototype records before moving them into the BI/DataOps platform.
            </p>
          </Card>
          <Card>
            <Title icon="🧭" title="Next Development Path" sub="Current v2 scope." />
            <p style={{ color: C.muted, lineHeight: 1.7 }}>
              GDELT and FRED are active local sources. The calendar is now seeded with official Fed/BLS/BEA/EIA dates relevant to gold. Trading Economics, Reddit and YouTube remain disabled until official keys/proxies are added.
            </p>
          </Card>
          <SourceHealth compact />
        </div>
      </div>
    );
  }

  function NewsPanel() {
    return (
      <Card>
        <Title icon="📰" title="GDELT Gold News Intelligence" sub="Free global news; query defaults to English gold-price headlines." />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {["all", "bullish", "bearish", "uncertain"].map((f) => (
            <button key={f} onClick={() => setNewsFilter(f)} style={{
              background: newsFilter === f ? C.gold : C.card2,
              color: newsFilter === f ? "#111827" : C.text,
              border: `1px solid ${newsFilter === f ? C.gold : C.border}`,
              borderRadius: 10,
              padding: "8px 11px",
              fontWeight: 900,
              cursor: "pointer",
            }}>{f}</button>
          ))}
          <button onClick={refreshGdelt} disabled={loadingGdelt || gdeltWait > 0} style={{ ...btn(loadingGdelt || gdeltWait > 0), marginLeft: "auto" }}>
            {loadingGdelt ? "Loading..." : gdeltWait > 0 ? `Wait ${gdeltWait}s` : "Refresh GDELT"}
          </button>
        </div>
        <p style={{ color: C.muted, fontSize: 12 }}>
          Query: <b style={{ color: C.gold }}>{settings.gdeltQuery}</b> · Timespan: {settings.gdeltTimespan}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredNews.map((n) => (
            <Card key={n.id} style={{ background: C.card2, borderColor: `${colorFor(n.impact)}55` }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>{n.title}</h3>
                  <div style={{ color: C.muted, fontSize: 12 }}>{n.source} · {safeDate(n.publishedAt)}</div>
                </div>
                {n.url && n.url !== "#" && <a href={n.url} target="_blank" rel="noreferrer" style={{ color: C.gold }}>open</a>}
              </div>
              <p style={{ color: C.muted, lineHeight: 1.55 }}>{n.summary}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Badge value={n.impact}>{n.impact}</Badge>
                <Badge value="blue">{n.category}</Badge>
                <Badge value="warning">confidence {n.confidence}%</Badge>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    );
  }

  function MacroScoreCard() {
    const supportive = fredRows.filter((r) => r.pressure === "supportive").length;
    const negative = fredRows.filter((r) => r.pressure === "negative").length;
    const mixed = fredRows.filter((r) => r.pressure === "mixed" || r.pressure === "neutral").length;
    return (
      <Card>
        <Title icon="🏦" title="FRED Macro Pressure" sub="Gold-impact interpretation from FRED macro series." />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Badge value="supportive">supportive {supportive}</Badge>
          <Badge value="negative">negative {negative}</Badge>
          <Badge value="mixed">mixed/neutral {mixed}</Badge>
          <Badge value={fredScore > 0 ? "supportive" : fredScore < 0 ? "negative" : "neutral"}>macro score {fredScore}</Badge>
        </div>
      </Card>
    );
  }

  function MacroRegime() {
    const byId = fredRows.reduce((acc, row) => {
      acc[row.id] = row;
      return acc;
    }, {});

    const d10 = byId.DGS10;
    const d2 = byId.DGS2;
    const real = byId.DFII10;
    const usd = byId.DTWEXBGS;
    const inflation = byId.CPIAUCSL || byId.PCEPI;
    const labor = byId.UNRATE || byId.PAYEMS;

    const cards = [
      {
        title: "Yield pressure",
        value: d10 ? d10.pressure : "missing",
        detail: d10 ? `${d10.title}: ${pct(d10.latest)}${d10.unit}, change ${d10.change > 0 ? "+" : ""}${pct(d10.change)}` : "DGS10 unavailable",
        rule: "Rising yields usually pressure gold.",
      },
      {
        title: "Real-yield pressure",
        value: real ? real.pressure : "missing",
        detail: real ? `${real.title}: ${pct(real.latest)}${real.unit}, change ${real.change > 0 ? "+" : ""}${pct(real.change)}` : "DFII10 unavailable",
        rule: "Rising real yields are one of the strongest bearish macro signals for gold.",
      },
      {
        title: "USD pressure",
        value: usd ? usd.pressure : "missing",
        detail: usd ? `${usd.title}: ${pct(usd.latest)}${usd.unit}, change ${usd.change > 0 ? "+" : ""}${pct(usd.change)}` : "DTWEXBGS unavailable",
        rule: "A stronger dollar usually pressures XAUUSD.",
      },
      {
        title: "Inflation pressure",
        value: inflation ? inflation.pressure : "missing",
        detail: inflation ? `${inflation.title}: ${pct(inflation.latest)}${inflation.unit}, change ${inflation.change > 0 ? "+" : ""}${pct(inflation.change)}` : "Inflation series unavailable",
        rule: "Cooling inflation may support gold if yields fall; hot inflation is mixed if Fed turns hawkish.",
      },
      {
        title: "Labor pressure",
        value: labor ? labor.pressure : "missing",
        detail: labor ? `${labor.title}: ${pct(labor.latest)}${labor.unit}, change ${labor.change > 0 ? "+" : ""}${pct(labor.change)}` : "Labor series unavailable",
        rule: "Weakening labor can support rate-cut expectations.",
      },
    ];

    return (
      <Card>
        <Title icon="🧠" title="Macro Regime Summary" sub="Readable interpretation of FRED macro pressure for gold." />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {cards.map((x) => (
            <Card key={x.title} style={{ background: C.card2, borderColor: `${colorFor(x.value)}55` }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: 15 }}>{x.title}</h3>
                <Badge value={x.value}>{x.value}</Badge>
              </div>
              <p style={{ color: C.text, fontWeight: 850 }}>{x.detail}</p>
              <p style={{ color: C.muted, lineHeight: 1.55, fontSize: 13 }}>{x.rule}</p>
            </Card>
          ))}
        </div>
      </Card>
    );
  }

  function MacroDrivers() {
    const grouped = fredRows.reduce((acc, row) => {
      acc[row.group] = acc[row.group] || [];
      acc[row.group].push(row);
      return acc;
    }, {});

    return (
      <Card>
        <Title icon="🏦" title="FRED Macro Drivers" sub="US yields, real-yield proxy, inflation, labor and dollar pressure for gold." />
        <MacroRegime />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "14px 0" }}>
          <button onClick={refreshFred} disabled={loadingFred || fredWait > 0} style={btn(loadingFred || fredWait > 0)}>
            {loadingFred ? "Loading FRED..." : fredWait > 0 ? `Wait ${fredWait}s` : "Refresh FRED"}
          </button>
          <Badge value={health.fred.status}>{health.fred.status}</Badge>
          <Badge value="warning">{cacheStatusText(KEYS.fredCache, FRED_CACHE_TTL_MS)}</Badge>
          <span style={{ color: C.muted, fontSize: 13, alignSelf: "center" }}>{health.fred.message}</span>
        </div>

        {Object.entries(grouped).map(([group, rows]) => (
          <div key={group} style={{ marginBottom: 18 }}>
            <h3 style={{ color: C.gold, margin: "0 0 10px" }}>{group}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 12 }}>
              {rows.map((r) => (
                <Card key={r.id} style={{ background: C.card2, borderColor: `${colorFor(r.pressure)}55` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <h3 style={{ margin: 0, fontSize: 16 }}>{r.title}</h3>
                    <Badge value={r.pressure}>{r.pressure}</Badge>
                  </div>
                  <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <div>
                      <div style={{ color: C.muted, fontSize: 11 }}>Latest</div>
                      <div style={{ color: C.text, fontWeight: 900 }}>{pct(r.latest)} {r.unit}</div>
                    </div>
                    <div>
                      <div style={{ color: C.muted, fontSize: 11 }}>Previous</div>
                      <div style={{ color: C.text, fontWeight: 900 }}>{pct(r.previous)} {r.unit}</div>
                    </div>
                    <div>
                      <div style={{ color: C.muted, fontSize: 11 }}>Change</div>
                      <div style={{ color: r.change > 0 ? C.green : r.change < 0 ? C.red : C.gray, fontWeight: 900 }}>{r.change > 0 ? "+" : ""}{pct(r.change)}</div>
                    </div>
                  </div>
                  <p style={{ color: C.muted, lineHeight: 1.55 }}>{r.explanation}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", color: C.muted, fontSize: 12 }}>
                    <span>Series: {r.id}</span>
                    <span>{safeDate(r.latestDate)}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </Card>
    );
  }

  function Calendar() {
    const input = { width: "100%", boxSizing: "border-box", background: C.card2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 10px" };
    const label = { display: "block", color: C.muted, fontSize: 11, marginBottom: 5, fontWeight: 850 };

    const filtered = calendarEvents
      .filter((e) => calendarFilter === "all" ? true : calendarFilter === "avoid" ? isAvoidWindow(e) : e.importance === calendarFilter)
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

    const addEvent = () => {
      if (!newEvent.name.trim()) return;
      setCalendarEvents((items) => [...items, { ...newEvent, id: `${newEvent.name}-${Date.now()}` }]);
      setShowAddEvent(false);
      setNewEvent({
        date: toISODate(new Date()),
        time: "08:30",
        country: "US",
        name: "",
        category: "Inflation",
        importance: "Medium",
        previous: "",
        forecast: "",
        actual: "",
        expectedImpact: "",
        volatilityRisk: "Medium",
        avoidWindow: "30–60 minutes around release",
        source: "Manual",
        notes: "",
      });
    };

    return (
      <Card>
        <Title
          icon="📅"
          title="Official Gold Macro Calendar"
          sub="Officially sourced Fed/BLS/BEA/EIA dates relevant to XAUUSD macro risk."
        />

        <Card style={{ background: "#171008", borderColor: "#92400e", marginBottom: 14 }}>
          <b style={{ color: C.gold }}>Important:</b>{" "}
          <span style={{ color: C.muted }}>
            This calendar is seeded from official public sources available at build time: Federal Reserve, BLS, BEA and EIA. 
            It is not yet auto-updated. For production, connect official calendars/ICS/JSON or Trading Economics through a backend job.
          </span>
        </Card>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {["all", "Critical", "High", "Medium", "Low", "Watchlist", "avoid"].map((f) => (
            <button
              key={f}
              onClick={() => setCalendarFilter(f)}
              style={{
                background: calendarFilter === f ? C.gold : C.card2,
                color: calendarFilter === f ? "#111827" : C.text,
                border: `1px solid ${calendarFilter === f ? C.gold : C.border}`,
                borderRadius: 10,
                padding: "8px 11px",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {f === "avoid" ? "Avoid-window now" : f}
            </button>
          ))}
          <button onClick={() => setShowAddEvent((v) => !v)} style={{ ...btn(false), marginLeft: "auto" }}>
            {showAddEvent ? "Close form" : "Add event"}
          </button>
          <button onClick={() => setCalendarEvents(generateMacroCalendar())} style={btn(false)}>
            Reload embedded seed
          </button>
          <button onClick={loadGeneratedOfficialCalendar} style={btn(false)}>
            Load generated official file
          </button>
        </div>
        <Card style={{ background: C.card2, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <b>Calendar source status:</b>{" "}
              <span style={{ color: C.muted }}>{calendarSourceStatus}</span>
            </div>
            {calendarSourceHealth?.generatedAt && (
              <Badge value="live">generated {safeDate(calendarSourceHealth.generatedAt)}</Badge>
            )}
          </div>
          {calendarSourceHealth?.sources && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              {Object.entries(calendarSourceHealth.sources).map(([name, s]) => (
                <Badge key={name} value={s.status === "live" ? "supportive" : s.status === "error" ? "negative" : "warning"}>
                  {name}: {s.status} · {s.count}
                </Badge>
              ))}
            </div>
          )}
        </Card>

        {showAddEvent && (
          <Card style={{ background: C.card2, marginBottom: 14 }}>
            <h3 style={{ marginTop: 0, color: C.gold }}>Add manual macro event</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <div><label style={label}>Date</label><input type="date" style={input} value={newEvent.date} onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })} /></div>
              <div><label style={label}>Time</label><input type="time" style={input} value={newEvent.time} onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })} /></div>
              <div><label style={label}>Country</label><input style={input} value={newEvent.country} onChange={(e) => setNewEvent({ ...newEvent, country: e.target.value })} /></div>
              <div><label style={label}>Event name</label><input style={input} value={newEvent.name} onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })} placeholder="e.g., CPI / Core CPI" /></div>
              <div><label style={label}>Category</label><select style={input} value={newEvent.category} onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })}><option>Inflation</option><option>Labor</option><option>Fed / Rates</option><option>Growth</option><option>Dollar</option><option>Oil / Inflation</option><option>Wages / Inflation</option><option>Geopolitical</option></select></div>
              <div><label style={label}>Importance</label><select style={input} value={newEvent.importance} onChange={(e) => setNewEvent({ ...newEvent, importance: e.target.value })}><option>Critical</option><option>High</option><option>Medium</option><option>Low</option><option>Watchlist</option></select></div>
              <div><label style={label}>Previous</label><input style={input} value={newEvent.previous} onChange={(e) => setNewEvent({ ...newEvent, previous: e.target.value })} /></div>
              <div><label style={label}>Forecast</label><input style={input} value={newEvent.forecast} onChange={(e) => setNewEvent({ ...newEvent, forecast: e.target.value })} /></div>
              <div><label style={label}>Actual</label><input style={input} value={newEvent.actual} onChange={(e) => setNewEvent({ ...newEvent, actual: e.target.value })} /></div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={label}>Expected impact on gold</label>
              <textarea style={{ ...input, minHeight: 72 }} value={newEvent.expectedImpact} onChange={(e) => setNewEvent({ ...newEvent, expectedImpact: e.target.value })} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={addEvent} style={btn(false)}>Save event</button>
              <button onClick={() => setShowAddEvent(false)} style={btn(false)}>Cancel</button>
            </div>
          </Card>
        )}

        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map((e) => {
            const avoidNow = isAvoidWindow(e);
            const riskValue = avoidNow ? "warning" : e.importance === "Critical" ? "negative" : e.importance === "High" ? "negative" : e.importance === "Medium" ? "warning" : e.importance === "Watchlist" ? "warning" : "blue";
            return (
              <Card key={e.id} style={{ background: C.card2, borderColor: `${colorFor(riskValue)}55` }}>
                <div style={{ display: "grid", gridTemplateColumns: "130px 1fr auto", gap: 12, alignItems: "start" }}>
                  <div>
                    <div style={{ color: C.gold, fontWeight: 950 }}>{e.date}</div>
                    <div style={{ color: C.muted, fontSize: 12 }}>{e.time} · {timeToEventText(e)}</div>
                    <div style={{ marginTop: 8 }}><Badge value={e.importance === "Critical" ? "negative" : e.importance === "High" ? "negative" : e.importance === "Medium" ? "warning" : e.importance === "Watchlist" ? "warning" : "blue"}>{e.importance}</Badge></div>
                  </div>
                  <div>
                    <h3 style={{ margin: "0 0 6px" }}>{e.name}</h3>
                    <div style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>
                      {e.country} · {e.category} · {e.sourceUrl ? <a href={e.sourceUrl} target="_blank" rel="noreferrer">{e.source}</a> : e.source}
                    </div>
                    <p style={{ color: C.muted, lineHeight: 1.6, margin: 0 }}>{e.expectedImpact}</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                      <Badge value={e.volatilityRisk === "Extreme" ? "negative" : e.volatilityRisk === "High" ? "negative" : e.volatilityRisk === "Medium" ? "warning" : e.volatilityRisk === "Watchlist" ? "warning" : "blue"}>volatility {e.volatilityRisk}</Badge>
                      <Badge value={avoidNow ? "warning" : "blue"}>{avoidNow ? "avoid window active" : e.avoidWindow}</Badge>
                      {(e.previous || e.forecast || e.actual) && <Badge value="blue">prev {e.previous || "TBD"} · fcst {e.forecast || "TBD"} · actual {e.actual || "TBD"}</Badge>}
                    </div>
                  </div>
                  <button
                    onClick={() => setCalendarEvents((items) => items.filter((x) => x.id !== e.id))}
                    style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 8px", cursor: "pointer" }}
                  >
                    remove
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      </Card>
    );
  }




  function EventResultsCenter() {
    const highImpactEvents = calendarUniverse
      .filter((e) => isHighImpactEvent(e) || ["Inflation", "Labor", "Fed / Rates", "Growth", "Oil / Inflation"].includes(e.category))
      .sort((a, b) => eventTimeToTimestamp(a) - eventTimeToTimestamp(b));

    const [selectedId, setSelectedId] = useState(highImpactEvents[0]?.id || "");
    const selectedRaw = calendarEvents.find((e) => e.id === selectedId) || highImpactEvents[0] || calendarEvents[0];
    const selected = selectedRaw ? getEnrichedEvent(selectedRaw) : null;
    const saved = selected ? getEventResult(selected.id) : null;

    const [form, setForm] = useState({
      previous: "",
      forecast: "",
      actual: "",
      surprise: "auto",
      source: "Manual",
      notes: "",
    });

    useEffect(() => {
      if (!selected) return;
      const result = getEventResult(selected.id);
      setForm({
        previous: result?.previous ?? selected.previous ?? "",
        forecast: result?.forecast ?? selected.forecast ?? "",
        actual: result?.actual ?? selected.actual ?? "",
        surprise: result?.surprise ?? "auto",
        source: result?.source ?? "Manual",
        notes: result?.notes ?? "",
      });
    }, [selectedId]);

    const input = { width: "100%", boxSizing: "border-box", background: C.card2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 10px" };
    const label = { display: "block", color: C.muted, fontSize: 11, marginBottom: 5, fontWeight: 850 };

    const surprisePreview = selected ? inferEventSurprise(selected, form.actual, form.forecast, form.surprise) : "unknown";
    const expectedImpact = selected ? expectedGoldImpactFromSurprise(selected, surprisePreview) : "unknown";

    function saveSelected() {
      if (!selected) return;
      saveEventResult(selected, form);
    }

    function applyToReplay() {
      if (!selected) return;
      saveEventResult(selected, form);
      setReplayStatus(`event result saved; rerun Event Replay for ${selected.name}`);
    }

    const completedWithMissingResults = highImpactEvents.filter((e) => {
      const passed = eventTimeToTimestamp(e) <= Date.now();
      const result = getEventResult(e.id);
      return passed && !result?.actual;
    }).slice(0, 10);

    const savedResults = Object.values(eventResults || {})
      .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));

    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr .85fr", gap: 16 }}>
        <Card>
          <Title icon="🧾" title="Optional Event Results Enrichment" sub="Optional enrichment for actual, forecast and previous values. Not required for replay." />

          <Card style={{ background: "#171008", borderColor: "#92400e", marginBottom: 14 }}>
            <b style={{ color: C.gold }}>Optional only:</b>{" "}
            <span style={{ color: C.muted }}>
              You do not need to fill this manually. Event Replay works from market reaction data. This page is only for optional enrichment if official actual/forecast data is available later.
            </span>
          </Card>

          <div style={{ marginBottom: 12 }}>
            <label style={label}>Select event</label>
            <select style={input} value={selected?.id || ""} onChange={(e) => setSelectedId(e.target.value)}>
              {highImpactEvents.map((e) => {
                const result = getEventResult(e.id);
                return (
                  <option key={e.id} value={e.id}>
                    {e.date} {e.time} · {e.name} · {e.importance}{result?.actual ? " · result saved" : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {selected && (
            <Card style={{ background: C.card2, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: "0 0 6px" }}>{selected.name}</h3>
                  <div style={{ color: C.muted, fontSize: 12 }}>
                    {selected.country || "US"} · {selected.date} · {selected.time} · {selected.category} · {selected.source}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Badge value={selected.importance === "Critical" ? "negative" : selected.importance === "High" ? "warning" : "blue"}>{selected.importance}</Badge>
                  <Badge value={saved?.actual ? "supportive" : "warning"}>{saved?.actual ? "result saved" : "optional result missing"}</Badge>
                </div>
              </div>
              <p style={{ color: C.muted, lineHeight: 1.55 }}>{selected.expectedImpact}</p>
            </Card>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div><label style={label}>Previous</label><input style={input} value={form.previous} onChange={(e) => setForm({ ...form, previous: e.target.value })} placeholder="e.g., 3.1" /></div>
            <div><label style={label}>Forecast</label><input style={input} value={form.forecast} onChange={(e) => setForm({ ...form, forecast: e.target.value })} placeholder="e.g., 3.0" /></div>
            <div><label style={label}>Actual</label><input style={input} value={form.actual} onChange={(e) => setForm({ ...form, actual: e.target.value })} placeholder="e.g., 2.9" /></div>
            <div>
              <label style={label}>Surprise</label>
              <select style={input} value={form.surprise} onChange={(e) => setForm({ ...form, surprise: e.target.value })}>
                <option value="auto">auto from actual/forecast</option>
                <option value="hotter-than-expected">hotter-than-expected</option>
                <option value="cooler-than-expected">cooler-than-expected</option>
                <option value="stronger-than-expected">stronger-than-expected</option>
                <option value="weaker-than-expected">weaker-than-expected</option>
                <option value="hawkish">hawkish</option>
                <option value="dovish">dovish</option>
                <option value="in-line">in-line</option>
                <option value="unknown">unknown</option>
              </select>
            </div>
            <div><label style={label}>Source</label><input style={input} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Manual / Trading Economics / BLS" /></div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={label}>Notes</label>
            <textarea style={{ ...input, minHeight: 74 }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Revisions, core vs headline, market context, source note..." />
          </div>

          <Card style={{ background: C.card2, marginTop: 14 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Badge value="warning">surprise: {surprisePreview}</Badge>
              <Badge value={expectedImpact === "supportive" ? "supportive" : String(expectedImpact).includes("negative") ? "negative" : "warning"}>expected gold impact: {expectedImpact}</Badge>
              <Badge value="blue">{eventResultStatus}</Badge>
            </div>
          </Card>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            <button onClick={saveSelected} style={btn(false)}>Save event result</button>
            <button onClick={applyToReplay} style={btn(false)}>Save optional result</button>
            {selected && <button onClick={() => clearEventResult(selected.id)} style={btn(false)}>Clear selected result</button>}
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <Title icon="⚠️" title="Optional Missing Result Enrichment" sub="Passed events that can be enriched later, but replay does not depend on this." />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {completedWithMissingResults.length === 0 && <p style={{ color: C.muted }}>No completed high-impact event is missing actual values.</p>}
              {completedWithMissingResults.map((e) => (
                <Card key={e.id} style={{ background: C.card2 }}>
                  <b>{e.name}</b>
                  <div style={{ color: C.muted, fontSize: 12 }}>{e.date} · {e.time} · {e.category}</div>
                  <button onClick={() => setSelectedId(e.id)} style={{ ...btn(false), marginTop: 8 }}>Optional fill</button>
                </Card>
              ))}
            </div>
          </Card>

          <Card>
            <Title icon="🗃️" title="Saved Event Results" sub="Local enrichment records." />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {savedResults.length === 0 && <p style={{ color: C.muted }}>No event result saved yet.</p>}
              {savedResults.slice(0, 12).map((r) => (
                <Card key={r.eventId} style={{ background: C.card2 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div>
                      <b>{r.eventName}</b>
                      <div style={{ color: C.muted, fontSize: 12 }}>{r.eventDate} · saved {safeDate(r.savedAt)} · {r.source}</div>
                    </div>
                    <Badge value="supportive">saved</Badge>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    <Badge value="blue">prev {r.previous || "n/a"}</Badge>
                    <Badge value="blue">forecast {r.forecast || "n/a"}</Badge>
                    <Badge value="warning">actual {r.actual || "n/a"}</Badge>
                    <Badge value="warning">{r.surprise || "auto"}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          <Card style={{ background: "#102016", borderColor: "#166534" }}>
            <Title icon="✅" title="Later automation target" sub="BI/DataOps migration." />
            <p style={{ color: C.muted, lineHeight: 1.7 }}>
              In the BI platform, this center should be replaced by automatic event-result enrichment from Trading Economics or official source parsers.
              For now, it gives us a safe manual bridge.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  function EventReplayTracker() {
    const [replayFilter, setReplayFilter] = useState("completed");

    const replayableEvents = calendarUniverse
      .filter((e) => isHighImpactEvent(e))
      .filter((e) => eventTimeToTimestamp(e) + 60 * 60000 <= Date.now())
      .sort((a, b) => eventTimeToTimestamp(b) - eventTimeToTimestamp(a))
      .slice(0, 50);

    const upcomingImportant = calendarUniverse
      .filter((e) => isHighImpactEvent(e))
      .filter((e) => eventTimeToTimestamp(e) > Date.now())
      .sort((a, b) => eventTimeToTimestamp(a) - eventTimeToTimestamp(b))
      .slice(0, 12);

    async function replayOne(event) {
      setReplayStatus(`reconstructing ${event.name}...`);
      try {
        const record = await reconstructEventFromHistory(getEnrichedEvent(event));
        setReplayRecords((items) => {
          const withoutSame = items.filter((x) => x.eventId !== event.id);
          return [record, ...withoutSame].slice(0, 100);
        });
        setReplayStatus(`reconstructed ${event.name}`);
      } catch (err) {
        setReplayStatus(`replay failed for ${event.name}: ${err.message}`);
      }
    }

    async function replayAllRecent() {
      const targets = replayableEvents.slice(0, 10);
      if (!targets.length) {
        setReplayStatus("no completed high-impact events available for replay");
        return;
      }

      setReplayStatus(`reconstructing ${targets.length} completed event(s)...`);
      let ok = 0;
      for (const event of targets) {
        try {
          const record = await reconstructEventFromHistory(getEnrichedEvent(event));
          setReplayRecords((items) => {
            const withoutSame = items.filter((x) => x.eventId !== event.id);
            return [record, ...withoutSame].slice(0, 100);
          });
          ok += 1;
        } catch (err) {
          setReplayStatus(`some replay failed: ${err.message}`);
        }
      }
      setReplayStatus(`reconstructed ${ok}/${targets.length} completed event(s)`);
    }

    function MoveBadges({ moves }) {
      if (!moves) return null;
      return (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Badge value="blue">Gold {moves.goldMovePct === null ? "n/a" : signed(moves.goldMovePct)}%</Badge>
          <Badge value="blue">DXY {moves.dxyMovePct === null ? "n/a" : signed(moves.dxyMovePct)}%</Badge>
          <Badge value="blue">10Y {moves.yield10yMoveBp === null ? "n/a" : signed(moves.yield10yMoveBp)} bp</Badge>
        </div>
      );
    }

    function AnalysisBadges({ analysis }) {
      if (!analysis) return null;
      return (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Badge value={analysis.observedReaction === "gold-supportive" ? "supportive" : analysis.observedReaction === "gold-negative" ? "negative" : "warning"}>{analysis.observedReaction}</Badge>
          <Badge value={analysis.alignment === "aligned" ? "supportive" : analysis.alignment === "divergent" ? "negative" : "warning"}>{analysis.alignment}</Badge>
          <Badge value="warning">surprise {analysis.surprise}</Badge>
        </div>
      );
    }

    function fmtPoint(point) {
      if (!point) return "n/a";
      const diffMin = Math.round((point.diffMs || 0) / 60000);
      const source = point.symbol ? ` · ${point.symbol}${point.interval ? " " + point.interval : ""}` : "";
      return `${point.price} · ${safeDate(new Date(point.t).toISOString())} · diff ${diffMin}m${source}`;
    }

    function EventIdentityBox({ record }) {
      const identity = record.eventIdentity || {
        title: record.eventName,
        date: record.eventDate,
        time: record.eventTime,
        category: record.category,
        source: record.source,
        eventTimestamp: record.eventTimestamp,
      };
      return (
        <Card style={{ background: C.card, borderColor: `${C.blue}55` }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div>
              <h3 style={{ margin: "0 0 6px", color: C.gold }}>{identity.title}</h3>
              <div style={{ color: C.muted, fontSize: 12 }}>
                {identity.country || "US"} · {identity.category} · {identity.importance || ""} · event time: {identity.date} {identity.time}
              </div>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
                Source: {identity.sourceUrl ? <a href={identity.sourceUrl} target="_blank" rel="noreferrer">{identity.source}</a> : identity.source}
              </div>
            </div>
            <Badge value={identity.official ? "supportive" : "warning"}>{identity.official ? "official source" : "source unclear"}</Badge>
          </div>
          <p style={{ color: C.muted, fontSize: 12, marginBottom: 0 }}>{identity.timezoneNote}</p>
        </Card>
      );
    }

    function MarketPointCard({ title, bundle }) {
      return (
        <Card style={{ background: C.card2 }}>
          <b>{title}</b>
          <div style={{ color: C.muted, fontSize: 12, margin: "4px 0 8px" }}>
            Target: {safeDate(bundle?.targetTime)}
          </div>
          <div style={{ display: "grid", gap: 5, color: C.muted, fontSize: 13 }}>
            <span>Gold: {fmtPoint(bundle?.gold)}</span>
            <span>DXY: {fmtPoint(bundle?.dxy)}</span>
            <span>10Y: {fmtPoint(bundle?.us10y)}</span>
          </div>
        </Card>
      );
    }

    function ReactionScheduleBox({ record }) {
      const schedule = record.reactionSchedule;
      const prePoints = schedule?.prePoints || {
        pre15m: record.baseline,
      };
      const postPoints = schedule?.postPoints || {
        post15m: record.post15Point,
        post60m: record.post60Point,
      };

      return (
        <Card style={{ background: C.card, borderColor: `${C.gold}55` }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <b style={{ color: C.gold }}>Event Reaction Schedule</b>
            <Badge value="warning">pre + post points registered</Badge>
          </div>
          <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.5 }}>
            The system reconstructs multiple pre-event baselines and multiple post-event reaction points. 
            The primary short-term comparison uses T-15m as the main baseline, but longer baselines are also retained.
          </p>
          {record.reactionSchedule?.providerMode && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <Badge value="blue">provider mode: {record.reactionSchedule.providerMode}</Badge>
              {record.reactionSchedule?.errors?.length > 0 && <Badge value="warning">partial data warnings {record.reactionSchedule.errors.length}</Badge>}
            </div>
          )}
          {record.reactionSchedule?.errors?.length > 0 && (
            <details style={{ color: C.muted, fontSize: 12, marginBottom: 10 }}>
              <summary>Show provider warnings</summary>
              <ul>
                {record.reactionSchedule.errors.slice(0, 8).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}

          <h4 style={{ color: C.gold, marginBottom: 8 }}>Pre-event baselines</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 8 }}>
            {Object.entries(prePoints).map(([key, bundle]) => (
              <MarketPointCard key={key} title={bundle?.label || key} bundle={bundle} />
            ))}
          </div>

          <h4 style={{ color: C.gold, margin: "14px 0 8px" }}>Post-event reaction points</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 8 }}>
            {Object.entries(postPoints).map(([key, bundle]) => (
              <MarketPointCard key={key} title={bundle?.label || key} bundle={bundle} />
            ))}
          </div>
        </Card>
      );
    }

    function PointComparisonBox({ title, pointBundle, moves, analysis }) {
      return (
        <Card style={{ background: C.card }}>
          <b>{title}</b>
          <div style={{ color: C.muted, fontSize: 12, margin: "4px 0 8px" }}>
            Target time: {safeDate(pointBundle?.targetTime)}
          </div>
          <div style={{ display: "grid", gap: 5, color: C.muted, fontSize: 13, marginBottom: 10 }}>
            <span>Gold point: {fmtPoint(pointBundle?.gold)}</span>
            <span>DXY point: {fmtPoint(pointBundle?.dxy)}</span>
            <span>10Y point: {fmtPoint(pointBundle?.us10y)}</span>
          </div>
          <MoveBadges moves={moves} />
          <div style={{ marginTop: 8 }}><AnalysisBadges analysis={analysis} /></div>
          <p style={{ color: C.muted, lineHeight: 1.55 }}>{analysis?.interpretation}</p>
        </Card>
      );
    }

    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr .85fr", gap: 16 }}>
        <Card>
          <Title icon="🔁" title="Event Replay Tracker" sub="Reconstructs post-event reaction from historical intraday data. No manual timing needed." />

          <Card style={{ background: "#102016", borderColor: "#166534", marginBottom: 14 }}>
            <b style={{ color: C.green }}>Better approach:</b>{" "}
            <span style={{ color: C.muted }}>
              Instead of relying on exact pre/+15/+60 clicks, this module waits until after the event and reconstructs the T-15m pre-event baseline plus T+15m and T+60m post-event points from historical intraday data.
            </span>
          </Card>

          <Card style={{ background: "#171008", borderColor: "#92400e", marginBottom: 14 }}>
            <b style={{ color: C.gold }}>Limitation:</b>{" "}
            <span style={{ color: C.muted }}>
              Historical intraday availability is provider-dependent and not guaranteed forever. For robust production, store market data continuously in the BI/DataOps backend.
            </span>
          </Card>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <button onClick={replayAllRecent} style={btn(false)}>Replay recent completed events</button>
            <button onClick={() => setReplayRecords([])} style={btn(false)}>Clear replay records</button>
            <Badge value="blue">{replayStatus}</Badge>
            <Badge value="supportive">{replayRecords.length} replay records</Badge>
          </div>

          <h3 style={{ color: C.gold }}>Completed high-impact events available for replay</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {replayableEvents.length === 0 && (
              <Card style={{ background: C.card2 }}>
                <b>No completed high-impact event yet.</b>
                <p style={{ color: C.muted, lineHeight: 1.6 }}>
                  Replay becomes useful after a Critical/High event has passed. For full T+4h and T+1d analysis, wait longer after the event.
                  Until then, use Event Risk for preparation.
                </p>
              </Card>
            )}

            {replayableEvents.map((e) => (
              <Card key={e.id} style={{ background: C.card2 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <h3 style={{ margin: "0 0 5px" }}>{e.name}</h3>
                    <div style={{ color: C.muted, fontSize: 12 }}>{e.date} · {e.time} · {e.category} · {e.source}</div>
                  </div>
                  <button onClick={() => replayOne(e)} style={btn(false)}>Reconstruct reaction</button>
                </div>
              </Card>
            ))}
          </div>

          <h3 style={{ color: C.gold, marginTop: 18 }}>Replay records</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {replayRecords.length === 0 && <p style={{ color: C.muted }}>No replay records yet.</p>}
            {replayRecords.map((r) => (
              <Card key={r.id} style={{ background: C.card2, borderColor: `${colorFor(r.post60Analysis?.alignment === "aligned" ? "supportive" : r.post60Analysis?.alignment === "divergent" ? "negative" : "warning")}55` }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <h3 style={{ margin: "0 0 5px" }}>{r.eventName}</h3>
                    <div style={{ color: C.muted, fontSize: 12 }}>{r.eventDate} · {r.eventTime} · saved {safeDate(r.savedAt)}</div>
                  </div>
                  <button onClick={() => setReplayRecords((items) => items.filter((x) => x.id !== r.id))} style={btn(false)}>Remove</button>
                </div>

                <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                  <EventIdentityBox record={r} />
                  <ReactionScheduleBox record={r} />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 10 }}>
                    <PointComparisonBox
                      title="Post +15m compared with T-15m baseline"
                      pointBundle={r.reactionSchedule?.postPoints?.post15m || r.post15Point}
                      moves={r.reactionSchedule?.comparisons?.post15m?.moves || r.post15Moves}
                      analysis={r.reactionSchedule?.comparisons?.post15m?.analysis || r.post15Analysis}
                    />
                    <PointComparisonBox
                      title="Post +60m compared with T-15m baseline"
                      pointBundle={r.reactionSchedule?.postPoints?.post60m || r.post60Point}
                      moves={r.reactionSchedule?.comparisons?.post60m?.moves || r.post60Moves}
                      analysis={r.reactionSchedule?.comparisons?.post60m?.analysis || r.post60Analysis}
                    />
                    {r.reactionSchedule?.comparisons?.post4h && (
                      <PointComparisonBox
                        title="Post +4h compared with T-15m baseline"
                        pointBundle={r.reactionSchedule?.postPoints?.post4h}
                        moves={r.reactionSchedule?.comparisons?.post4h?.moves}
                        analysis={r.reactionSchedule?.comparisons?.post4h?.analysis}
                      />
                    )}
                    {r.reactionSchedule?.comparisons?.post1d && (
                      <PointComparisonBox
                        title="Post +1d compared with T-15m baseline"
                        pointBundle={r.reactionSchedule?.postPoints?.post1d}
                        moves={r.reactionSchedule?.comparisons?.post1d?.moves}
                        analysis={r.reactionSchedule?.comparisons?.post1d?.analysis}
                      />
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  <Badge value="blue">Gold source {r.seriesMeta?.gold?.symbol || "n/a"} {r.seriesMeta?.gold?.interval || ""}</Badge>
                  <Badge value="blue">DXY {r.seriesMeta?.dxy?.interval || "n/a"}</Badge>
                  <Badge value="blue">10Y {r.seriesMeta?.us10y?.interval || "n/a"}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <Title icon="🧠" title="Why Replay Is Better" sub="Less dependency on exact timing." />
            <p style={{ color: C.muted, lineHeight: 1.7 }}>
              The earlier auto snapshot method depends on the browser being open at exactly the right moments.
              Replay reconstruction is more robust because it can run after the event and fetch the market path around the event time.
            </p>
          </Card>

          <Card>
            <Title icon="⏭️" title="Upcoming Events" sub="These are not replayable yet." />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {upcomingImportant.map((e) => (
                <Card key={e.id} style={{ background: C.card2 }}>
                  <b>{e.name}</b>
                  <div style={{ color: C.muted, fontSize: 12 }}>{e.date} · {e.time} · {timeToEventText(e)}</div>
                  <Badge value={e.importance === "Critical" ? "negative" : "warning"}>{e.importance}</Badge>
                </Card>
              ))}
            </div>
          </Card>

          <Card style={{ background: "#170a12", borderColor: "#7f1d1d" }}>
            <Title icon="⚠️" title="Production Direction" sub="The reliable version belongs in BI/DataOps." />
            <p style={{ color: C.muted, lineHeight: 1.7 }}>
              The best long-term solution is to store intraday market data continuously in MinIO/ClickHouse.
              Then post-event reconstruction becomes exact and independent of the browser or third-party intraday retention.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  function AutoPostEventTracker() {
    const [jobFilter, setJobFilter] = useState("all");
    const visibleJobs = autoTrackJobs
      .filter((job) => jobFilter === "all" ? true : job.status === jobFilter)
      .sort((a, b) => eventTimeToTimestamp(a.event) - eventTimeToTimestamp(b.event));

    const pendingCount = autoTrackJobs.filter((j) => !j.completedAt).length;
    const completedCount = autoTrackJobs.filter((j) => j.completedAt).length;

    function SnapshotBox({ title, snapshot }) {
      if (!snapshot) {
        return (
          <Card style={{ background: C.card2 }}>
            <b>{title}</b>
            <p style={{ color: C.muted, marginBottom: 0 }}>not captured</p>
          </Card>
        );
      }
      return (
        <Card style={{ background: C.card2 }}>
          <b>{title}</b>
          <div style={{ color: C.muted, fontSize: 12 }}>{safeDate(snapshot.capturedAt)}</div>
          <div style={{ display: "grid", gap: 4, marginTop: 8, color: C.muted, fontSize: 13 }}>
            <span>Gold: <b style={{ color: C.text }}>{snapshot.gold?.price ?? "n/a"}</b> {snapshot.gold?.symbol}</span>
            <span>DXY: <b style={{ color: C.text }}>{snapshot.dxy?.price ?? "n/a"}</b></span>
            <span>US10Y proxy: <b style={{ color: C.text }}>{snapshot.us10y?.price ?? "n/a"}</b></span>
          </div>
        </Card>
      );
    }

    function AnalysisBox({ job, postKey }) {
      const bundle = job.analyses?.[postKey];
      if (!bundle) return null;
      const { moves, analysis } = bundle;
      return (
        <Card style={{ background: C.card2, borderColor: `${colorFor(analysis.alignment === "aligned" ? "supportive" : analysis.alignment === "divergent" ? "negative" : "warning")}55` }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <b>{postKey} analysis</b>
            <Badge value={analysis.alignment === "aligned" ? "supportive" : analysis.alignment === "divergent" ? "negative" : "warning"}>{analysis.alignment}</Badge>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <Badge value={analysis.observedReaction === "gold-supportive" ? "supportive" : analysis.observedReaction === "gold-negative" ? "negative" : "warning"}>{analysis.observedReaction}</Badge>
            <Badge value="blue">Gold {moves.goldMovePct === null ? "n/a" : signed(moves.goldMovePct)}%</Badge>
            <Badge value="blue">DXY {moves.dxyMovePct === null ? "n/a" : signed(moves.dxyMovePct)}%</Badge>
            <Badge value="blue">10Y {moves.yield10yMoveBp === null ? "n/a" : signed(moves.yield10yMoveBp)} bp</Badge>
          </div>
          <p style={{ color: C.muted, lineHeight: 1.55 }}>{analysis.interpretation}</p>
          <button onClick={() => saveAutoAnalysisAsReactionRecord(job, postKey)} style={btn(false)}>Save into reaction records</button>
        </Card>
      );
    }

    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr .85fr", gap: 16 }}>
        <Card>
          <Title icon="🤖" title="Auto Post-Event Tracker" sub="Automatically creates event jobs and captures pre/post market snapshots while the app is running." />

          <Card style={{ background: "#171008", borderColor: "#92400e", marginBottom: 14 }}>
            <b style={{ color: C.gold }}>Important limitation:</b>{" "}
            <span style={{ color: C.muted }}>
              The local app must be running to capture snapshots at the right time. This is not a server scheduler. For production, move this to the BI/DataOps backend.
            </span>
          </Card>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <button onClick={() => {
              setAutoTrackEnabled((v) => {
                const next = !v;
                if (next && autoTrackJobs.length === 0) {
                  setTimeout(() => createAutoTrackJobsFromCalendar(), 0);
                }
                return next;
              });
            }} style={btn(false)}>
              {autoTrackEnabled ? "Disable auto tracking" : "Enable auto tracking"}
            </button>
            <button onClick={async () => {
              await loadGeneratedOfficialCalendar();
              setTimeout(() => createAutoTrackJobsFromCalendar(), 50);
            }} style={btn(false)}>
              Load calendar + create jobs
            </button>
            <button onClick={createAutoTrackJobsFromCalendar} style={btn(false)}>
              Create jobs from current calendar
            </button>
            <button onClick={runAutoTrackerCheck} style={btn(false)}>
              Run tracker check now
            </button>
            <button onClick={() => setAutoTrackJobs([])} style={btn(false)}>
              Clear jobs
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <Badge value={autoTrackEnabled ? "supportive" : "warning"}>{autoTrackEnabled ? "auto enabled" : "auto disabled"}</Badge>
            <Badge value="blue">jobs {autoTrackJobs.length}</Badge>
            <Badge value="warning">pending {pendingCount}</Badge>
            <Badge value="supportive">completed {completedCount}</Badge>
            <Badge value="blue">{autoTrackerStatus}</Badge>
            <Badge value="blue">{marketSnapshotStatus}</Badge>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {["all", "scheduled", "pre-window", "event-reaction-window", "post-15-ready", "post-60-ready", "completed"].map((f) => (
              <button
                key={f}
                onClick={() => setJobFilter(f)}
                style={{
                  background: jobFilter === f ? C.gold : C.card2,
                  color: jobFilter === f ? "#111827" : C.text,
                  border: `1px solid ${jobFilter === f ? C.gold : C.border}`,
                  borderRadius: 10,
                  padding: "8px 11px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {f}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {visibleJobs.length === 0 && (
              <Card style={{ background: C.card2 }}>
                <b>No auto-track jobs yet.</b>
                <p style={{ color: C.muted, lineHeight: 1.6 }}>
                  Click “Create jobs from calendar”. If it still stays zero, go to Macro Calendar and confirm that official events are loaded.
                  Jobs are created only from future Critical/High events within the next 180 days.
                </p>
              </Card>
            )}

            {visibleJobs.map((job) => (
              <Card key={job.id} style={{ background: C.card2, borderColor: `${colorFor(job.status === "completed" ? "supportive" : job.status.includes("ready") ? "warning" : "blue")}55` }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap" }}>
                  <div>
                    <h3 style={{ margin: "0 0 5px" }}>{job.event.name}</h3>
                    <div style={{ color: C.muted, fontSize: 12 }}>
                      {job.event.date} · {job.event.time} · {timeToEventText(job.event)} · {job.event.category} · {job.event.source}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Badge value={job.event.importance === "Critical" ? "negative" : "warning"}>{job.event.importance}</Badge>
                    <Badge value={job.status === "completed" ? "supportive" : "warning"}>{job.status}</Badge>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10, marginTop: 12 }}>
                  <SnapshotBox title="Pre snapshot" snapshot={job.preSnapshot} />
                  <SnapshotBox title="Post 15m" snapshot={job.postSnapshots?.post15} />
                  <SnapshotBox title="Post 60m" snapshot={job.postSnapshots?.post60} />
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  <button onClick={() => captureSnapshotForJob(job.id, "pre")} style={btn(false)}>Capture pre now</button>
                  <button onClick={() => captureSnapshotForJob(job.id, "post15")} style={btn(false)}>Capture post15 now</button>
                  <button onClick={() => captureSnapshotForJob(job.id, "post60")} style={btn(false)}>Capture post60 now</button>
                  <button onClick={() => setAutoTrackJobs((items) => items.filter((x) => x.id !== job.id))} style={btn(false)}>Remove</button>
                </div>

                {job.errors?.length > 0 && (
                  <Card style={{ background: "#170a12", borderColor: "#7f1d1d", marginTop: 12 }}>
                    <b style={{ color: C.red }}>Errors:</b>
                    <ul style={{ color: C.muted, marginBottom: 0 }}>
                      {job.errors.slice(-3).map((e, i) => <li key={i}>{safeDate(e.at)}: {e.message}</li>)}
                    </ul>
                  </Card>
                )}

                <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                  <AnalysisBox job={job} postKey="post15" />
                  <AnalysisBox job={job} postKey="post60" />
                </div>
              </Card>
            ))}
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <Title icon="🧭" title="How Auto Tracking Works" sub="Local browser workflow." />
            <ol style={{ color: C.muted, lineHeight: 1.7, paddingLeft: 20 }}>
              <li>Click “Load calendar + create jobs” to create jobs from future Critical/High events.</li>
              <li>Enable auto tracking and keep the app open.</li>
              <li>The app captures a pre-event snapshot if it is running within 2h before the event.</li>
              <li>It captures post-event snapshots around +15m and +60m.</li>
              <li>It compares Gold, DXY and 10Y yield moves to classify the reaction.</li>
            </ol>
          </Card>

          <Card>
            <Title icon="📡" title="Market Snapshot Sources" sub="Best-effort local data." />
            <div style={{ display: "grid", gap: 8, color: C.muted }}>
              <div><b style={{ color: C.text }}>Gold:</b> XAUUSD spot, fallback to gold futures.</div>
              <div><b style={{ color: C.text }}>DXY:</b> Dollar index proxy.</div>
              <div><b style={{ color: C.text }}>10Y:</b> Treasury yield proxy.</div>
              <div><b style={{ color: C.text }}>Real yield:</b> not available intraday in this local version.</div>
            </div>
          </Card>

          <Card style={{ background: "#170a12", borderColor: "#7f1d1d" }}>
            <Title icon="⚠️" title="Production Warning" sub="This is not a server-side scheduler." />
            <p style={{ color: C.muted, lineHeight: 1.7 }}>
              Browser auto tracking only works while the app is open. For reliable capture, this must later move to a backend scheduler/DataOps pipeline.
              In the BI version, capture snapshots through Airflow/API jobs and store them in MinIO/ClickHouse.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  function PostEventReactionTracker() {
    const recentEvents = calendarEvents
      .filter((e) => eventTimeToTimestamp(e) <= Date.now() + 6 * 36e5)
      .sort((a, b) => eventTimeToTimestamp(b) - eventTimeToTimestamp(a))
      .slice(0, 40);

    const [selectedEventId, setSelectedEventId] = useState(recentEvents[0]?.id || "");
    const selectedEvent = calendarEvents.find((e) => e.id === selectedEventId) || recentEvents[0] || calendarEvents[0];

    const [form, setForm] = useState({
      actual: "",
      forecast: "",
      surprise: "auto",
      goldMovePct: "",
      dxyMovePct: "",
      yield10yMoveBp: "",
      realYieldMoveBp: "",
      note: "",
      window: "0-60 minutes after release",
    });

    const analysis = selectedEvent ? analyzePostEventReaction(selectedEvent, form) : null;

    const input = { width: "100%", boxSizing: "border-box", background: C.card2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 10px" };
    const label = { display: "block", color: C.muted, fontSize: 11, marginBottom: 5, fontWeight: 850 };

    const saveReaction = () => {
      if (!selectedEvent || !analysis) return;
      const record = {
        id: `${selectedEvent.id}-${Date.now()}`,
        savedAt: new Date().toISOString(),
        eventId: selectedEvent.id,
        eventName: selectedEvent.name,
        eventDate: selectedEvent.date,
        eventTime: selectedEvent.time,
        category: selectedEvent.category,
        source: selectedEvent.source,
        ...form,
        analysis,
      };
      setReactionRecords((items) => [record, ...items].slice(0, 100));
    };

    const importFromEvent = () => {
      if (!selectedEvent) return;
      setForm((f) => ({
        ...f,
        actual: selectedEvent.actual || f.actual,
        forecast: selectedEvent.forecast || f.forecast,
      }));
    };

    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr .95fr", gap: 16 }}>
        <Card>
          <Title icon="📈" title="Post-Event Reaction Tracker" sub="After CPI/NFP/FOMC/PCE, record actual-vs-forecast and cross-market reaction." />

          <Card style={{ background: "#171008", borderColor: "#92400e", marginBottom: 14 }}>
            <b style={{ color: C.gold }}>Purpose:</b>{" "}
            <span style={{ color: C.muted }}>
              This module does not predict the event. It checks whether the market reaction after the event confirms or rejects the pre-event macro scenario.
            </span>
          </Card>

          <div style={{ marginBottom: 12 }}>
            <label style={label}>Select macro event</label>
            <select style={input} value={selectedEvent?.id || ""} onChange={(e) => setSelectedEventId(e.target.value)}>
              {recentEvents.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.date} {e.time} · {e.name} · {e.importance}
                </option>
              ))}
            </select>
          </div>

          {selectedEvent && (
            <Card style={{ background: C.card2, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
                <div>
                  <h3 style={{ margin: "0 0 6px" }}>{selectedEvent.name}</h3>
                  <div style={{ color: C.muted, fontSize: 12 }}>
                    {selectedEvent.date} · {selectedEvent.time} · {selectedEvent.category} · {selectedEvent.source}
                  </div>
                </div>
                <Badge value={selectedEvent.importance === "Critical" ? "negative" : selectedEvent.importance === "High" ? "warning" : "blue"}>{selectedEvent.importance}</Badge>
              </div>
              <p style={{ color: C.muted, lineHeight: 1.55 }}>{selectedEvent.expectedImpact}</p>
              <button onClick={importFromEvent} style={btn(false)}>Import forecast/actual from calendar</button>
            </Card>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div><label style={label}>Actual value</label><input style={input} value={form.actual} onChange={(e) => setForm({ ...form, actual: e.target.value })} placeholder="e.g., 3.1" /></div>
            <div><label style={label}>Forecast value</label><input style={input} value={form.forecast} onChange={(e) => setForm({ ...form, forecast: e.target.value })} placeholder="e.g., 3.0" /></div>
            <div>
              <label style={label}>Surprise direction</label>
              <select style={input} value={form.surprise} onChange={(e) => setForm({ ...form, surprise: e.target.value })}>
                <option value="auto">auto from actual/forecast</option>
                <option value="hotter-than-expected">hotter-than-expected</option>
                <option value="cooler-than-expected">cooler-than-expected</option>
                <option value="stronger-than-expected">stronger-than-expected</option>
                <option value="weaker-than-expected">weaker-than-expected</option>
                <option value="hawkish">hawkish</option>
                <option value="dovish">dovish</option>
                <option value="in-line">in-line</option>
                <option value="unknown">unknown</option>
              </select>
            </div>
            <div>
              <label style={label}>Reaction window</label>
              <select style={input} value={form.window} onChange={(e) => setForm({ ...form, window: e.target.value })}>
                <option>0-15 minutes after release</option>
                <option>0-60 minutes after release</option>
                <option>same trading session</option>
                <option>next trading day</option>
              </select>
            </div>
          </div>

          <h3 style={{ color: C.gold, marginTop: 18 }}>Observed market reaction</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div><label style={label}>Gold move %</label><input style={input} value={form.goldMovePct} onChange={(e) => setForm({ ...form, goldMovePct: e.target.value })} placeholder="+0.45 or -0.30" /></div>
            <div><label style={label}>DXY move %</label><input style={input} value={form.dxyMovePct} onChange={(e) => setForm({ ...form, dxyMovePct: e.target.value })} placeholder="-0.20 or +0.15" /></div>
            <div><label style={label}>10Y yield move bp</label><input style={input} value={form.yield10yMoveBp} onChange={(e) => setForm({ ...form, yield10yMoveBp: e.target.value })} placeholder="-6 or +8" /></div>
            <div><label style={label}>Real yield move bp</label><input style={input} value={form.realYieldMoveBp} onChange={(e) => setForm({ ...form, realYieldMoveBp: e.target.value })} placeholder="-4 or +5" /></div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={label}>Notes / interpretation</label>
            <textarea style={{ ...input, minHeight: 70 }} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="What happened after the release? Were there revisions? Did yields/DXY confirm gold move?" />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button onClick={saveReaction} style={btn(false)}>Save reaction record</button>
            <button onClick={() => setForm({ actual: "", forecast: "", surprise: "auto", goldMovePct: "", dxyMovePct: "", yield10yMoveBp: "", realYieldMoveBp: "", note: "", window: "0-60 minutes after release" })} style={btn(false)}>Clear form</button>
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ borderColor: `${colorFor(analysis?.alignment === "aligned" ? "supportive" : analysis?.alignment === "divergent" ? "negative" : "warning")}66` }}>
            <Title icon="🧠" title="Reaction Analysis" sub="Actual/forecast + gold/DXY/yields reaction." />
            {analysis ? (
              <>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  <Badge value="warning">surprise: {analysis.surprise}</Badge>
                  <Badge value={analysis.expectedImpact === "supportive" ? "supportive" : analysis.expectedImpact.includes("negative") ? "negative" : "warning"}>expected: {analysis.expectedImpact}</Badge>
                  <Badge value={analysis.observedReaction === "gold-supportive" ? "supportive" : analysis.observedReaction === "gold-negative" ? "negative" : "warning"}>observed: {analysis.observedReaction}</Badge>
                  <Badge value={analysis.alignment === "aligned" ? "supportive" : analysis.alignment === "divergent" ? "negative" : "warning"}>{analysis.alignment}</Badge>
                </div>
                <p style={{ color: C.muted, lineHeight: 1.7 }}>{analysis.interpretation}</p>
                <Card style={{ background: C.card2 }}>
                  <b>Evidence:</b>{" "}
                  <span style={{ color: C.muted }}>{analysis.evidence.length ? analysis.evidence.join(", ") : "No enough market reaction data entered yet."}</span>
                  <div style={{ color: C.muted, marginTop: 6 }}>Observed score: {analysis.observedScore}</div>
                </Card>
              </>
            ) : (
              <p style={{ color: C.muted }}>Select an event and enter reaction data.</p>
            )}
          </Card>

          <Card>
            <Title icon="🗂️" title="Saved Reaction Records" sub="Local records stored in browser localStorage." />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {reactionRecords.length === 0 && <p style={{ color: C.muted }}>No reaction records saved yet.</p>}
              {reactionRecords.slice(0, 12).map((r) => (
                <Card key={r.id} style={{ background: C.card2, borderColor: `${colorFor(r.analysis?.alignment === "aligned" ? "supportive" : r.analysis?.alignment === "divergent" ? "negative" : "warning")}55` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <b>{r.eventName}</b>
                      <div style={{ color: C.muted, fontSize: 12 }}>{r.eventDate} · saved {safeDate(r.savedAt)} · {r.window}</div>
                    </div>
                    <Badge value={r.analysis?.alignment === "aligned" ? "supportive" : r.analysis?.alignment === "divergent" ? "negative" : "warning"}>{r.analysis?.alignment}</Badge>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                    <Badge value="blue">actual {r.actual || "n/a"}</Badge>
                    <Badge value="blue">forecast {r.forecast || "n/a"}</Badge>
                    <Badge value={r.analysis?.observedReaction === "gold-supportive" ? "supportive" : r.analysis?.observedReaction === "gold-negative" ? "negative" : "warning"}>{r.analysis?.observedReaction}</Badge>
                  </div>
                  {r.note && <p style={{ color: C.muted, fontSize: 13 }}>{r.note}</p>}
                  <button onClick={() => setReactionRecords((items) => items.filter((x) => x.id !== r.id))} style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 8px", cursor: "pointer", marginTop: 8 }}>remove</button>
                </Card>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  function EventRiskEngine() {
    const summary = eventRiskSummary;
    const majorEvents = calendarEvents
      .filter((e) => eventTimeToTimestamp(e) >= Date.now() - 36e5)
      .filter((e) => isHighImpactEvent(e) || e.importance === "Watchlist")
      .sort((a, b) => eventTimeToTimestamp(a) - eventTimeToTimestamp(b))
      .slice(0, 12);

    const ChecklistItem = ({ children }) => (
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "9px 0", borderTop: `1px solid ${C.border}` }}>
        <span style={{ color: C.gold }}>✓</span>
        <span style={{ color: C.muted, lineHeight: 1.5 }}>{children}</span>
      </div>
    );

    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr .9fr", gap: 16 }}>
        <Card style={{ borderColor: `${colorFor(summary.color)}66` }}>
          <Title icon="🚨" title="Event Risk Engine" sub="Converts official calendar dates into XAUUSD risk workflow." />
          <div style={{ color: colorFor(summary.color), fontSize: 30, fontWeight: 950 }}>{summary.status}</div>
          <p style={{ color: C.muted, lineHeight: 1.7 }}>{summary.message}</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, margin: "14px 0" }}>
            <Card style={{ background: C.card2 }}>
              <div style={{ color: C.muted, fontSize: 12 }}>Active avoid events</div>
              <div style={{ fontSize: 28, fontWeight: 950, color: summary.activeAvoid.length ? C.red : C.green }}>{summary.activeAvoid.length}</div>
            </Card>
            <Card style={{ background: C.card2 }}>
              <div style={{ color: C.muted, fontSize: 12 }}>Events next 24h</div>
              <div style={{ fontSize: 28, fontWeight: 950 }}>{summary.next24h.length}</div>
            </Card>
            <Card style={{ background: C.card2 }}>
              <div style={{ color: C.muted, fontSize: 12 }}>High/Critical next 72h</div>
              <div style={{ fontSize: 28, fontWeight: 950, color: summary.highNext72h.length ? C.gold : C.green }}>{summary.highNext72h.length}</div>
            </Card>
          </div>

          {summary.nextMajor && (
            <Card style={{ background: C.card2, borderColor: `${colorFor(summary.nextMajor.importance === "Critical" ? "negative" : "warning")}55` }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
                <div>
                  <h3 style={{ margin: "0 0 6px" }}>Next major catalyst: {summary.nextMajor.name}</h3>
                  <div style={{ color: C.muted, fontSize: 12 }}>{summary.nextMajor.date} · {summary.nextMajor.time} · {timeToEventText(summary.nextMajor)} · {summary.nextMajor.source}</div>
                </div>
                <Badge value={summary.nextMajor.importance === "Critical" ? "negative" : "warning"}>{summary.nextMajor.importance}</Badge>
              </div>
              <p style={{ color: C.muted, lineHeight: 1.6 }}>{summary.nextMajor.expectedImpact}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Badge value={isAvoidWindow(summary.nextMajor) ? "warning" : "blue"}>{isAvoidWindow(summary.nextMajor) ? "avoid window active" : summary.nextMajor.avoidWindow}</Badge>
                <Badge value="warning">risk score {getEventRiskScore(summary.nextMajor)}</Badge>
              </div>
            </Card>
          )}

          <Card style={{ background: "#171008", borderColor: "#92400e", marginTop: 14 }}>
            <b style={{ color: C.gold }}>How this should affect trading research:</b>
            <p style={{ color: C.muted, lineHeight: 1.65, marginBottom: 0 }}>
              Event risk is not directional. It does not say gold will rise or fall. It says the reliability of pre-event signals is weaker and volatility can rise sharply.
              Around Critical/High events, the dashboard should shift from “bias seeking” to “scenario planning”.
            </p>
          </Card>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <Title icon="📋" title="Pre-event Research Checklist" sub="Use before CPI, NFP, FOMC, PCE and oil shock events." />
            <ChecklistItem>Check whether the event is inside the active avoid window.</ChecklistItem>
            <ChecklistItem>Write bullish, bearish and neutral scenarios before the release.</ChecklistItem>
            <ChecklistItem>Compare expected gold impact with FRED macro pressure: yields, real yields and dollar index.</ChecklistItem>
            <ChecklistItem>After release, watch actual-vs-forecast and market reaction, not only the headline value.</ChecklistItem>
            <ChecklistItem>Do not let GDELT/social headlines override Treasury-yield and USD reaction.</ChecklistItem>
          </Card>

          <Card>
            <Title icon="🧭" title="Upcoming Major Events" sub="Critical/High/Watchlist items from official calendar." />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {majorEvents.map((e) => {
                const scenario = getEventScenario(e);
                return (
                  <Card key={e.id} style={{ background: C.card2, borderColor: `${colorFor(isAvoidWindow(e) ? "warning" : e.importance === "Critical" ? "negative" : "blue")}55` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div>
                        <b>{e.name}</b>
                        <div style={{ color: C.muted, fontSize: 12 }}>{e.date} · {e.time} · {timeToEventText(e)}</div>
                      </div>
                      <Badge value={e.importance === "Critical" ? "negative" : e.importance === "High" ? "warning" : "blue"}>{e.importance}</Badge>
                    </div>
                    <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.55 }}>
                      <b style={{ color: C.green }}>Gold-supportive scenario:</b> {scenario.upside}
                    </p>
                    <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.55 }}>
                      <b style={{ color: C.red }}>Gold-negative scenario:</b> {scenario.downside}
                    </p>
                    <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.55 }}>
                      <b style={{ color: C.gold }}>Watch:</b> {scenario.watch}
                    </p>
                  </Card>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  function BiasEngine() {
    return (
      <Card style={{ borderColor: `${bias.color}66` }}>
        <Title icon="⚡" title="Explainable Bias Engine" sub="Combines GDELT news pressure and FRED macro pressure." />
        <div style={{ fontSize: 34, fontWeight: 950, color: bias.color }}>{bias.label}</div>
        <p style={{ color: C.muted, lineHeight: 1.7 }}>{bias.text}</p>
        <Card style={{ background: C.card2, borderColor: `${colorFor(eventRiskSummary.color)}55`, marginBottom: 14 }}>
          <b style={{ color: colorFor(eventRiskSummary.color) }}>Calendar risk overlay: {eventRiskSummary.status}</b>
          <p style={{ color: C.muted, marginBottom: 0 }}>{eventRiskSummary.message}</p>
        </Card>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          <Card style={{ background: C.card2 }}>
            <h3>News score</h3>
            <div style={{ fontSize: 30, fontWeight: 950 }}>{newsScore > 0 ? "+" : ""}{newsScore}</div>
            <p style={{ color: C.muted }}>Bullish minus bearish GDELT-classified headlines.</p>
          </Card>
          <Card style={{ background: C.card2 }}>
            <h3>FRED macro score</h3>
            <div style={{ fontSize: 30, fontWeight: 950 }}>{fredScore > 0 ? "+" : ""}{fredScore}</div>
            <p style={{ color: C.muted }}>Supportive minus negative gold-pressure macro drivers.</p>
          </Card>
          <Card style={{ background: C.card2 }}>
            <h3>Total</h3>
            <div style={{ fontSize: 30, fontWeight: 950, color: bias.color }}>{bias.total > 0 ? "+" : ""}{bias.total}</div>
            <p style={{ color: C.muted }}>Research bias only; not a trading instruction.</p>
          </Card>
        </div>
      </Card>
    );
  }




  async function replayRecentCompletedEvents(limit = 5) {
    const targets = calendarUniverse
      .filter((e) => isHighImpactEvent(e))
      .filter((e) => eventTimeToTimestamp(e) + 60 * 60000 <= Date.now())
      .sort((a, b) => eventTimeToTimestamp(b) - eventTimeToTimestamp(a))
      .slice(0, limit);

    if (!targets.length) {
      setReplayStatus("no completed high-impact event is ready for replay");
      return { ok: 0, total: 0 };
    }

    setReplayStatus(`reconstructing ${targets.length} completed event(s)...`);
    let ok = 0;
    for (const event of targets) {
      try {
        const record = await reconstructEventFromHistory(getEnrichedEvent(event));
        setReplayRecords((items) => {
          const withoutSame = items.filter((x) => x.eventId !== event.id);
          return [record, ...withoutSame].slice(0, 100);
        });
        ok += 1;
      } catch (err) {
        setReplayStatus(`some replay failed: ${err.message}`);
      }
    }

    setReplayStatus(`reconstructed ${ok}/${targets.length} completed event(s)`);
    return { ok, total: targets.length };
  }


  function ControlCenter() {
    const [controlStatus, setControlStatus] = useState("ready");
    const model = buildScenarioModel();

    const completedMissingResults = calendarUniverse
      .filter((e) => isHighImpactEvent(e))
      .filter((e) => eventTimeToTimestamp(e) <= Date.now())
      .filter((e) => !getEventResult(e.id)?.actual)
      .sort((a, b) => eventTimeToTimestamp(b) - eventTimeToTimestamp(a));

    const replayReadyEvents = calendarUniverse
      .filter((e) => isHighImpactEvent(e))
      .filter((e) => eventTimeToTimestamp(e) + 60 * 60000 <= Date.now())
      .sort((a, b) => eventTimeToTimestamp(b) - eventTimeToTimestamp(a));

    async function runDailyRefresh() {
      setControlStatus("loading official calendar...");
      await loadGeneratedOfficialCalendar();

      setControlStatus("refreshing FRED macro data...");
      try { await refreshFred(); } catch {}

      setControlStatus("refreshing GDELT news...");
      try { await refreshGdelt(); } catch {}

      setControlStatus("daily refresh finished; review Scenario Lab");
    }

    async function runPostEventUpdate() {
      setControlStatus("running market-reaction replay for completed high-impact events...");
      await replayRecentCompletedEvents(5);
      setControlStatus("post-event market-reaction replay finished; review Scenario Lab. Event Results are optional enrichment only.");
      setTab("scenarioLab");
    }

    function StatusPill({ label, value, status }) {
      return (
        <Card style={{ background: C.card2 }}>
          <div style={{ color: C.muted, fontSize: 12 }}>{label}</div>
          <div style={{ fontSize: 24, fontWeight: 950 }}>{value}</div>
          <Badge value={status}>{status}</Badge>
        </Card>
      );
    }

    function StepCard({ number, title, desc, action, button, secondary }) {
      return (
        <Card style={{ background: C.card2 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "start" }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              background: C.gold,
              color: "#111827",
              display: "grid",
              placeItems: "center",
              fontWeight: 950,
              flexShrink: 0,
            }}>{number}</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: "0 0 6px" }}>{title}</h3>
              <p style={{ color: C.muted, lineHeight: 1.6, marginTop: 0 }}>{desc}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {button && <button onClick={action} style={btn(false)}>{button}</button>}
                {secondary}
              </div>
            </div>
          </div>
        </Card>
      );
    }

    const sourceStatusGood = (health.fred.status === "live" || health.fred.status === "partial") && health.gdelt.status === "live";

    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr .85fr", gap: 16 }}>
        <Card>
          <Title icon="🎛️" title="GoldScope Control Center" sub="Use this page first. It reduces the need to jump across many tabs." />

          <Card style={{ background: "#102016", borderColor: "#166534", marginBottom: 14 }}>
            <b style={{ color: C.green }}>Simplified workflow:</b>{" "}
            <span style={{ color: C.muted }}>
              Most days you only need: Run Daily Refresh → Check Scenario Lab. After a major event passes: Run Post-Event Update. Event Results is optional only.
            </span>
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 14 }}>
            <StatusPill label="Calendar events" value={calendarUniverse.length} status={eventRiskSummary.nextMajor ? "supportive" : "warning"} />
            <StatusPill label="FRED" value={health.fred.status} status={health.fred.status === "live" || health.fred.status === "partial" ? "supportive" : "warning"} />
            <StatusPill label="GDELT" value={health.gdelt.status} status={health.gdelt.status === "live" ? "supportive" : "warning"} />
            <StatusPill label="Replay records" value={replayRecords.length} status={replayRecords.length ? "supportive" : "warning"} />
            <StatusPill label="Scenario confidence" value={`${model.confidence.score}%`} status={model.confidence.score >= 70 ? "supportive" : model.confidence.score >= 45 ? "warning" : "negative"} />
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <StepCard
              number="1"
              title="Daily research refresh"
              desc="Loads the official calendar file, refreshes FRED using cache rules, and refreshes GDELT news if rate limits allow. You do not need to manually open Macro Calendar first."
              action={runDailyRefresh}
              button="Run daily refresh"
              secondary={<button onClick={() => setTab("scenarioLab")} style={btn(false)}>Open Scenario Lab</button>}
            />

            <StepCard
              number="2"
              title="Before a major event"
              desc="Check event risk and scenarios. Do not run Replay before the event; replay only makes sense after the event has passed."
              action={() => setTab("eventRisk")}
              button="Open Event Risk"
              secondary={model.nextMajor && <Badge value="warning">next: {model.nextMajor.name} · {timeToEventText(model.nextMajor)}</Badge>}
            />

            <StepCard
              number="3"
              title="After a major event"
              desc="Run market-reaction replay. It does not require you to manually enter actual/forecast values. Event Results is optional enrichment only."
              action={runPostEventUpdate}
              button="Run post-event update"
              secondary={<button onClick={() => setTab("eventResults")} style={btn(false)}>Optional enrichment</button>}
            />

            <StepCard
              number="4"
              title="Export important records"
              desc="Use this only when you want to preserve local prototype data or prepare samples for the future BI/DataOps platform."
              action={() => setTab("export")}
              button="Open Export / BI"
            />
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ borderColor: `${model.confidence.score >= 70 ? C.green : model.confidence.score >= 45 ? C.gold : C.red}66` }}>
            <Title icon="🧠" title="Current Research State" sub="Scenario + confidence." />
            <div style={{ fontSize: 26, fontWeight: 950, color: model.dominant.includes("Bullish") ? C.green : model.dominant.includes("Bearish") ? C.red : C.gold }}>
              {model.dominant}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <Badge value={model.confidence.score >= 70 ? "supportive" : model.confidence.score >= 45 ? "warning" : "negative"}>{model.confidence.label}</Badge>
              <Badge value="blue">{model.confidence.score}%</Badge>
              <Badge value={sourceStatusGood ? "supportive" : "warning"}>{sourceStatusGood ? "sources ok" : "source warning"}</Badge>
            </div>
            <p style={{ color: C.muted, lineHeight: 1.7 }}>{model.confidence.reason}</p>
          </Card>

          <Card>
            <Title icon="🧭" title="What should I do now?" sub="System recommendation." />
            {replayReadyEvents.length > 0 ? (
              <Card style={{ background: "#171008", borderColor: "#92400e" }}>
                <b style={{ color: C.gold }}>Run market-reaction replay</b>
                <p style={{ color: C.muted, lineHeight: 1.6 }}>
                  Completed high-impact event(s) are available. Run replay reconstruction first. Actual/forecast values are optional enrichment and are not required.
                </p>
                <button onClick={runPostEventUpdate} style={btn(false)}>Run post-event update</button>
              </Card>
            ) : (
              <Card style={{ background: C.card2 }}>
                <b>Review Scenario Lab</b>
                <p style={{ color: C.muted, lineHeight: 1.6 }}>
                  No completed high-impact event is ready for replay right now. Review Scenario Lab and next major catalyst.
                </p>
                <button onClick={() => setTab("scenarioLab")} style={btn(false)}>Open Scenario Lab</button>
              </Card>
            )}
          </Card>

          <Card>
            <Title icon="⚙️" title="Advanced tabs" sub="You usually do not need these every day." />
            <p style={{ color: C.muted, lineHeight: 1.7 }}>
              Macro Calendar is mainly for checking dates. Event Results is optional enrichment, not a required step. Auto Tracker is optional/experimental.
              The normal workflow should start here, in Control Center.
            </p>
          </Card>

          <Card>
            <Title icon="📌" title="Control status" sub="Last orchestration message." />
            <p style={{ color: C.muted, lineHeight: 1.7 }}>{controlStatus}</p>
          </Card>
        </div>
      </div>
    );
  }

  function ScenarioLab() {
    const model = buildScenarioModel();
    const [activeScenario, setActiveScenario] = useState("wait");

    function saveScenarioNote(key, value) {
      setScenarioNotes((prev) => ({
        ...prev,
        [key]: {
          value,
          updatedAt: new Date().toISOString(),
        },
      }));
    }

    function downloadScenarioSnapshot() {
      const payload = {
        exportedAt: new Date().toISOString(),
        appVersion: "GoldScope v2.15",
        type: "scenario-snapshot",
        model,
        scenarioNotes,
        evidence: {
          fredScore,
          newsScore,
          eventRiskSummary,
          latestReplay: model.replaySignal,
          sourceHealth: health,
        },
        disclaimer: "Research workflow only. Not financial advice and not a buy/sell instruction.",
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      a.href = url;
      a.download = `goldscope-scenario-snapshot-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    const scenarioKeys = [
      ["bullish", "Bullish"],
      ["bearish", "Bearish"],
      ["wait", "Wait / Neutral"],
    ];

    const scenario = model.scenarios[activeScenario];

    function ScenarioList({ title, items }) {
      return (
        <Card style={{ background: C.card2 }}>
          <h3 style={{ margin: "0 0 10px", color: C.gold }}>{title}</h3>
          <ul style={{ color: C.muted, lineHeight: 1.7, margin: 0, paddingLeft: 20 }}>
            {items.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </Card>
      );
    }

    const input = { width: "100%", boxSizing: "border-box", background: C.card2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" };

    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr .9fr", gap: 16 }}>
        <Card>
          <Title icon="🧠" title="Scenario Lab" sub="Turns macro, news, event risk and replay evidence into structured research scenarios." />

          <Card style={{ background: "#170a12", borderColor: "#7f1d1d", marginBottom: 14 }}>
            <b style={{ color: C.red }}>Important:</b>{" "}
            <span style={{ color: C.muted }}>
              Scenario Lab is a research framework only. It does not generate buy/sell signals and does not replace risk management.
            </span>
          </Card>

          <Card style={{ background: C.card2, borderColor: `${colorFor(model.dominant.includes("Bullish") ? "supportive" : model.dominant.includes("Bearish") ? "negative" : "warning")}55`, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ color: C.muted, fontSize: 12 }}>Dominant research state</div>
                <div style={{ fontSize: 28, fontWeight: 950, color: model.dominant.includes("Bullish") ? C.green : model.dominant.includes("Bearish") ? C.red : C.gold }}>
                  {model.dominant}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "start" }}>
                <Badge value="supportive">bull {model.scores.bullishScore}</Badge>
                <Badge value="negative">bear {model.scores.bearishScore}</Badge>
                <Badge value="warning">wait {model.scores.waitScore}</Badge>
                <Badge value={model.confidence.score >= 70 ? "supportive" : model.confidence.score >= 45 ? "warning" : "negative"}>
                  {model.confidence.label} · {model.confidence.score}%
                </Badge>
                <Badge value="blue">{model.confidence.evidenceMode}</Badge>
              </div>
            </div>
            <p style={{ color: C.muted, lineHeight: 1.6 }}>
              Macro: <b>{model.macroDirection}</b> · News: <b>{model.newsDirection}</b> · Latest replay: <b>{model.replaySignal?.observedReaction || "none"}</b>
            </p>
            <p style={{ color: C.muted, lineHeight: 1.6, marginBottom: 0 }}>
              Confidence: {model.confidence.reason}
            </p>
          </Card>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {scenarioKeys.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveScenario(key)}
                style={{
                  background: activeScenario === key ? C.gold : C.card2,
                  color: activeScenario === key ? "#111827" : C.text,
                  border: `1px solid ${activeScenario === key ? C.gold : C.border}`,
                  borderRadius: 10,
                  padding: "8px 11px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
            <button onClick={downloadScenarioSnapshot} style={{ ...btn(false), marginLeft: "auto" }}>Export scenario snapshot</button>
          </div>

          <Card style={{ background: C.card2, marginBottom: 14 }}>
            <h2 style={{ margin: "0 0 8px", color: C.gold }}>{scenario.title}</h2>
            <p style={{ color: C.muted, lineHeight: 1.7, margin: 0 }}>{scenario.thesis}</p>
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            <ScenarioList title="Triggers" items={scenario.triggers} />
            <ScenarioList title="Invalidation" items={scenario.invalidation} />
            <ScenarioList title="Watch list" items={scenario.watch} />
          </div>

          <Card style={{ background: C.card2, marginTop: 14 }}>
            <h3 style={{ marginTop: 0, color: C.gold }}>Your scenario notes</h3>
            <textarea
              style={{ ...input, minHeight: 110 }}
              value={scenarioNotes[activeScenario]?.value || ""}
              onChange={(e) => saveScenarioNote(activeScenario, e.target.value)}
              placeholder="Write your reasoning, conditions, invalidation level, chart context, or what you need to verify before trusting this scenario."
            />
            <div style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>
              Last updated: {scenarioNotes[activeScenario]?.updatedAt ? safeDate(scenarioNotes[activeScenario].updatedAt) : "not saved yet"}
            </div>
          </Card>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <Title icon="🚦" title="Decision Gates" sub="Conditions that reduce scenario confidence." />
            {model.gates.length === 0 ? (
              <p style={{ color: C.muted }}>No major warning gate is active.</p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {model.gates.map((g, i) => (
                  <Card key={i} style={{ background: "#171008", borderColor: "#92400e" }}>
                    <b style={{ color: C.gold }}>Gate {i + 1}</b>
                    <p style={{ color: C.muted, marginBottom: 0, lineHeight: 1.55 }}>{g}</p>
                  </Card>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <Title icon="📌" title="Next Major Catalyst" sub="From official event calendar." />
            {model.nextMajor ? (
              <Card style={{ background: C.card2 }}>
                <h3 style={{ margin: "0 0 6px" }}>{model.nextMajor.name}</h3>
                <div style={{ color: C.muted, fontSize: 12 }}>
                  {model.nextMajor.date} · {model.nextMajor.time} · {timeToEventText(model.nextMajor)} · {model.nextMajor.category}
                </div>
                <p style={{ color: C.muted, lineHeight: 1.55 }}>{model.nextMajor.expectedImpact}</p>
                <Badge value={model.nextMajor.importance === "Critical" ? "negative" : "warning"}>{model.nextMajor.importance}</Badge>
              </Card>
            ) : (
              <p style={{ color: C.muted }}>No upcoming major event found.</p>
            )}
          </Card>

          <Card>
            <Title icon="🔁" title="Latest Replay Evidence" sub="Most recent post-event reconstruction." />
            {model.replaySignal ? (
              <Card style={{ background: C.card2 }}>
                <h3 style={{ margin: "0 0 6px" }}>{model.replaySignal.eventName}</h3>
                <div style={{ color: C.muted, fontSize: 12 }}>{model.replaySignal.eventDate} · saved {safeDate(model.replaySignal.savedAt)}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  <Badge value={model.replaySignal.observedReaction === "gold-supportive" ? "supportive" : model.replaySignal.observedReaction === "gold-negative" ? "negative" : "warning"}>
                    {model.replaySignal.observedReaction}
                  </Badge>
                  <Badge value={model.replaySignal.alignment === "aligned" ? "supportive" : model.replaySignal.alignment === "divergent" ? "negative" : "warning"}>
                    {model.replaySignal.alignment}
                  </Badge>
                </div>
                <p style={{ color: C.muted, lineHeight: 1.55 }}>{model.replaySignal.interpretation}</p>
              </Card>
            ) : (
              <p style={{ color: C.muted }}>No replay record yet. Run Event Replay after a completed high-impact event.</p>
            )}
          </Card>

          <Card style={{ background: "#102016", borderColor: "#166534" }}>
            <Title icon="✅" title="Workflow" sub="Recommended order." />
            <ol style={{ color: C.muted, lineHeight: 1.7, paddingLeft: 20 }}>
              <li>Check Macro Calendar and Event Risk.</li>
              <li>Run Event Replay after release.</li>
              <li>Optionally enrich Event Results if official actual/forecast data is available.</li>
              <li>Use Scenario Lab to compare bullish/bearish/wait cases.</li>
              <li>Export scenario snapshot for future BI migration.</li>
            </ol>
          </Card>
        </div>
      </div>
    );
  }

  function ExportAndBIMigration() {
    function makeExportPayload(type = "full") {
      const base = {
        exportedAt: new Date().toISOString(),
        appVersion: "GoldScope v2.15",
        prototypeBoundary: "Local browser prototype. Jobs/replay should move to BI/DataOps for production.",
        type,
      };

      const sections = {
        calendarEvents,
        eventRiskSummary,
        replayRecords,
        reactionRecords,
        eventResults,
        scenarioNotes,
        autoTrackJobs,
        fredRows,
        news,
        sourceHealth: health,
        settings: {
          ...settings,
          fredApiKey: settings.fredApiKey ? "[REDACTED]" : "",
        },
      };

      if (type === "calendar") return { ...base, calendarEvents };
      if (type === "replay") return { ...base, replayRecords };
      if (type === "reactions") return { ...base, reactionRecords };
      if (type === "event-results") return { ...base, eventResults };
      if (type === "scenario-notes") return { ...base, scenarioNotes };
      if (type === "jobs") return { ...base, autoTrackJobs };
      if (type === "source-health") return { ...base, sourceHealth: health };
      return { ...base, ...sections };
    }

    function downloadJson(type) {
      const payload = makeExportPayload(type);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      a.href = url;
      a.download = `goldscope-${type}-export-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    async function copyPayload(type) {
      const payload = makeExportPayload(type);
      try {
        await navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
      } catch {
        // Clipboard can fail in some browsers; download remains available.
      }
    }

    const exportCards = [
      {
        key: "full",
        title: "Full prototype export",
        desc: "Calendar, replay records, manual reaction records, auto jobs, FRED rows, news, and source health.",
        count: calendarEvents.length + replayRecords.length + reactionRecords.length + autoTrackJobs.length,
      },
      {
        key: "calendar",
        title: "Calendar events",
        desc: "Official macro calendar events that later become backend event jobs.",
        count: calendarEvents.length,
      },
      {
        key: "replay",
        title: "Replay records",
        desc: "Reconstructed before/after event-reaction records.",
        count: replayRecords.length,
      },
      {
        key: "reactions",
        title: "Manual reaction records",
        desc: "Post-event manual/audit records saved in the browser.",
        count: reactionRecords.length,
      },
      {
        key: "event-results",
        title: "Event results",
        desc: "Actual, forecast, previous, surprise and notes for macro events.",
        count: Object.keys(eventResults || {}).length,
      },
      {
        key: "scenario-notes",
        title: "Scenario notes",
        desc: "Bullish, bearish and wait/neutral scenario notes.",
        count: Object.keys(scenarioNotes || {}).length,
      },
      {
        key: "jobs",
        title: "Auto tracker jobs",
        desc: "Browser-created job objects; useful as schema examples for BI job tables.",
        count: autoTrackJobs.length,
      },
      {
        key: "source-health",
        title: "Source health",
        desc: "Current availability state for GDELT, FRED, TradingView and other sources.",
        count: Object.keys(health).length,
      },
    ];

    const biTables = [
      ["calendar_events", "Official macro events and source metadata"],
      ["event_reaction_jobs", "Scheduled jobs generated from calendar events"],
      ["market_snapshot_points", "T-1d/T-4h/T-1h/T-15m/T+15m/T+60m/T+4h/T+1d points"],
      ["event_reaction_analysis", "Gold/DXY/10Y moves, classification and alignment"],
      ["source_health", "Provider availability, errors, refresh timestamps"],
      ["job_runs", "Airflow/DataOps execution history"],
    ];

    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr .85fr", gap: 16 }}>
        <Card>
          <Title icon="📦" title="Export Center" sub="Keep the local prototype useful while preparing the BI/DataOps migration." />

          <Card style={{ background: "#171008", borderColor: "#92400e", marginBottom: 14 }}>
            <b style={{ color: C.gold }}>Prototype rule:</b>{" "}
            <span style={{ color: C.muted }}>
              This React app can keep testing the workflow, but browser state is not a durable data platform. Export important records regularly.
            </span>
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            {exportCards.map((card) => (
              <Card key={card.key} style={{ background: C.card2 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
                  <div>
                    <h3 style={{ margin: "0 0 6px" }}>{card.title}</h3>
                    <p style={{ color: C.muted, lineHeight: 1.55, margin: 0 }}>{card.desc}</p>
                  </div>
                  <Badge value="blue">{card.count}</Badge>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  <button onClick={() => downloadJson(card.key)} style={btn(false)}>Download JSON</button>
                  <button onClick={() => copyPayload(card.key)} style={btn(false)}>Copy JSON</button>
                </div>
              </Card>
            ))}
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <Title icon="🏗️" title="BI Migration Boundary" sub="What stays in GoldScope vs what moves to BI." />
            <div style={{ display: "grid", gap: 10 }}>
              <Card style={{ background: C.card2, borderColor: `${C.green}55` }}>
                <b style={{ color: C.green }}>Keep in GoldScope UI</b>
                <p style={{ color: C.muted, lineHeight: 1.6 }}>
                  TradingView embed, research views, scenario explanations, bias visualization, replay result display, manual notes.
                </p>
              </Card>
              <Card style={{ background: C.card2, borderColor: `${C.gold}55` }}>
                <b style={{ color: C.gold }}>Move later to BI/DataOps</b>
                <p style={{ color: C.muted, lineHeight: 1.6 }}>
                  Calendar ingestion, event jobs, market snapshots, GDELT/FRED schedules, replay computation, source health, durable storage.
                </p>
              </Card>
            </div>
          </Card>

          <Card>
            <Title icon="🧱" title="Future BI Tables" sub="Target tables for the later platform." />
            <div style={{ display: "grid", gap: 8 }}>
              {biTables.map(([name, desc]) => (
                <Card key={name} style={{ background: C.card2 }}>
                  <b style={{ color: C.gold }}>{name}</b>
                  <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>{desc}</div>
                </Card>
              ))}
            </div>
          </Card>

          <Card style={{ background: "#102016", borderColor: "#166534" }}>
            <Title icon="✅" title="Current Project Direction" sub="Continue locally, migrate later." />
            <p style={{ color: C.muted, lineHeight: 1.7, marginBottom: 0 }}>
              For now, continue improving GoldScope as a local research product. Do not over-engineer backend infrastructure here.
              Use exports as a bridge until the BI/DataOps platform takes over durable jobs and storage.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  function SourceHealth({ compact = false }) {
    return (
      <Card>
        <Title icon="📡" title="Source Health" sub={compact ? "" : "Live, fallback, missing-key and partial states."} />
        {Object.entries(health).map(([name, h]) => (
          <div key={name} style={{
            display: "grid",
            gridTemplateColumns: compact ? "1fr auto" : "150px 120px 1fr 180px",
            gap: 10,
            alignItems: "center",
            borderTop: `1px solid ${C.border}`,
            padding: "10px 0",
          }}>
            <b style={{ textTransform: "uppercase", fontSize: 12 }}>{name}</b>
            <Badge value={h.status}>{h.status}</Badge>
            {!compact && <span style={{ color: C.muted }}>{h.message}</span>}
            {!compact && <span style={{ color: C.muted, fontSize: 12 }}>{safeDate(h.lastFetch)}</span>}
          </div>
        ))}
      </Card>
    );
  }

  function Settings() {
    const update = (k, v) => setSettings((s) => ({ ...s, [k]: v }));
    const input = { width: "100%", boxSizing: "border-box", background: C.card2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" };
    const label = { display: "block", color: C.muted, fontSize: 12, marginBottom: 6, fontWeight: 850 };

    return (
      <Card>
        <Title icon="⚙️" title="Settings" sub="FRED key can be loaded from public/config/fred_api_key.txt for local use." />
        <Card style={{ background: "#171008", borderColor: "#92400e", marginBottom: 14 }}>
          <b style={{ color: C.gold }}>Security note:</b>{" "}
          <span style={{ color: C.muted }}>Reading the key from a public file is convenient for local personal testing, but it still exposes the key to the local browser. For production, use a backend/serverless proxy.</span>
        </Card>
        <Card style={{ background: C.card2, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <b>FRED key file:</b>{" "}
              <code style={{ color: C.gold }}>{FRED_KEY_FILE_PATH}</code>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>Status: {fredKeyFileStatus}</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={btn(false)} onClick={() => loadFredKeyFromFile({ force: true })}>Reload key from file</button>
              <button style={btn(false)} onClick={() => {
                localStorage.removeItem(KEYS.fredCache);
                localStorage.removeItem(KEYS.fredLastFetch);
                setHealth((h) => ({ ...h, fred: { ...h.fred, message: "FRED cache cleared. Click Refresh FRED when ready." } }));
              }}>Clear FRED cache</button>
            </div>
          </div>
        </Card>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          <div><label style={label}>FRED API Key</label><input style={input} value={settings.fredApiKey} onChange={(e) => update("fredApiKey", e.target.value)} placeholder="Loaded from file or paste manually" /></div>
          <div><label style={label}>GDELT Query</label><input style={input} value={settings.gdeltQuery} onChange={(e) => update("gdeltQuery", e.target.value)} /></div>
          <div><label style={label}>GDELT Timespan</label><select style={input} value={settings.gdeltTimespan} onChange={(e) => update("gdeltTimespan", e.target.value)}><option value="1d">1d</option><option value="3d">3d</option><option value="7d">7d</option><option value="30d">30d</option></select></div>
          <div><label style={label}>GDELT Max Records</label><input type="number" min="3" max="50" style={input} value={settings.gdeltMaxRecords} onChange={(e) => update("gdeltMaxRecords", e.target.value)} /></div>
        </div>
      </Card>
    );
  }

  const views = {
    control: <ControlCenter />,
    overview: <Overview />,
    chart: <TradingViewChart />,
    news: <NewsPanel />,
    macro: <MacroDrivers />,
    calendar: <Calendar />,
    eventRisk: <EventRiskEngine />,
    eventResults: <EventResultsCenter />,
    eventReplay: <EventReplayTracker />,
    autoPostEvent: <AutoPostEventTracker />,
    postEvent: <PostEventReactionTracker />,
    bias: <BiasEngine />,
    scenarioLab: <ScenarioLab />,
    health: <SourceHealth />,
    export: <ExportAndBIMigration />,
    settings: <Settings />,
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "Inter, ui-sans-serif, system-ui, Arial" }}>
      <style>{`
        body { margin: 0; background: ${C.bg}; }
        button:hover { filter: brightness(1.06); }
        a { color: ${C.gold}; text-decoration: none; font-weight: 800; }
        @media (max-width: 1000px) {
          .layout-note { display: none; }
        }
      `}</style>
      <header style={{ position: "sticky", top: 0, zIndex: 20, background: "#080d16ef", backdropFilter: "blur(10px)", borderBottom: `1px solid ${C.border}`, padding: "14px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 26 }}>⚜️</span>
              <strong style={{ color: C.gold, fontSize: 23 }}>GoldScope v2.15</strong>
              <Badge value="warning">Gold-only</Badge>
              <Badge value={health.gdelt.status}>GDELT {health.gdelt.status}</Badge>
              <Badge value={health.fred.status}>FRED {health.fred.status}</Badge>
              <Badge value={bias.color === C.green ? "bullish" : bias.color === C.red ? "bearish" : "warning"}>{bias.label.replace("Research bias: ", "")}</Badge>
            </div>
            <p style={{ color: C.muted, margin: "7px 0 0", fontSize: 13 }}>
              XAUUSD research terminal · TradingView chart · GDELT news · stable FRED macro drivers · market reaction first workflow fixed · no broker connection · no auto-trading
            </p>
          </div>
          <div className="layout-note" style={{ display: "flex", gap: 8 }}>
            <button style={btn(loadingGdelt || gdeltWait > 0)} disabled={loadingGdelt || gdeltWait > 0} onClick={refreshGdelt}>{loadingGdelt ? "GDELT..." : gdeltWait > 0 ? `GDELT ${gdeltWait}s` : "Refresh GDELT"}</button>
            <button style={btn(loadingFred || fredWait > 0)} disabled={loadingFred || fredWait > 0} onClick={refreshFred}>{loadingFred ? "FRED..." : fredWait > 0 ? `FRED ${fredWait}s` : "Refresh FRED"}</button>
          </div>
        </div>
        <nav style={{ display: "flex", gap: 6, overflowX: "auto", marginTop: 14 }}>
          {tabs.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              background: tab === id ? `${C.gold}18` : "transparent",
              color: tab === id ? C.gold : C.muted,
              border: `1px solid ${tab === id ? `${C.gold}55` : "transparent"}`,
              borderRadius: 10,
              padding: "9px 10px",
              fontWeight: 900,
              whiteSpace: "nowrap",
              cursor: "pointer",
            }}>{label}</button>
          ))}
        </nav>
      </header>
      <main style={{ maxWidth: 1450, margin: "0 auto", padding: 18 }}>
        <Card style={{ background: "#170a12", borderColor: "#7f1d1d", marginBottom: 16 }}>
          <b style={{ color: C.red }}>Important:</b>{" "}
          <span style={{ color: C.muted }}>Research software only. No financial advice, no broker connection, no automatic trading. XAUUSD can be highly volatile.</span>
        </Card>
        {views[tab]}
      </main>
    </div>
  );
}
