
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
  gdeltQuery: '("gold" OR "XAUUSD") AND ("federal reserve" OR "FOMC" OR "treasury yield" OR "real yield" OR "dollar index" OR "DXY" OR "inflation" OR "CPI" OR "PCE" OR "payrolls" OR "NFP" OR "interest rate" OR "rate cut" OR "rate hike" OR "geopolitical" OR "central bank" OR "safe haven") sourcelang:english',
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
    explanation: "Rising 10Y yield increases the opportunity cost of holding gold. When nominal yields climb alongside real yields, gold typically faces headwinds.",
  },
  {
    id: "DGS2",
    title: "US 2Y Treasury Yield",
    group: "Rates",
    mode: "level",
    unit: "%",
    goldRule: "inverse",
    explanation: "2Y yield is the most sensitive barometer of near-term Fed expectations. Rising 2Y signals tighter policy pricing, usually USD-positive and gold-negative.",
  },
  {
    id: "DFII10",
    title: "10Y Real Yield Proxy (TIPS)",
    group: "Real yields",
    mode: "level",
    unit: "%",
    goldRule: "inverse",
    explanation: "Real yield is the single most important macro driver for gold. Rising real yields make gold relatively unattractive; falling real yields support gold.",
  },
  {
    id: "DFF",
    title: "Effective Fed Funds Rate",
    group: "Policy rate",
    mode: "level",
    unit: "%",
    goldRule: "inverse_slow",
    explanation: "Higher-for-longer Fed funds supports USD and Treasury yields. A cut cycle is gold-supportive; a hike cycle or higher-for-longer is gold-negative.",
  },
  {
    id: "CPIAUCSL",
    title: "Headline CPI YoY",
    group: "Inflation",
    mode: "yoy",
    unit: "% YoY",
    goldRule: "inflation",
    explanation: "Inflation hedge demand can support gold, but hot CPI can also trigger hawkish Fed repricing and higher real yields.",
  },
  {
    id: "CPILFESL",
    title: "Core CPI YoY",
    group: "Inflation",
    mode: "yoy",
    unit: "% YoY",
    goldRule: "inflation",
    explanation: "Core CPI is a Fed-sensitive inflation signal. Cooling core CPI can support gold via easier Fed expectations and lower real yields.",
  },
  {
    id: "PCEPI",
    title: "PCE Inflation YoY",
    group: "Inflation",
    mode: "yoy",
    unit: "% YoY",
    goldRule: "inflation",
    explanation: "PCE is the Fed preferred inflation gauge. Lower PCE can reduce yield pressure and support gold through easier financial conditions.",
  },
  {
    id: "PCEPILFE",
    title: "Core PCE YoY",
    group: "Inflation",
    mode: "yoy",
    unit: "% YoY",
    goldRule: "inflation",
    explanation: "Core PCE is the most Fed-sensitive inflation signal. Cooling core PCE is one of the clearest paths to rate-cut expectations.",
  },
  {
    id: "UNRATE",
    title: "Unemployment Rate",
    group: "Labor",
    mode: "level",
    unit: "%",
    goldRule: "unemployment",
    explanation: "Rising unemployment can increase rate-cut expectations, lower yields, and support gold. Falling unemployment in a tight labor market is usually gold-negative.",
  },
  {
    id: "PAYEMS",
    title: "Nonfarm Payrolls",
    group: "Labor",
    mode: "level",
    unit: "thousand",
    goldRule: "payrolls",
    explanation: "Strong payroll growth supports higher-for-longer, lifts USD and yields, and pressures gold. Weak payrolls support gold through rate-cut expectations.",
  },
  {
    id: "DTWEXBGS",
    title: "Nominal Broad US Dollar Index",
    group: "Dollar",
    mode: "level",
    unit: "index",
    goldRule: "inverse",
    explanation: "Gold is priced in USD. A stronger dollar usually pressures XAUUSD; a weaker dollar is usually gold-supportive.",
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

function buildReplayRecord(event, seriesMap, windowLabel = "Real GoldScope Context Prompt fixed") {
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
    window: "Real GoldScope Context Prompt fixed",
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


const RETAIL_NOISE_PATTERNS = [
  /gold rate today/i,
  /\d{1,2}k gold/i,
  /city.?wise/i,
  /dubai.*gold|gold.*dubai/i,
  /saudi.*gold|gold.*saudi/i,
  /india.*gold rate|gold rate.*india/i,
  /uae.*gold|gold.*uae/i,
  /qatar.*gold|gold.*qatar/i,
  /oman.*gold|gold.*oman/i,
  /should you buy.*gold/i,
  /gold.*cheaper in/i,
  /bullion.*near record high.*buy/i,
  /\(otcmkts:/i,
  /trading (up|down) \d+%/i,
  /analyst.*rating/i,
  /stock.*target price/i,
  /gold corporation|gold mining.*inc/i,
  /kinross|barrick|newmont|agnico|wheaton|pan american/i,
];

const HIGH_TIER_DOMAINS = [
  "reuters.com", "bloomberg.com", "ft.com", "wsj.com", "marketwatch.com",
  "cnbc.com", "federalreserve.gov", "bls.gov", "bea.gov", "eia.gov",
  "treasury.gov", "bis.org", "imf.org", "worldbank.org", "ecb.europa.eu",
];

const LOW_TIER_DOMAINS = [
  "insidermonkey.com", "newsx.com", "dailypolitical.com", "otcmkts",
  "seekingalpha.com", "zerohedge.com", "goldprice.org", "kitco.com",
];

const MACRO_GOLD_DRIVERS = {
  fed: /fed\b|federal reserve|fomc|powell|rate (cut|hike|hold|pause)|hawkish|dovish|dot plot|monetary policy/i,
  yields: /treasury yield|10.year yield|2.year yield|real yield|tips|yield curve|bond (market|sell)/i,
  dollar: /dollar index|dxy|usd (strength|weakness|rally|drop)|dollar (rallies|falls|weakens|strengthens)/i,
  inflation: /\bcpi\b|consumer price|pce|core inflation|inflation (data|report|print|expectations)|disinflation|deflation/i,
  labor: /nonfarm payroll|nfp|employment (report|data|situation)|unemployment|jobless|labor market|payrolls/i,
  geopolitical: /geopolit|war|conflict|sanctions|middle east|safe haven|risk off|flight to safety/i,
  centralBank: /central bank (buying|reserves)|gold reserves|china.*gold|russia.*gold/i,
  etf: /gold etf|gld\b|iau\b|etf (inflow|outflow)|fund flow/i,
};

function isRetailNoise(article) {
  const titleRaw = String(article.title || "");
  const source = String(article.domain || article.source || "").toLowerCase();
  const isLowTier = LOW_TIER_DOMAINS.some((s) => source.includes(s));
  const hasRetailTitle = RETAIL_NOISE_PATTERNS.some((p) => p.test(titleRaw));
  const hasMacroDriver = Object.values(MACRO_GOLD_DRIVERS).some((p) => p.test(titleRaw));
  if (isLowTier && hasRetailTitle) return true;
  if (hasRetailTitle && !hasMacroDriver) return true;
  return false;
}


// ─── v2.31 RATE LIMIT + VALIDATION HELPERS ───────────────────────────────────
const RATE_LIMIT_MIN_INTERVAL_MS = {
  fred: 1200,
  gdelt: 5500,
};

const LAST_REQUEST_AT_KEY = {
  fred: "goldscope.v2.rateLimit.fred.lastRequestAt",
  gdelt: "goldscope.v2.rateLimit.gdelt.lastRequestAt",
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readTs(key) {
  const n = Number(localStorage.getItem(key) || 0);
  return Number.isFinite(n) ? n : 0;
}

async function rateLimitGuard(provider, extraMs = 0) {
  const key = LAST_REQUEST_AT_KEY[provider];
  const minInterval = (RATE_LIMIT_MIN_INTERVAL_MS[provider] || 1000) + extraMs;
  if (!key) return;

  const last = readTs(key);
  const now = Date.now();
  const wait = Math.max(0, minInterval - (now - last));
  if (wait > 0) await sleep(wait);
  localStorage.setItem(key, String(Date.now()));
}

function isHttp429Error(errOrText) {
  const s = String(errOrText?.message || errOrText || "").toLowerCase();
  return s.includes("429") || s.includes("too many requests") || s.includes("rate limit");
}

function cleanAiArtifacts(text) {
  return String(text || "")
    .replace(/^\s*器材\s*/g, "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .trim();
}

function extractIsoDatesFromSnapshot(snapshot) {
  const dates = new Set();
  function visit(x) {
    if (!x || typeof x !== "object") return;
    for (const [k, v] of Object.entries(x)) {
      if ((k === "date" || k.toLowerCase().includes("date")) && typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
        dates.add(v);
      } else if (typeof v === "object") {
        visit(v);
      }
    }
  }
  visit(snapshot);
  return dates;
}


function isMiningCompanyOrEquityNews(item) {
  const title = String(item?.title || "").toLowerCase();
  const source = String(item?.source || "").toLowerCase();
  const combined = `${title} ${source}`;

  const equityTerms = [
    "otcmkts",
    "nasdaq",
    "nyse",
    "tsx",
    "stock",
    "shares",
    "trading down",
    "trading up",
    "analyst rating",
    "price target",
    "corporation",
    "inc.",
    "limited",
  ];

  const miningNames = [
    "kinross",
    "victoria gold",
    "barrick",
    "newmont",
    "agnico",
    "wheaton",
    "pan american",
    "franco-nevada",
    "gold fields",
    "anglogold",
    "yamana",
    "royal gold",
  ];

  return equityTerms.some((t) => combined.includes(t)) || miningNames.some((n) => combined.includes(n));
}

function snapshotHasSpotOrTechnicalPrice(snapshot) {
  if (snapshot?.technicalContext?.status === "available") return true;
  const raw = JSON.stringify(snapshot || {}).toLowerCase();
  return (
    raw.includes("spotprice") ||
    raw.includes("xauusdprice") ||
    raw.includes("currentprice") ||
    raw.includes('"support"') ||
    raw.includes('"resistance"') ||
    raw.includes("pricelevel")
  );
}


function sma(values, period) {
  if (!Array.isArray(values) || values.length < period) return null;
  const slice = values.slice(-period).filter((v) => Number.isFinite(v));
  if (slice.length < period) return null;
  return slice.reduce((a, b) => a + b, 0) / period;
}

function ema(values, period) {
  if (!Array.isArray(values) || values.length < period) return null;
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length < period) return null;
  const k = 2 / (period + 1);
  let current = clean.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < clean.length; i++) {
    current = clean[i] * k + current * (1 - k);
  }
  return current;
}

function rsi(values, period = 14) {
  const clean = (values || []).filter((v) => Number.isFinite(v));
  if (clean.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = clean.length - period; i < clean.length; i++) {
    const diff = clean[i] - clean[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function atr(candles, period = 14) {
  const c = Array.isArray(candles) ? candles.filter((x) =>
    Number.isFinite(x.high) && Number.isFinite(x.low) && Number.isFinite(x.close)
  ) : [];
  if (c.length < period + 1) return null;
  const trs = [];
  for (let i = 1; i < c.length; i++) {
    const high = c[i].high;
    const low = c[i].low;
    const prevClose = c[i - 1].close;
    trs.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
  }
  const slice = trs.slice(-period);
  if (slice.length < period) return null;
  return slice.reduce((a, b) => a + b, 0) / period;
}

function round2(x) {
  return Number.isFinite(x) ? Math.round(x * 100) / 100 : null;
}

function classifyTrend(price, ema20, ema50, ema200) {
  if (![price, ema20, ema50].every(Number.isFinite)) return "unknown";
  if (Number.isFinite(ema200)) {
    if (price > ema20 && ema20 > ema50 && ema50 > ema200) return "bullish";
    if (price < ema20 && ema20 < ema50 && ema50 < ema200) return "bearish";
  }
  if (price > ema20 && ema20 > ema50) return "mild-bullish";
  if (price < ema20 && ema20 < ema50) return "mild-bearish";
  return "neutral/range";
}

function classifyMomentum(rsi14, price, prevPrice) {
  if (!Number.isFinite(rsi14)) return "unknown";
  const direction = Number.isFinite(price) && Number.isFinite(prevPrice) ? price - prevPrice : 0;
  if (rsi14 >= 70) return direction >= 0 ? "overbought-positive" : "overbought-fading";
  if (rsi14 <= 30) return direction <= 0 ? "oversold-negative" : "oversold-rebounding";
  if (rsi14 > 55) return "positive";
  if (rsi14 < 45) return "negative";
  return "neutral";
}

function estimateSupportResistance(candles, lookback = 60) {
  const c = Array.isArray(candles) ? candles.filter((x) =>
    Number.isFinite(x.high) && Number.isFinite(x.low)
  ) : [];
  const slice = c.slice(-lookback);
  if (slice.length < 10) return { support: [], resistance: [] };
  const lows = slice.map((x) => x.low).sort((a, b) => a - b);
  const highs = slice.map((x) => x.high).sort((a, b) => b - a);
  const support = [...new Set(lows.slice(0, 3).map(round2))].filter(Number.isFinite);
  const resistance = [...new Set(highs.slice(0, 3).map(round2))].filter(Number.isFinite);
  return { support, resistance };
}


function median(values) {
  const clean = (values || []).filter(Number.isFinite).sort((a, b) => a - b);
  if (!clean.length) return null;
  const mid = Math.floor(clean.length / 2);
  return clean.length % 2 ? clean[mid] : (clean[mid - 1] + clean[mid]) / 2;
}

function percentile(values, p) {
  const clean = (values || []).filter(Number.isFinite).sort((a, b) => a - b);
  if (!clean.length) return null;
  const idx = Math.min(clean.length - 1, Math.max(0, Math.round((p / 100) * (clean.length - 1))));
  return clean[idx];
}

function technicalSymbolMeta(symbol) {
  const s = String(symbol || "").toUpperCase();
  if (s.includes("XAUUSD")) {
    return {
      instrument: "XAUUSD",
      proxy: "Spot gold proxy from Yahoo symbol XAUUSD=X.",
      expectedPriceMin: 500,
      expectedPriceMax: 8000,
      maxSingleCandleReturn: 0.12,
      preferred: true,
    };
  }
  if (s.includes("GC=F") || s.includes("GC")) {
    return {
      instrument: "GC futures",
      proxy: "Gold futures proxy for XAUUSD; not direct spot XAUUSD.",
      expectedPriceMin: 500,
      expectedPriceMax: 8000,
      maxSingleCandleReturn: 0.15,
      preferred: false,
    };
  }
  return {
    instrument: "gold proxy",
    proxy: "Gold price proxy.",
    expectedPriceMin: 500,
    expectedPriceMax: 8000,
    maxSingleCandleReturn: 0.15,
    preferred: false,
  };
}

function sanitizeCandles(candles, symbol = "XAUUSD=X") {
  const meta = technicalSymbolMeta(symbol);
  const raw = Array.isArray(candles) ? candles : [];
  const normalized = raw
    .map((x) => ({
      time: x.time || x.date || "",
      open: Number(x.open),
      high: Number(x.high),
      low: Number(x.low),
      close: Number(x.close),
    }))
    .filter((x) =>
      Number.isFinite(x.open) &&
      Number.isFinite(x.high) &&
      Number.isFinite(x.low) &&
      Number.isFinite(x.close) &&
      x.open > 0 &&
      x.high > 0 &&
      x.low > 0 &&
      x.close > 0 &&
      x.high >= x.low &&
      x.high >= Math.min(x.open, x.close) &&
      x.low <= Math.max(x.open, x.close)
    )
    .sort((a, b) => String(a.time).localeCompare(String(b.time)));

  const closeMedian = median(normalized.map((x) => x.close));
  const p10 = percentile(normalized.map((x) => x.close), 10);
  const p90 = percentile(normalized.map((x) => x.close), 90);
  const issues = [];

  if (raw.length && normalized.length / raw.length < 0.85) {
    issues.push("many_invalid_ohlc_removed");
  }

  if (!Number.isFinite(closeMedian)) {
    return { candles: [], issues: ["no_valid_candles"], qualityScore: 0, meta };
  }

  let filtered = normalized.filter((x) => {
    if (x.close < meta.expectedPriceMin || x.close > meta.expectedPriceMax) return false;
    if (x.low < meta.expectedPriceMin * 0.5 || x.high > meta.expectedPriceMax * 1.25) return false;
    if (closeMedian && (x.close / closeMedian > 1.6 || x.close / closeMedian < 0.625)) return false;
    return true;
  });

  if (filtered.length < normalized.length * 0.9) {
    issues.push("outlier_price_candles_removed");
  }

  // Remove discontinuity outliers against previous accepted close.
  const continuity = [];
  for (const x of filtered) {
    const prev = continuity[continuity.length - 1];
    if (!prev) {
      continuity.push(x);
      continue;
    }
    const ret = Math.abs(x.close - prev.close) / Math.max(Math.abs(prev.close), 1);
    if (ret <= meta.maxSingleCandleReturn) {
      continuity.push(x);
    } else {
      issues.push("large_discontinuity_candle_removed");
    }
  }

  filtered = continuity;

  const last = filtered[filtered.length - 1];
  if (last && closeMedian) {
    const ratio = last.close / closeMedian;
    if (ratio > 1.45 || ratio < 0.69) {
      issues.push("last_price_far_from_series_median");
    }
  }

  if (p10 && p90 && p90 / Math.max(p10, 1) > 2.2) {
    issues.push("wide_price_distribution_possible_bad_history");
  }

  const qualityScore = Math.max(0, Math.min(100,
    100
    - issues.length * 18
    - (filtered.length < 80 ? 25 : 0)
    - (filtered.length < 30 ? 35 : 0)
  ));

  return {
    candles: filtered,
    issues: [...new Set(issues)],
    qualityScore,
    rawCount: raw.length,
    cleanCount: filtered.length,
    meta,
  };
}

function technicalSourceQualityLabel(qualityScore, issues = []) {
  if (qualityScore >= 75 && !issues.length) return "good";
  if (qualityScore >= 60) return "usable";
  if (qualityScore >= 40) return "weak";
  return "bad";
}


function resampleCandles(candles, bucketHours = 4) {
  const c = (candles || [])
    .filter((x) => x && Number.isFinite(x.open) && Number.isFinite(x.high) && Number.isFinite(x.low) && Number.isFinite(x.close) && x.time)
    .sort((a, b) => new Date(a.time) - new Date(b.time));

  const buckets = new Map();
  for (const x of c) {
    const d = new Date(x.time);
    if (Number.isNaN(d.getTime())) continue;
    const bucket = new Date(d);
    bucket.setUTCMinutes(0, 0, 0);
    const h = bucket.getUTCHours();
    bucket.setUTCHours(Math.floor(h / bucketHours) * bucketHours);
    const key = bucket.toISOString();
    if (!buckets.has(key)) {
      buckets.set(key, { time: key, open: x.open, high: x.high, low: x.low, close: x.close });
    } else {
      const b = buckets.get(key);
      b.high = Math.max(b.high, x.high);
      b.low = Math.min(b.low, x.low);
      b.close = x.close;
    }
  }
  return [...buckets.values()].sort((a, b) => new Date(a.time) - new Date(b.time));
}

function scoreTechnicalTimeframe(tf) {
  if (!tf) return 0;
  let s = 0;
  const trend = String(tf.trend || "").toLowerCase();
  const momentum = String(tf.momentum || "").toLowerCase();
  const px = String(tf.priceVsEMA200 || "").toLowerCase();
  if (trend.includes("bullish")) s += 2;
  if (trend.includes("bearish")) s -= 2;
  if (momentum.includes("positive")) s += 1;
  if (momentum.includes("negative")) s -= 1;
  if (px === "above") s += 1;
  if (px === "below") s -= 1;
  const expanded = Number(tf.expandedIndicatorScore);
  if (Number.isFinite(expanded)) s += Math.max(-2, Math.min(2, expanded));
  return s;
}

function labelFromTechnicalScore(score) {
  if (score >= 4) return "bullish";
  if (score <= -4) return "bearish";
  if (score > 0) return "mild-bullish";
  if (score < 0) return "mild-bearish";
  return "neutral";
}

function buildMultiTimeframeSummary(timeframes) {
  const entries = Object.entries(timeframes || {});
  const items = entries.map(([tf, block]) => ({
    timeframe: tf,
    score: scoreTechnicalTimeframe(block),
    trend: block?.trend || "unknown",
    momentum: block?.momentum || "unknown",
    priceVsEMA200: block?.priceVsEMA200 || "unknown",
    rsi14: block?.rsi14 ?? null,
  }));
  const total = items.reduce((a, b) => a + b.score, 0);
  const signs = new Set(items.map((x) => x.score > 0 ? "pos" : x.score < 0 ? "neg" : "flat"));
  const conflicts = [];
  if (signs.has("pos") && signs.has("neg")) conflicts.push("timeframe_direction_conflict");
  return { score: total, bias: labelFromTechnicalScore(total), conflicts, timeframes: items };
}

function buildAlignmentContextForSnapshot(macroDirection, technicalContext) {
  const macro = String(macroDirection || "mixed").toLowerCase();
  const techBias = String(technicalContext?.multiTimeframe?.bias || technicalContext?.technicalBias || "unknown").toLowerCase();

  if (!technicalContext || technicalContext.status === "unreliable" || technicalContext.usableForScenario === false) {
    return {
      macroDirection: macro,
      technicalBias: "unusable",
      alignment: "technical_unusable",
      action: "ignore_technical_direction",
      explanation: "Technical context is unusable and must not affect scenario direction.",
      rule: "Technical context can confirm, weaken, or contradict macro context, but cannot override missing macro/event/replay evidence.",
    };
  }

  const macroSupportive = macro.includes("supportive") || macro.includes("bullish") || macro.includes("positive");
  const macroNegative = macro.includes("negative") || macro.includes("bearish");
  const techBullish = techBias.includes("bullish");
  const techBearish = techBias.includes("bearish");

  let alignment = "mixed_or_insufficient";
  let action = "prefer_wait_neutral";
  let explanation = "Macro and technical context are incomplete, mixed, or insufficient.";

  if (macroSupportive && techBullish) {
    alignment = "aligned_bullish";
    action = "allow_conditional_bullish_research_only";
    explanation = "Macro read is supportive and technical context is bullish, but event outcomes and replay evidence are still required.";
  } else if (macroNegative && techBearish) {
    alignment = "aligned_bearish";
    action = "allow_conditional_bearish_research_only";
    explanation = "Macro read is negative and technical context is bearish, but event outcomes and replay evidence are still required.";
  } else if (macroSupportive && techBearish) {
    alignment = "macro_supportive_technical_bearish_conflict";
    action = "force_wait_neutral";
    explanation = "Macro read is supportive while technical context is bearish; technicals weaken the bullish case and force Wait-Neutral.";
  } else if (macroNegative && techBullish) {
    alignment = "macro_negative_technical_bullish_conflict";
    action = "force_wait_neutral";
    explanation = "Macro read is negative while technical context is bullish; technicals weaken the bearish case and force Wait-Neutral.";
  }

  return {
    macroDirection: macro,
    technicalBias: techBias,
    multiTimeframeBias: technicalContext?.multiTimeframe?.bias || null,
    alignment,
    action,
    explanation,
    rule: "Technical context can confirm, weaken, or contradict macro context, but cannot override missing macro/event/replay evidence.",
  };
}




function stddev(values, period) {
  const arr = (values || []).filter((x) => Number.isFinite(x));
  if (arr.length < period) return NaN;
  const slice = arr.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
  return Math.sqrt(variance);
}

function emaSeries(values, period) {
  const arr = (values || []).map(Number).filter((x) => Number.isFinite(x));
  if (arr.length < period) return [];
  const k = 2 / (period + 1);
  const out = [];
  let prev = arr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out.push(prev);
  for (let i = period; i < arr.length; i += 1) {
    prev = arr[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

function computeMacd(values, fast = 12, slow = 26, signalPeriod = 9) {
  const arr = (values || []).map(Number).filter((x) => Number.isFinite(x));
  if (arr.length < slow + signalPeriod) {
    return { macd: NaN, signal: NaN, histogram: NaN, state: "unavailable" };
  }
  const fastSeries = emaSeries(arr, fast);
  const slowSeries = emaSeries(arr, slow);
  const minLen = Math.min(fastSeries.length, slowSeries.length);
  const alignedFast = fastSeries.slice(fastSeries.length - minLen);
  const alignedSlow = slowSeries.slice(slowSeries.length - minLen);
  const macdLine = alignedFast.map((x, i) => x - alignedSlow[i]);
  const signalSeries = emaSeries(macdLine, signalPeriod);
  if (!signalSeries.length) return { macd: NaN, signal: NaN, histogram: NaN, state: "unavailable" };
  const macdValue = macdLine[macdLine.length - 1];
  const signalValue = signalSeries[signalSeries.length - 1];
  const histogram = macdValue - signalValue;
  let state = "neutral";
  if (macdValue > signalValue && histogram > 0) state = "bullish";
  if (macdValue < signalValue && histogram < 0) state = "bearish";
  return { macd: macdValue, signal: signalValue, histogram, state };
}

function computeBollinger(values, period = 20, mult = 2) {
  const middle = sma(values, period);
  const sd = stddev(values, period);
  const price = values?.[values.length - 1];
  if (!Number.isFinite(middle) || !Number.isFinite(sd) || !Number.isFinite(price)) {
    return { middle: NaN, upper: NaN, lower: NaN, bandwidthPct: NaN, position: "unavailable" };
  }
  const upper = middle + mult * sd;
  const lower = middle - mult * sd;
  const bandwidthPct = ((upper - lower) / Math.max(Math.abs(middle), 1)) * 100;
  let position = "inside";
  if (price > upper) position = "above_upper";
  if (price < lower) position = "below_lower";
  return { middle, upper, lower, bandwidthPct, position };
}

function computeTrueRanges(candles) {
  const c = candles || [];
  const trs = [];
  for (let i = 1; i < c.length; i += 1) {
    const high = c[i].high;
    const low = c[i].low;
    const prevClose = c[i - 1].close;
    if (![high, low, prevClose].every(Number.isFinite)) continue;
    trs.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
  }
  return trs;
}

function computeKeltner(candles, period = 20, mult = 2) {
  const closes = (candles || []).map((x) => x.close).filter(Number.isFinite);
  const middle = ema(closes, period);
  const atrValue = atr(candles, period);
  const price = closes[closes.length - 1];
  if (!Number.isFinite(middle) || !Number.isFinite(atrValue) || !Number.isFinite(price)) {
    return { middle: NaN, upper: NaN, lower: NaN, widthPct: NaN, position: "unavailable" };
  }
  const upper = middle + mult * atrValue;
  const lower = middle - mult * atrValue;
  const widthPct = ((upper - lower) / Math.max(Math.abs(middle), 1)) * 100;
  let position = "inside";
  if (price > upper) position = "above_upper";
  if (price < lower) position = "below_lower";
  return { middle, upper, lower, widthPct, position };
}

function computeAdx(candles, period = 14) {
  const c = candles || [];
  if (c.length < period * 2 + 1) {
    return { adx: NaN, plusDI: NaN, minusDI: NaN, trendStrength: "unavailable", direction: "unavailable" };
  }
  const trs = [];
  const plusDM = [];
  const minusDM = [];

  for (let i = 1; i < c.length; i += 1) {
    const upMove = c[i].high - c[i - 1].high;
    const downMove = c[i - 1].low - c[i].low;
    const tr = Math.max(
      c[i].high - c[i].low,
      Math.abs(c[i].high - c[i - 1].close),
      Math.abs(c[i].low - c[i - 1].close)
    );
    trs.push(tr);
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }

  const dx = [];
  for (let i = period - 1; i < trs.length; i += 1) {
    const trSum = trs.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    const plusSum = plusDM.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    const minusSum = minusDM.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    if (trSum <= 0) continue;
    const plusDI = 100 * plusSum / trSum;
    const minusDI = 100 * minusSum / trSum;
    const denom = plusDI + minusDI;
    if (denom <= 0) continue;
    dx.push(100 * Math.abs(plusDI - minusDI) / denom);
  }

  const adxValue = sma(dx, period);
  const lastTrSum = trs.slice(-period).reduce((a, b) => a + b, 0);
  const lastPlus = plusDM.slice(-period).reduce((a, b) => a + b, 0);
  const lastMinus = minusDM.slice(-period).reduce((a, b) => a + b, 0);
  const plusDI = lastTrSum > 0 ? 100 * lastPlus / lastTrSum : NaN;
  const minusDI = lastTrSum > 0 ? 100 * lastMinus / lastTrSum : NaN;
  let trendStrength = "weak";
  if (adxValue >= 25) trendStrength = "strong";
  else if (adxValue >= 20) trendStrength = "developing";
  const direction = plusDI > minusDI ? "bullish" : minusDI > plusDI ? "bearish" : "neutral";
  return { adx: adxValue, plusDI, minusDI, trendStrength, direction };
}

function rsiSeries(values, period = 14) {
  const arr = (values || []).map(Number).filter(Number.isFinite);
  if (arr.length < period + 1) return [];
  const out = [];
  for (let i = period; i < arr.length; i += 1) {
    const window = arr.slice(i - period, i + 1);
    out.push(rsi(window, period));
  }
  return out.filter(Number.isFinite);
}

function computeStochRsi(values, rsiPeriod = 14, stochPeriod = 14, smooth = 3) {
  const rsis = rsiSeries(values, rsiPeriod);
  if (rsis.length < stochPeriod) {
    return { k: NaN, d: NaN, state: "unavailable" };
  }
  const window = rsis.slice(-stochPeriod);
  const minRsi = Math.min(...window);
  const maxRsi = Math.max(...window);
  const lastRsi = rsis[rsis.length - 1];
  if (Math.abs(maxRsi - minRsi) < 1e-9) return { k: 50, d: 50, state: "neutral" };
  const rawK = 100 * (lastRsi - minRsi) / (maxRsi - minRsi);

  const kValues = [];
  for (let i = stochPeriod - 1; i < rsis.length; i += 1) {
    const w = rsis.slice(i - stochPeriod + 1, i + 1);
    const mn = Math.min(...w);
    const mx = Math.max(...w);
    kValues.push(Math.abs(mx - mn) < 1e-9 ? 50 : 100 * (rsis[i] - mn) / (mx - mn));
  }
  const d = sma(kValues, smooth);
  let state = "neutral";
  if (rawK >= 80) state = "overbought";
  if (rawK <= 20) state = "oversold";
  if (rawK > d && rawK > 50 && state === "neutral") state = "bullish_momentum";
  if (rawK < d && rawK < 50 && state === "neutral") state = "bearish_momentum";
  return { k: rawK, d, state };
}

function expandedIndicatorSignalScore({ macd, adxValue, bollinger, keltner, stochRsiValue }) {
  let s = 0;
  if (macd?.state === "bullish") s += 1;
  if (macd?.state === "bearish") s -= 1;

  if (adxValue?.trendStrength === "strong" || adxValue?.trendStrength === "developing") {
    if (adxValue.direction === "bullish") s += 1;
    if (adxValue.direction === "bearish") s -= 1;
  }

  if (bollinger?.position === "above_upper") s += 0.5;
  if (bollinger?.position === "below_lower") s -= 0.5;
  if (keltner?.position === "above_upper") s += 0.5;
  if (keltner?.position === "below_lower") s -= 0.5;

  if (stochRsiValue?.state === "bullish_momentum") s += 0.5;
  if (stochRsiValue?.state === "bearish_momentum") s -= 0.5;
  return s;
}



function strategyScoreLabel(score) {
  if (score >= 2.5) return "bullish";
  if (score <= -2.5) return "bearish";
  if (score > 0.5) return "mild-bullish";
  if (score < -0.5) return "mild-bearish";
  return "neutral";
}

function buildTrendStrategyModule({ price, ema20, ema50, ema200, trend, priceVsEMA200, adx14 }) {
  let score = 0;
  const evidence = [];

  if (trend?.includes("bullish")) {
    score += 2;
    evidence.push("EMA alignment is bullish.");
  }
  if (trend?.includes("bearish")) {
    score -= 2;
    evidence.push("EMA alignment is bearish.");
  }
  if (priceVsEMA200 === "above") {
    score += 1;
    evidence.push("Price is above EMA200.");
  }
  if (priceVsEMA200 === "below") {
    score -= 1;
    evidence.push("Price is below EMA200.");
  }
  if ((adx14?.trendStrength === "strong" || adx14?.trendStrength === "developing") && adx14?.direction === "bullish") {
    score += 1;
    evidence.push(`ADX confirms ${adx14.trendStrength} bullish trend pressure.`);
  }
  if ((adx14?.trendStrength === "strong" || adx14?.trendStrength === "developing") && adx14?.direction === "bearish") {
    score -= 1;
    evidence.push(`ADX confirms ${adx14.trendStrength} bearish trend pressure.`);
  }

  return {
    name: "Trend Strategy Module",
    status: "available",
    score: round2(score),
    bias: strategyScoreLabel(score),
    inputs: {
      ema20: round2(ema20),
      ema50: round2(ema50),
      ema200: round2(ema200),
      trend,
      priceVsEMA200,
      adxTrendStrength: adx14?.trendStrength || "unknown",
      adxDirection: adx14?.direction || "unknown",
    },
    evidence,
    interpretation: "Trend module combines EMA alignment, price versus EMA200, and ADX direction/strength.",
    guardrail: "Trend module is confirmation context only and cannot override macro/event/replay evidence.",
  };
}

function buildMomentumStrategyModule({ rsi14, macd, stochRsi14, momentum }) {
  let score = 0;
  const evidence = [];

  if (momentum?.includes("positive")) {
    score += 1;
    evidence.push("Price/RSI momentum is positive.");
  }
  if (momentum?.includes("negative")) {
    score -= 1;
    evidence.push("Price/RSI momentum is negative.");
  }
  if (macd?.state === "bullish") {
    score += 1;
    evidence.push("MACD is bullish.");
  }
  if (macd?.state === "bearish") {
    score -= 1;
    evidence.push("MACD is bearish.");
  }
  if (Number.isFinite(rsi14) && rsi14 >= 70) {
    evidence.push("RSI14 is overbought; treat as overextension risk, not automatic bearish confirmation.");
  } else if (Number.isFinite(rsi14) && rsi14 <= 30) {
    evidence.push("RSI14 is oversold; treat as exhaustion risk, not automatic bullish confirmation.");
  } else if (Number.isFinite(rsi14)) {
    evidence.push("RSI14 is not at a classic overbought/oversold extreme.");
  }

  if (stochRsi14?.state === "bullish_momentum") {
    score += 0.5;
    evidence.push("Stochastic RSI shows bullish momentum.");
  }
  if (stochRsi14?.state === "bearish_momentum") {
    score -= 0.5;
    evidence.push("Stochastic RSI shows bearish momentum.");
  }
  if (stochRsi14?.state === "overbought") {
    evidence.push("Stochastic RSI is overbought; this flags short-term overextension risk.");
  }
  if (stochRsi14?.state === "oversold") {
    evidence.push("Stochastic RSI is oversold; this flags short-term exhaustion risk.");
  }

  return {
    name: "Momentum Strategy Module",
    status: "available",
    score: round2(score),
    bias: strategyScoreLabel(score),
    inputs: {
      rsi14: round2(rsi14),
      macdState: macd?.state || "unknown",
      macdHistogram: round2(macd?.histogram),
      stochRsiK: round2(stochRsi14?.k),
      stochRsiD: round2(stochRsi14?.d),
      stochRsiState: stochRsi14?.state || "unknown",
      momentum,
    },
    evidence,
    interpretation: "Momentum module combines RSI, MACD, and Stochastic RSI for short-term pressure/overextension context.",
    guardrail: "Momentum module is confirmation context only and cannot override macro/event/replay evidence.",
  };
}

function buildVolatilityStrategyModule({ atr14, price, bollinger20, keltner20 }) {
  let score = 0;
  const evidence = [];
  const atrPct = Number.isFinite(atr14) && Number.isFinite(price) && Math.abs(price) > 0
    ? (atr14 / Math.abs(price)) * 100
    : NaN;

  if (Number.isFinite(atrPct)) {
    if (atrPct >= 2) evidence.push("ATR is elevated relative to price; volatility risk is high.");
    else if (atrPct >= 1) evidence.push("ATR is moderate relative to price.");
    else evidence.push("ATR is contained relative to price.");
  }

  if (bollinger20?.position === "above_upper") {
    score += 0.5;
    evidence.push("Price is above Bollinger upper band; upside extension/overextension context.");
  } else if (bollinger20?.position === "below_lower") {
    score -= 0.5;
    evidence.push("Price is below Bollinger lower band; downside extension/overextension context.");
  } else {
    evidence.push("Price is inside Bollinger Bands.");
  }

  if (keltner20?.position === "above_upper") {
    score += 0.5;
    evidence.push("Price is above Keltner upper channel; volatility breakout context.");
  } else if (keltner20?.position === "below_lower") {
    score -= 0.5;
    evidence.push("Price is below Keltner lower channel; volatility breakdown context.");
  } else {
    evidence.push("Price is inside Keltner Channel.");
  }

  const bbWidth = Number(bollinger20?.bandwidthPct);
  const kcWidth = Number(keltner20?.widthPct);
  let regime = "unknown";
  if (Number.isFinite(bbWidth) && Number.isFinite(kcWidth)) {
    if (bbWidth < kcWidth) {
      regime = "compression/squeeze";
      evidence.push("Bollinger width is below Keltner width; possible compression regime.");
    } else {
      regime = "expanded/normal";
      evidence.push("Bollinger width is not below Keltner width; no squeeze flag.");
    }
  }

  return {
    name: "Volatility Strategy Module",
    status: "available",
    score: round2(score),
    bias: strategyScoreLabel(score),
    inputs: {
      atr14: round2(atr14),
      atrPct: round2(atrPct),
      bollingerPosition: bollinger20?.position || "unknown",
      bollingerBandwidthPct: round2(bollinger20?.bandwidthPct),
      keltnerPosition: keltner20?.position || "unknown",
      keltnerWidthPct: round2(keltner20?.widthPct),
      regime,
    },
    evidence,
    interpretation: "Volatility module combines ATR, Bollinger Bands, and Keltner Channels to identify range, expansion, or compression context.",
    guardrail: "Volatility module is confirmation/risk context only and cannot override macro/event/replay evidence.",
  };
}

function buildStructureStrategyModule({ price, support, resistance, trend }) {
  let score = 0;
  const evidence = [];
  const validSupport = (support || []).filter((x) => Number.isFinite(x) && x > 0);
  const validResistance = (resistance || []).filter((x) => Number.isFinite(x) && x > 0);

  const nearestSupport = validSupport.length
    ? validSupport.reduce((best, x) => Math.abs(price - x) < Math.abs(price - best) ? x : best, validSupport[0])
    : null;
  const nearestResistance = validResistance.length
    ? validResistance.reduce((best, x) => Math.abs(price - x) < Math.abs(price - best) ? x : best, validResistance[0])
    : null;

  const supportDistancePct = Number.isFinite(nearestSupport) && Number.isFinite(price)
    ? ((price - nearestSupport) / Math.max(Math.abs(price), 1)) * 100
    : NaN;
  const resistanceDistancePct = Number.isFinite(nearestResistance) && Number.isFinite(price)
    ? ((nearestResistance - price) / Math.max(Math.abs(price), 1)) * 100
    : NaN;

  if (trend === "neutral/range") {
    evidence.push("Trend classifier suggests range/unclear structure.");
  } else if (trend?.includes("bearish")) {
    score -= 0.5;
    evidence.push("Structure inherits bearish trend context.");
  } else if (trend?.includes("bullish")) {
    score += 0.5;
    evidence.push("Structure inherits bullish trend context.");
  }

  if (Number.isFinite(supportDistancePct)) {
    evidence.push(`Nearest support distance is ${round2(supportDistancePct)}% from current proxy price.`);
  }
  if (Number.isFinite(resistanceDistancePct)) {
    evidence.push(`Nearest resistance distance is ${round2(resistanceDistancePct)}% from current proxy price.`);
  }

  let structureRegime = "range/unclear";
  if (trend?.includes("bearish")) structureRegime = "bearish structure";
  if (trend?.includes("bullish")) structureRegime = "bullish structure";

  return {
    name: "Structure Strategy Module",
    status: "available",
    score: round2(score),
    bias: strategyScoreLabel(score),
    inputs: {
      structureRegime,
      support: validSupport.map(round2),
      resistance: validResistance.map(round2),
      nearestSupport: round2(nearestSupport),
      nearestResistance: round2(nearestResistance),
      supportDistancePct: round2(supportDistancePct),
      resistanceDistancePct: round2(resistanceDistancePct),
    },
    evidence,
    interpretation: "Structure module summarizes support/resistance proximity and range/trend structure from cleaned proxy candles.",
    guardrail: "Structure levels come from the selected technical proxy and are not trade instructions.",
  };
}

function buildStrategyModules(args) {
  const trendModule = buildTrendStrategyModule(args);
  const momentumModule = buildMomentumStrategyModule(args);
  const volatilityModule = buildVolatilityStrategyModule(args);
  const structureModule = buildStructureStrategyModule(args);
  const modules = {
    trend: trendModule,
    momentum: momentumModule,
    volatility: volatilityModule,
    structure: structureModule,
  };
  const aggregateScore = Object.values(modules).reduce((acc, m) => acc + Number(m.score || 0), 0);
  return {
    available: true,
    aggregateScore: round2(aggregateScore),
    aggregateBias: strategyScoreLabel(aggregateScore),
    modules,
    guardrail: "Strategy modules are technical confirmation/contradiction context only and do not override macro/event/replay evidence.",
  };
}



function classifyTechnicalSanityIssues(sanityIssues, cleaned) {
  const issues = Array.isArray(sanityIssues) ? sanityIssues : [];
  const qualityScore = Number(cleaned?.qualityScore || 0);
  const cleanCount = Number(cleaned?.cleanCount || 0);

  const warningOnly = new Set([
    "stoch_rsi_extreme_possible_overextension",
    "rsi_extreme_possible_bad_data_or_overextension",
    "many_invalid_ohlc_removed",
    "support_unavailable_after_cleaning",
  ]);

  const hardFailures = new Set([
    "invalid_support_zero_or_negative",
    "ema20_far_from_price",
    "ema50_far_from_price",
    "ema200_far_from_price",
    "atr_unusually_large_relative_to_price",
    "price_series_contains_abnormally_low_candles",
    "no_valid_candles",
    "outlier_price_candles_removed",
    "large_discontinuity_candle_removed",
    "last_price_far_from_series_median",
    "wide_price_distribution_possible_bad_history",
  ]);

  const warnings = [];
  const failures = [];

  for (const issue of issues) {
    if (issue === "many_invalid_ohlc_removed" && qualityScore >= 70 && cleanCount >= 200) {
      warnings.push(issue);
    } else if (warningOnly.has(issue)) {
      warnings.push(issue);
    } else if (hardFailures.has(issue)) {
      failures.push(issue);
    } else {
      // Unknown quality issue is conservative only when source quality is not strong.
      if (qualityScore >= 75 && cleanCount >= 200) warnings.push(issue);
      else failures.push(issue);
    }
  }

  return {
    warnings: [...new Set(warnings)],
    failures: [...new Set(failures)],
  };
}



function classifyRsiClassicState(rsiValue) {
  const r = Number(rsiValue);
  if (!Number.isFinite(r)) return "unknown";
  if (r > 70) return "overbought";
  if (r < 30) return "oversold";
  return "not_extreme";
}

function classifyStochRsiState(stochRsiValue) {
  const k = Number(stochRsiValue?.k);
  if (!Number.isFinite(k)) return "unknown";
  if (k >= 80) return "overbought";
  if (k <= 20) return "oversold";
  return "not_extreme";
}

function buildRsiStochRsiLanguageHint(rsiValue, stochRsiValue) {
  const rsiClassicState = classifyRsiClassicState(rsiValue);
  const stochRsiState = classifyStochRsiState(stochRsiValue);

  let requiredPhrase = "";
  if (rsiClassicState === "not_extreme" && stochRsiState === "overbought") {
    requiredPhrase = "RSI14 is not at a classic extreme; Stochastic RSI is overbought.";
  } else if (rsiClassicState === "not_extreme" && stochRsiState === "oversold") {
    requiredPhrase = "RSI14 is not at a classic extreme; Stochastic RSI is oversold.";
  } else if (rsiClassicState === "overbought" && stochRsiState === "overbought") {
    requiredPhrase = "RSI14 is overbought; Stochastic RSI is also overbought.";
  } else if (rsiClassicState === "oversold" && stochRsiState === "oversold") {
    requiredPhrase = "RSI14 is oversold; Stochastic RSI is also oversold.";
  } else if (rsiClassicState === "overbought") {
    requiredPhrase = "RSI14 is overbought; Stochastic RSI is not at a matching extreme.";
  } else if (rsiClassicState === "oversold") {
    requiredPhrase = "RSI14 is oversold; Stochastic RSI is not at a matching extreme.";
  } else if (rsiClassicState === "not_extreme" && stochRsiState === "not_extreme") {
    requiredPhrase = "RSI14 is not at a classic extreme; Stochastic RSI is not at a classic extreme.";
  } else {
    requiredPhrase = "RSI14 and Stochastic RSI states are not both available; do not infer RSI extremes.";
  }

  return {
    available: true,
    rsiClassicState,
    stochRsiState,
    rsi14: round2(rsiValue),
    stochRsiK: round2(stochRsiValue?.k),
    stochRsiD: round2(stochRsiValue?.d),
    requiredPhrase,
    instruction: "When technicalLanguageHints.requiredPhrase exists, copy it exactly in the Technical confirmation section.",
  };
}



function candleBody(c) { return Math.abs(Number(c.close) - Number(c.open)); }
function candleRange(c) { return Math.max(0, Number(c.high) - Number(c.low)); }
function upperShadow(c) { return Math.max(0, Number(c.high) - Math.max(Number(c.open), Number(c.close))); }
function lowerShadow(c) { return Math.max(0, Math.min(Number(c.open), Number(c.close)) - Number(c.low)); }
function candleDirection(c) {
  if (Number(c.close) > Number(c.open)) return "bullish";
  if (Number(c.close) < Number(c.open)) return "bearish";
  return "neutral";
}
function candleMidpoint(c) { return (Number(c.open) + Number(c.close)) / 2; }
function isSmallBody(c) {
  const r = candleRange(c);
  if (!Number.isFinite(r) || r <= 0) return false;
  return candleBody(c) <= r * 0.25;
}
function detectSingleCandlePatterns(c) {
  const r = candleRange(c), body = candleBody(c), up = upperShadow(c), low = lowerShadow(c), dir = candleDirection(c);
  const patterns = [];
  if (!Number.isFinite(r) || r <= 0) return patterns;
  if (body <= r * 0.1) patterns.push({ name: "Doji", direction: "neutral", strength: "weak", reliability: "low", explanation: "Open and close are very close relative to the candle range." });
  if (body > 0 && low >= body * 2 && up <= body * 0.6) patterns.push({ name: dir === "bearish" ? "Hammer-like candle" : "Hammer", direction: "bullish", strength: "medium", reliability: "medium", explanation: "Long lower shadow suggests rejection of lower prices." });
  if (body > 0 && up >= body * 2 && low <= body * 0.6) patterns.push({ name: dir === "bullish" ? "Shooting-star-like candle" : "Shooting Star", direction: "bearish", strength: "medium", reliability: "medium", explanation: "Long upper shadow suggests rejection of higher prices." });
  if (body <= r * 0.3 && up >= r * 0.35 && low >= r * 0.35) patterns.push({ name: "Spinning Top", direction: "neutral", strength: "weak", reliability: "low", explanation: "Small body with meaningful shadows suggests indecision." });
  return patterns;
}
function detectTwoCandlePatterns(prev, curr) {
  const patterns = [];
  const prevDir = candleDirection(prev), currDir = candleDirection(curr), prevBody = candleBody(prev), currBody = candleBody(curr);
  if (prevBody <= 0 || currBody <= 0) return patterns;
  const prevOpen = Number(prev.open), prevClose = Number(prev.close), currOpen = Number(curr.open), currClose = Number(curr.close);
  const prevBodyLow = Math.min(prevOpen, prevClose), prevBodyHigh = Math.max(prevOpen, prevClose);
  const currBodyLow = Math.min(currOpen, currClose), currBodyHigh = Math.max(currOpen, currClose);
  if (prevDir === "bearish" && currDir === "bullish" && currBodyLow <= prevBodyLow && currBodyHigh >= prevBodyHigh) patterns.push({ name: "Bullish Engulfing", direction: "bullish", strength: "medium", reliability: "medium", explanation: "Bullish candle body engulfs the previous bearish body." });
  if (prevDir === "bullish" && currDir === "bearish" && currBodyLow <= prevBodyLow && currBodyHigh >= prevBodyHigh) patterns.push({ name: "Bearish Engulfing", direction: "bearish", strength: "medium", reliability: "medium", explanation: "Bearish candle body engulfs the previous bullish body." });
  if (prevDir === "bearish" && currDir === "bullish" && currOpen < prevClose && currClose > candleMidpoint(prev) && currClose < prevOpen) patterns.push({ name: "Piercing Line", direction: "bullish", strength: "medium", reliability: "medium", explanation: "Bullish candle closes above the midpoint of the previous bearish candle." });
  if (prevDir === "bullish" && currDir === "bearish" && currOpen > prevClose && currClose < candleMidpoint(prev) && currClose > prevOpen) patterns.push({ name: "Dark Cloud Cover", direction: "bearish", strength: "medium", reliability: "medium", explanation: "Bearish candle closes below the midpoint of the previous bullish candle." });
  if (prevBody > 0 && currBody > 0 && currBody <= prevBody * 0.45 && currBodyLow >= prevBodyLow && currBodyHigh <= prevBodyHigh) patterns.push({ name: prevDir === "bearish" ? "Bullish Harami" : "Bearish Harami", direction: prevDir === "bearish" ? "bullish" : "bearish", strength: "weak", reliability: "low", explanation: "Small body forms inside the previous candle body." });
  return patterns;
}
function detectThreeCandlePatterns(a, b, c) {
  const patterns = [], aDir = candleDirection(a), bSmall = isSmallBody(b), cDir = candleDirection(c);
  if (aDir === "bearish" && bSmall && cDir === "bullish" && Number(c.close) > candleMidpoint(a)) patterns.push({ name: "Morning Star-like pattern", direction: "bullish", strength: "strong", reliability: "medium", explanation: "Bearish candle, indecision candle, then bullish close above first candle midpoint." });
  if (aDir === "bullish" && bSmall && cDir === "bearish" && Number(c.close) < candleMidpoint(a)) patterns.push({ name: "Evening Star-like pattern", direction: "bearish", strength: "strong", reliability: "medium", explanation: "Bullish candle, indecision candle, then bearish close below first candle midpoint." });
  if (aDir === "bullish" && candleDirection(b) === "bullish" && cDir === "bullish" && Number(a.close) < Number(b.close) && Number(b.close) < Number(c.close)) patterns.push({ name: "Three White Soldiers-like pattern", direction: "bullish", strength: "strong", reliability: "medium", explanation: "Three consecutive bullish closes suggest upward pressure." });
  if (aDir === "bearish" && candleDirection(b) === "bearish" && cDir === "bearish" && Number(a.close) > Number(b.close) && Number(b.close) > Number(c.close)) patterns.push({ name: "Three Black Crows-like pattern", direction: "bearish", strength: "strong", reliability: "medium", explanation: "Three consecutive bearish closes suggest downward pressure." });
  return patterns;
}
function scoreCandlestickPatterns(patterns) {
  const weights = { weak: 1, medium: 2, strong: 3 };
  let score = 0;
  for (const p of patterns || []) {
    const w = weights[p.strength] || 1;
    if (p.direction === "bullish") score += w;
    if (p.direction === "bearish") score -= w;
  }
  if (score >= 3) return { score, bias: "bullish" };
  if (score > 0) return { score, bias: "mild-bullish" };
  if (score <= -3) return { score, bias: "bearish" };
  if (score < 0) return { score, bias: "mild-bearish" };
  return { score, bias: "neutral" };
}
function computeCandlestickPatternContext(candles, lookback = 5) {
  const c = (candles || []).filter((x) => Number.isFinite(Number(x.open)) && Number.isFinite(Number(x.high)) && Number.isFinite(Number(x.low)) && Number.isFinite(Number(x.close)));
  if (c.length < 3) return { available: false, status: "insufficient_candles", patterns: [], bias: "neutral", score: 0, guardrail: "Candlestick patterns are confirmation context only and cannot override macro/event/replay evidence." };
  const recent = c.slice(-Math.max(3, lookback));
  const patterns = [];
  patterns.push(...detectSingleCandlePatterns(recent[recent.length - 1]));
  patterns.push(...detectTwoCandlePatterns(recent[recent.length - 2], recent[recent.length - 1]));
  patterns.push(...detectThreeCandlePatterns(recent[recent.length - 3], recent[recent.length - 2], recent[recent.length - 1]));
  const unique = [], seen = new Set();
  for (const p of patterns) {
    const key = `${p.name}|${p.direction}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push({ ...p, confirmationOnly: true });
    }
  }
  const scored = scoreCandlestickPatterns(unique);
  return {
    available: true,
    status: unique.length ? "patterns_detected" : "no_major_pattern",
    lookbackCandles: recent.length,
    patterns: unique.slice(0, 5),
    bias: scored.bias,
    score: scored.score,
    guardrail: "Candlestick patterns are technical confirmation context only; they are not trade instructions and cannot override macro/event/replay evidence.",
  };
}

function computeTechnicalContextFromCandles(candles, symbol = "XAUUSD=X", timeframe = "1h", sourceName = "yahoo") {
  const cleaned = sanitizeCandles(candles, symbol);
  const c = cleaned.candles;
  const meta = cleaned.meta;
  const sourceQuality = technicalSourceQualityLabel(cleaned.qualityScore, cleaned.issues);

  if (c.length < 30 || sourceQuality === "bad") {
    return {
      symbol,
      sourceName,
      proxy: meta.proxy,
      status: "unreliable",
      reliability: "unreliable",
      usableForScenario: false,
      reason: c.length < 30 ? `Need at least 30 clean candles; got ${c.length}.` : "Technical source quality failed sanity checks.",
      dataQuality: {
        qualityScore: cleaned.qualityScore,
        qualityLabel: sourceQuality,
        rawCount: cleaned.rawCount,
        cleanCount: cleaned.cleanCount,
        issues: cleaned.issues,
      },
      timeframes: {},
      technicalBias: "masked-unreliable",
      technicalConfidence: 0,
      sanityIssues: cleaned.issues.length ? cleaned.issues : ["technical_source_quality_bad"],
      guardrails: [
        "Technical data source failed quality checks and must not be used as directional evidence.",
      ],
    };
  }

  const closes = c.map((x) => x.close);
  const price = closes[closes.length - 1];
  const prevPrice = closes[closes.length - 2];

  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const ema200 = ema(closes, 200);
  const rsi14 = rsi(closes, 14);
  const atr14 = atr(c, 14);
  const macd = computeMacd(closes, 12, 26, 9);
  const adx14 = computeAdx(c, 14);
  const bollinger20 = computeBollinger(closes, 20, 2);
  const keltner20 = computeKeltner(c, 20, 2);
  const stochRsi14 = computeStochRsi(closes, 14, 14, 3);
  const technicalLanguageHints = buildRsiStochRsiLanguageHint(rsi14, stochRsi14);
  const { support, resistance } = estimateSupportResistance(c, 60);
  const candlestickPatterns = computeCandlestickPatternContext(c, 5);
  const trend = classifyTrend(price, ema20, ema50, ema200);
  const momentum = classifyMomentum(rsi14, price, prevPrice);
  const priceVsEMA200 = Number.isFinite(ema200)
    ? price > ema200 ? "above" : price < ema200 ? "below" : "at"
    : "unknown";

  const strategyModules = buildStrategyModules({
    price,
    ema20,
    ema50,
    ema200,
    rsi14,
    atr14,
    macd,
    adx14,
    bollinger20,
    keltner20,
    stochRsi14,
    support,
    resistance,
    trend,
    momentum,
    priceVsEMA200,
  });

  let bias = "neutral";
  let score = 0;
  if (trend.includes("bullish")) score += 2;
  if (trend.includes("bearish")) score -= 2;
  if (momentum.includes("positive")) score += 1;
  if (momentum.includes("negative")) score -= 1;
  if (priceVsEMA200 === "above") score += 1;
  if (priceVsEMA200 === "below") score -= 1;

  const expandedScore = expandedIndicatorSignalScore({
    macd,
    adxValue: adx14,
    bollinger: bollinger20,
    keltner: keltner20,
    stochRsiValue: stochRsi14,
  });
  score += expandedScore;
  const strategyScoreContribution = Math.max(-2, Math.min(2, Number(strategyModules.aggregateScore || 0) / 2));
  score += strategyScoreContribution;

  if (score >= 3) bias = "bullish";
  else if (score <= -3) bias = "bearish";
  else if (score > 0) bias = "mild-bullish";
  else if (score < 0) bias = "mild-bearish";

  const sanityIssues = [];
  const nonZeroLows = c.map((x) => x.low).filter((x) => Number.isFinite(x) && x > 0);
  const minLow = nonZeroLows.length ? Math.min(...nonZeroLows) : null;

  if (support.some((x) => !Number.isFinite(x) || x <= 0)) sanityIssues.push("invalid_support_zero_or_negative");
  if (!support.length && c.length >= 60) sanityIssues.push("support_unavailable_after_cleaning");

  if (Number.isFinite(price) && Number.isFinite(ema20)) {
    const d = Math.abs(price - ema20) / Math.max(Math.abs(price), 1);
    if (d > 0.25) sanityIssues.push("ema20_far_from_price");
  }
  if (Number.isFinite(price) && Number.isFinite(ema50)) {
    const d = Math.abs(price - ema50) / Math.max(Math.abs(price), 1);
    if (d > 0.35) sanityIssues.push("ema50_far_from_price");
  }
  if (Number.isFinite(price) && Number.isFinite(ema200)) {
    const d = Math.abs(price - ema200) / Math.max(Math.abs(price), 1);
    if (d > 0.50) sanityIssues.push("ema200_far_from_price");
  }
  if (rsi14 === 100 || rsi14 === 0) sanityIssues.push("rsi_extreme_possible_bad_data_or_overextension");
  if (Number.isFinite(stochRsi14?.k) && (stochRsi14.k === 100 || stochRsi14.k === 0)) {
    sanityIssues.push("stoch_rsi_extreme_possible_overextension");
  }
  if (Number.isFinite(atr14) && Number.isFinite(price) && atr14 / Math.max(Math.abs(price), 1) > 0.05) {
    sanityIssues.push("atr_unusually_large_relative_to_price");
  }
  if (minLow !== null && Number.isFinite(price) && minLow / Math.max(Math.abs(price), 1) < 0.5) {
    sanityIssues.push("price_series_contains_abnormally_low_candles");
  }

  for (const sourceIssue of cleaned.issues || []) {
    if (!sanityIssues.includes(sourceIssue)) sanityIssues.push(sourceIssue);
  }

  const sanityClassification = classifyTechnicalSanityIssues(sanityIssues, cleaned);
  const technicalWarnings = sanityClassification.warnings;
  const technicalFailures = sanityClassification.failures;
  const technicalReliability = technicalFailures.length ? "unreliable" : "usable";
  let technicalConfidence = Math.max(20, Math.min(75, 25 + Math.abs(score) * 12 + (c.length >= 200 ? 10 : 0)));

  if (technicalWarnings.length && technicalReliability === "usable") {
    technicalConfidence = Math.max(20, technicalConfidence - Math.min(10, technicalWarnings.length * 3));
  }

  if (technicalReliability === "unreliable") {
    technicalConfidence = Math.min(20, technicalConfidence);
    bias = bias.includes("bullish") ? "weak/uncertain-bullish" : bias.includes("bearish") ? "weak/uncertain-bearish" : "uncertain";
  }

  return {
    symbol,
    sourceName,
    proxy: meta.proxy,
    instrument: meta.instrument,
    status: technicalReliability === "unreliable" ? "unreliable" : "available",
    reliability: technicalReliability,
    usableForScenario: technicalReliability !== "unreliable",
    dataQuality: {
      qualityScore: cleaned.qualityScore,
      qualityLabel: sourceQuality,
      rawCount: cleaned.rawCount,
      cleanCount: cleaned.cleanCount,
      issues: cleaned.issues,
    },
    sanityIssues: [...new Set([...sanityIssues, ...cleaned.issues])],
    lastUpdated: c[c.length - 1]?.time || new Date().toISOString(),
    candleCount: c.length,
    timeframes: {
      [timeframe]: {
        lastPrice: round2(price),
        previousClose: round2(prevPrice),
        ema20: round2(ema20),
        ema50: round2(ema50),
        ema200: round2(ema200),
        rsi14: round2(rsi14),
        atr14: round2(atr14),
        macd: {
          macd: round2(macd.macd),
          signal: round2(macd.signal),
          histogram: round2(macd.histogram),
          state: macd.state,
        },
        adx14: {
          adx: round2(adx14.adx),
          plusDI: round2(adx14.plusDI),
          minusDI: round2(adx14.minusDI),
          trendStrength: adx14.trendStrength,
          direction: adx14.direction,
        },
        bollinger20: {
          middle: round2(bollinger20.middle),
          upper: round2(bollinger20.upper),
          lower: round2(bollinger20.lower),
          bandwidthPct: round2(bollinger20.bandwidthPct),
          position: bollinger20.position,
        },
        keltner20: {
          middle: round2(keltner20.middle),
          upper: round2(keltner20.upper),
          lower: round2(keltner20.lower),
          widthPct: round2(keltner20.widthPct),
          position: keltner20.position,
        },
        stochRsi14: {
          k: round2(stochRsi14.k),
          d: round2(stochRsi14.d),
          state: stochRsi14.state,
        },
        technicalLanguageHints,
        candlestickPatterns,
        expandedIndicatorScore: round2(expandedScore),
        strategyModules,
        strategyScoreContribution: round2(strategyScoreContribution),
        trend,
        momentum,
        priceVsEMA200,
        support: support.filter((x) => Number.isFinite(x) && x > 0),
        resistance: resistance.filter((x) => Number.isFinite(x) && x > 0),
        structure: trend === "neutral/range" ? "range/unclear" : trend,
      },
    },
    technicalLanguageHints,
    technicalIndicators: {
      available: true,
      set: ["MACD(12,26,9)", "ADX(14)", "Bollinger(20,2)", "Keltner(20,2)", "Stochastic RSI(14,14,3)"],
      indicatorScore: round2(expandedScore),
      note: "Expanded indicators are confirmation/contradiction context only and must not override macro/event/replay evidence.",
    },
    candlestickPatterns,
    strategyModules,
    technicalBias: bias,
    technicalConfidence,
    guardrails: [
      "Technical analysis is confirmation/context only; it must not override missing macro/event evidence.",
      "Price levels come from GC=F proxy data, not direct spot XAUUSD.",
      "If reliability is unreliable, treat technicals as diagnostic only, not scenario evidence.",
    ],
  };
}


async function fetchStooqDaily(symbol = "xauusd") {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 260);
  const fmt = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const url = `/api/stooq/q/d/l/?s=${encodeURIComponent(symbol)}&d1=${fmt(start)}&d2=${fmt(end)}&i=d`;
  const res = await fetch(url, { cache: "no-store" });
  const csv = await res.text();
  if (!res.ok) throw new Error(`Stooq HTTP ${res.status}: ${csv.slice(0, 300)}`);
  if (!csv || /No data/i.test(csv)) throw new Error(`Stooq returned no data for ${symbol}`);

  const lines = csv.trim().split(/\r?\n/);
  const header = lines.shift();
  if (!header || !/date/i.test(header)) throw new Error("Stooq CSV header missing");
  return lines.map((line) => {
    const [date, open, high, low, close] = line.split(",");
    return {
      time: `${date}T00:00:00.000Z`,
      open: Number(open),
      high: Number(high),
      low: Number(low),
      close: Number(close),
    };
  }).filter((x) =>
    Number.isFinite(x.open) && Number.isFinite(x.high) && Number.isFinite(x.low) && Number.isFinite(x.close)
  );
}

async function loadBestTechnicalCandles() {
  const candidates = [
    { sourceName: "Yahoo", symbol: "XAUUSD=X", range: "90d", interval: "1h", fetcher: () => fetchYahooChart("XAUUSD=X", "90d", "1h") },
    { sourceName: "Yahoo", symbol: "XAUUSD=X", range: "1y", interval: "1d", fetcher: () => fetchYahooChart("XAUUSD=X", "1y", "1d") },
    { sourceName: "Yahoo", symbol: "GC=F", range: "90d", interval: "1h", fetcher: () => fetchYahooChart("GC=F", "90d", "1h") },
    { sourceName: "Yahoo", symbol: "GC=F", range: "1y", interval: "1d", fetcher: () => fetchYahooChart("GC=F", "1y", "1d") },
    { sourceName: "Stooq", symbol: "xauusd", range: "260d", interval: "1d", fetcher: () => fetchStooqDaily("xauusd") },
  ];

  const attempts = [];
  for (const candidate of candidates) {
    try {
      const candles = await candidate.fetcher();
      const cleaned = sanitizeCandles(candles, candidate.symbol);
      const qualityLabel = technicalSourceQualityLabel(cleaned.qualityScore, cleaned.issues);
      attempts.push({
        ...candidate,
        candles,
        cleanCount: cleaned.cleanCount,
        rawCount: cleaned.rawCount,
        qualityScore: cleaned.qualityScore,
        qualityLabel,
        issues: cleaned.issues,
        ok: qualityLabel === "good" || qualityLabel === "usable",
      });
      if (qualityLabel === "good" || qualityLabel === "usable") {
        return { ...candidate, candles, attempts };
      }
    } catch (err) {
      attempts.push({
        ...candidate,
        candles: [],
        cleanCount: 0,
        rawCount: 0,
        qualityScore: 0,
        qualityLabel: "error",
        issues: [err.message],
        ok: false,
      });
    }
  }

  const best = attempts
    .filter((a) => a.candles?.length)
    .sort((a, b) => b.qualityScore - a.qualityScore)[0];

  if (best) {
    return { ...best, attempts };
  }

  throw new Error(`All technical data sources failed: ${attempts.map((a) => `${a.sourceName}:${a.symbol}:${a.issues?.[0] || a.qualityLabel}`).join(" | ")}`);
}


async function fetchYahooChart(symbol = "XAUUSD=X", range = "90d", interval = "1h") {
  const url = `/api/yahoo/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  if (!res.ok) throw new Error(`Yahoo chart HTTP ${res.status}: ${text.slice(0, 300)}`);
  const data = JSON.parse(text);
  const result = data?.chart?.result?.[0];
  const timestamps = result?.timestamp || [];
  const quote = result?.indicators?.quote?.[0] || {};
  const closes = quote.close || [];
  const highs = quote.high || [];
  const lows = quote.low || [];
  const opens = quote.open || [];

  return timestamps.map((t, i) => ({
    time: new Date(t * 1000).toISOString(),
    open: Number(opens[i]),
    high: Number(highs[i]),
    low: Number(lows[i]),
    close: Number(closes[i]),
  })).filter((x) =>
    Number.isFinite(x.open) && Number.isFinite(x.high) && Number.isFinite(x.low) && Number.isFinite(x.close)
  );
}


function extractMiningNewsTitles(snapshot) {
  const items = snapshot?.gdeltNews?.items || [];
  return items
    .filter(isMiningCompanyOrEquityNews)
    .map((n) => String(n.title || "").trim())
    .filter(Boolean);
}


function splitReportLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getNextMajorEvent(snapshot) {
  return snapshot?.deterministicScenarioLab?.nextMajor
    || snapshot?.calendar?.nextMajor
    || snapshot?.calendar?.eventRiskSummary?.nextMajor
    || null;
}

function monthNameToNumber(name) {
  const m = String(name || "").toLowerCase().slice(0, 3);
  return {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  }[m] || null;
}

function extractHumanDates(text) {
  const out = [];
  const s = String(text || "");

  for (const m of s.matchAll(/\b(20\d{2})-(\d{2})-(\d{2})\b/g)) {
    out.push(`${m[1]}-${m[2]}-${m[3]}`);
  }

  for (const m of s.matchAll(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(20\d{2})\b/gi)) {
    const mm = monthNameToNumber(m[1]);
    const dd = String(m[2]).padStart(2, "0");
    if (mm) out.push(`${m[3]}-${mm}-${dd}`);
  }

  return [...new Set(out)];
}

function extractNextCatalystBlock(text) {
  const s = String(text || "");
  const idx = s.search(/(?:^|\n)\s*(?:9\.\s*)?Next catalyst plan/i);
  if (idx < 0) return "";
  const tail = s.slice(idx);
  const end = tail.search(/(?:^|\n)\s*(?:10\.\s*)?Final research note/i);
  return end >= 0 ? tail.slice(0, end) : tail;
}

function normalizeEventName(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function lineStatesBullish(line) {
  return /\b(bullish|gold may rise|gold could rise|gold may strengthen|gold could strengthen|gold may rebound|gold could rebound|gold-supportive|support gold|supportive)\b/i.test(line);
}

function lineStatesBearish(line) {
  return /\b(bearish|gold may fall|gold could fall|gold may weaken|gold could weaken|gold may decline|gold could decline|gold may retreat|gold could retreat|gold-negative|pressure gold|gold may face pressure)\b/i.test(line);
}

function lineHasStrongNfpRisingYields(line) {
  return /\b(NFP|labor|payroll|employment)\b/i.test(line)
    && /\b(strengthens?|strong|stronger)\b/i.test(line)
    && /\b(yields?\/USD\s+rise|USD\/yields?\s+rise|yields?\s+and\s+USD\s+rise|USD\s+and\s+yields?\s+rise|rising\s+USD\/yields?|rising\s+yields?\/USD)\b/i.test(line);
}

function lineHasWeakNfpFallingYields(line) {
  return /\b(NFP|labor|payroll|employment)\b/i.test(line)
    && /\b(weakens?|weak|weaker)\b/i.test(line)
    && /\b(yields?\/USD\s+fall|USD\/yields?\s+fall|yields?\s+and\s+USD\s+fall|USD\s+and\s+yields?\s+fall|falling\s+USD\/yields?|falling\s+yields?\/USD)\b/i.test(line);
}


function safeValue(x, fallback = "missing") {
  return x === undefined || x === null || x === "" ? fallback : x;
}

function describeTechnicalForSafeReport(tech, reportContext = {}) {
  if (!tech) {
    return {
      summary: "Technical context is unavailable.",
      evidenceRowState: "Unavailable",
      implication: "No technical confirmation",
      reliability: "missing",
      usable: false,
      section: "Technical context is unavailable and cannot confirm, weaken, or contradict the macro scenario.",
      alignment: "unavailable",
    };
  }

  if (tech.usableForScenario === false || tech.status === "unreliable") {
    const issues = (tech.sanityIssues || []).join(", ") || "not specified";
    return {
      summary: `Technical context is unreliable/masked. Sanity issues: ${issues}.`,
      evidenceRowState: `Masked/unreliable (${issues})`,
      implication: "Not usable as directional evidence",
      reliability: tech.reliability || tech.status || "unreliable",
      usable: false,
      section: `Technical context is unreliable/masked and unusable for scenario evidence. Sanity issues: ${issues}. Technical context must not confirm, weaken, or contradict the macro scenario until usableForScenario=true.`,
      alignment: "unusable",
    };
  }

  const tfKey = Object.keys(tech.timeframes || {})[0];
  const tf = tfKey ? tech.timeframes[tfKey] : {};
  const selected = tech.sourceSelection?.selected;
  const sourceText = selected
    ? `${selected.sourceName}:${selected.symbol} ${selected.range}/${selected.interval}`
    : `${tech.sourceName || "unknown"}:${tech.symbol || "unknown"}`;

  const bias = tech.technicalBias || "unknown";
  const conf = tech.technicalConfidence ?? "unknown";
  const trend = tf.trend || "unknown";
  const momentum = tf.momentum || "unknown";
  const priceVs = tf.priceVsEMA200 || "unknown";
  const rsi = tf.rsi14 ?? "unknown";
  const atr = tf.atr14 ?? "unknown";
  const ema20 = tf.ema20 ?? "unknown";
  const ema50 = tf.ema50 ?? "unknown";
  const ema200 = tf.ema200 ?? "unknown";
  const macdText = tf.macd ? `MACD=${tf.macd.macd}/${tf.macd.signal}/hist ${tf.macd.histogram} (${tf.macd.state})` : "MACD=not available";
  const adxText = tf.adx14 ? `ADX14=${tf.adx14.adx}, +DI=${tf.adx14.plusDI}, -DI=${tf.adx14.minusDI}, strength=${tf.adx14.trendStrength}, direction=${tf.adx14.direction}` : "ADX14=not available";
  const bollingerText = tf.bollinger20 ? `Bollinger20 position=${tf.bollinger20.position}, upper=${tf.bollinger20.upper}, middle=${tf.bollinger20.middle}, lower=${tf.bollinger20.lower}, bandwidth=${tf.bollinger20.bandwidthPct}%` : "Bollinger20=not available";
  const keltnerText = tf.keltner20 ? `Keltner20 position=${tf.keltner20.position}, upper=${tf.keltner20.upper}, middle=${tf.keltner20.middle}, lower=${tf.keltner20.lower}, width=${tf.keltner20.widthPct}%` : "Keltner20=not available";
  const stochRsiText = tf.stochRsi14 ? `StochRSI14 K=${tf.stochRsi14.k}, D=${tf.stochRsi14.d}, state=${tf.stochRsi14.state}` : "StochRSI14=not available";
  const candleContext = tech.candlestickPatterns || tf.candlestickPatterns || null;
  const candleText = candleContext?.available
    ? `Candlestick patterns=${candleContext.status}, bias=${candleContext.bias}, score=${candleContext.score}, names=${(candleContext.patterns || []).map((p) => p.name).join(", ") || "none"}`
    : "Candlestick patterns=unavailable";
  const languageHint = tech.technicalLanguageHints || tf.technicalLanguageHints || null;
  const languageHintText = languageHint?.requiredPhrase
    ? `Required RSI/StochRSI wording: ${languageHint.requiredPhrase}`
    : "Required RSI/StochRSI wording: not available";
  const expandedScoreText = tf.expandedIndicatorScore ?? "unknown";
  const strategy = tech.strategyModules || tf.strategyModules || {};
  const modules = strategy.modules || {};
  const strategyText = strategy.available
    ? `Strategy modules: aggregateBias=${strategy.aggregateBias}, aggregateScore=${strategy.aggregateScore}; trend=${modules.trend?.bias || "unknown"}(${modules.trend?.score ?? "?"}), momentum=${modules.momentum?.bias || "unknown"}(${modules.momentum?.score ?? "?"}), volatility=${modules.volatility?.bias || "unknown"}(${modules.volatility?.score ?? "?"}), structure=${modules.structure?.bias || "unknown"}(${modules.structure?.score ?? "?"})`
    : "Strategy modules=not available";
  const support = Array.isArray(tf.support) && tf.support.length ? tf.support.join(", ") : "not available";
  const resistance = Array.isArray(tf.resistance) && tf.resistance.length ? tf.resistance.join(", ") : "not available";
  const qLabel = tech.dataQuality?.qualityLabel || tech.reliability || "unknown";
  const qScore = tech.dataQuality?.qualityScore ?? "unknown";
  const mtfText = tech.multiTimeframe ? ` Multi-timeframe: bias=${tech.multiTimeframe.bias}, score=${tech.multiTimeframe.score}, conflicts=${(tech.multiTimeframe.conflicts || []).join(", ") || "none"}.` : "";
  const macroLimitationText = reportContext?.macroCoverageComplete
    ? "blank event actual/forecast values"
    : "missing FRED drivers and blank event actual/forecast values";
  const replayLimitationText = reportContext?.replayAvailable
    ? "limited/inconclusive replay evidence"
    : "absent replay evidence";

  return {
    summary: `Technical context is usable as confirmation context only: ${bias} bias, confidence ${conf}, source ${sourceText}, quality ${qLabel}/${qScore}. Expanded indicators: ${macdText}; ${adxText}; ${stochRsiText}. ${strategyText}.${mtfText}`,
    evidenceRowState: `${bias} bias; trend=${trend}; momentum=${momentum}; priceVsEMA200=${priceVs}; MACD=${tf.macd?.state || "unknown"}; ADX=${tf.adx14?.trendStrength || "unknown"}; StochRSI=${tf.stochRsi14?.state || "unknown"}; strategy=${strategy.aggregateBias || "unknown"}; source=${sourceText}`,
    implication: `${bias} technical confirmation context; must not override incomplete macro/event evidence`,
    reliability: qLabel,
    usable: true,
    section: `Technical context is available and usable only as confirmation context, not as a macro override. Selected source: ${sourceText}. Data quality: ${qLabel} with score ${qScore}. Technical bias: ${bias} with confidence ${conf}. On ${tfKey || "selected timeframe"}, trend=${trend}, momentum=${momentum}, priceVsEMA200=${priceVs}, RSI14=${rsi}, ATR14=${atr}, EMA20=${ema20}, EMA50=${ema50}, EMA200=${ema200}. Expanded indicators: ${macdText}; ${adxText}; ${bollingerText}; ${keltnerText}; ${stochRsiText}; expandedIndicatorScore=${expandedScoreText}. ${candleText}. RSI14 and Stochastic RSI are treated separately; Stochastic RSI extremes are not described as RSI extremes. ${languageHintText} ${strategyText}. Support=${support}; resistance=${resistance}. This can confirm, weaken, or contradict macro context, but it cannot override ${macroLimitationText}, weak/rate-limited news, or ${replayLimitationText}.${mtfText}`,
    alignment: bias,
  };
}

function inferMacroTechnicalAlignment(snapshot, techDesc) {
  const macro = String(snapshot?.deterministicScenarioLab?.macroDirection || "mixed").toLowerCase();
  const techBias = String(snapshot?.technicalContext?.technicalBias || "").toLowerCase();

  if (!techDesc.usable) return "Technical alignment is unavailable because technical context is not usable.";

  const macroSupportive = macro.includes("supportive") || macro.includes("bullish") || macro.includes("positive");
  const macroNegative = macro.includes("negative") || macro.includes("bearish");
  const techBullish = techBias.includes("bullish");
  const techBearish = techBias.includes("bearish");

  if (macroSupportive && techBullish) return "Macro and technical context are directionally aligned, but confidence remains capped by missing drivers and event outcomes.";
  if (macroNegative && techBearish) return "Macro and technical context are directionally aligned to the downside, but confidence remains capped by missing drivers and event outcomes.";
  if (macroSupportive && techBearish) return "Technical context contradicts or weakens the supportive macro read; Wait-Neutral is appropriate.";
  if (macroNegative && techBullish) return "Technical context contradicts or weakens the negative macro read; Wait-Neutral is appropriate.";
  return "Macro/technical alignment is mixed or insufficient; Wait-Neutral remains appropriate.";
}


function technicalCaseWording(tech, caseType) {
  const bias = String(tech?.technicalBias || "").toLowerCase();
  const usable = tech?.usableForScenario === true && tech?.status === "available";
  if (!usable) return "Technical context is not usable for this case.";

  if (caseType === "bullish") {
    if (bias.includes("bullish")) return "Technical bias currently supports the bullish conditional case, but it cannot confirm the case without macro/event validation.";
    if (bias.includes("bearish")) return "Technical bias is bearish; therefore it currently weakens the bullish conditional case unless post-event price action reverses.";
    return "Technical bias is neutral/mixed; therefore it does not confirm the bullish conditional case.";
  }

  if (caseType === "bearish") {
    if (bias.includes("bearish")) return "Technical bias is bearish; therefore it currently supports the bearish conditional case, but it cannot confirm the case without macro/event validation.";
    if (bias.includes("bullish")) return "Technical bias is bullish; therefore it currently weakens the bearish conditional case unless post-event price action reverses.";
    return "Technical bias is neutral/mixed; therefore it does not confirm the bearish conditional case.";
  }

  return "Technical context is confirmation/contradiction context only.";
}


function formatRejectedValidationForDisplay(validation) {
  const issues = validation?.issues || [];
  const high = issues.filter((i) => String(i.severity || "").toLowerCase() === "high");
  const medium = issues.filter((i) => String(i.severity || "").toLowerCase() === "medium");
  const low = issues.filter((i) => String(i.severity || "").toLowerCase() === "low");

  const highLines = high.length
    ? high.map((i, idx) => `${idx + 1}. [HIGH] ${i.code}: ${i.message}`).join("\n")
    : "None.";

  const suppressed = medium.length + low.length;
  const suppressedLine = suppressed
    ? `\n\nSuppressed non-critical diagnostics: ${suppressed} item(s) (${medium.length} medium, ${low.length} low). These belong to the rejected raw AI output and are hidden from the main report to avoid confusing the operator.`
    : "";

  return `High-severity rejection reasons only:
${highLines}${suppressedLine}`;
}


function normalizeDebugSnippetText(s) {
  return String(s || "")
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .trim();
}

function extractIssueContextSnippet(rawText, patterns, label, maxChars = 340) {
  const text = String(rawText || "");
  if (!text.trim()) return null;

  for (const pattern of patterns) {
    const re = pattern instanceof RegExp ? pattern : new RegExp(String(pattern), "i");
    const match = re.exec(text);
    if (!match) continue;

    const idx = match.index;
    const start = Math.max(0, idx - Math.floor(maxChars / 2));
    const end = Math.min(text.length, idx + Math.floor(maxChars / 2));
    let snippet = text.slice(start, end);
    snippet = normalizeDebugSnippetText(snippet);

    if (start > 0) snippet = `... ${snippet}`;
    if (end < text.length) snippet = `${snippet} ...`;

    return {
      label,
      snippet,
    };
  }

  return null;
}

function buildRejectedRawAiDebugSnippets(rawOutput, sanitizedOutput, validation) {
  const issues = validation?.issues || [];
  const highCodes = issues
    .filter((i) => String(i.severity || "").toLowerCase() === "high")
    .map((i) => i.code);

  const sourceText = String(rawOutput || "");
  const sanitizedText = String(sanitizedOutput || "");
  const snippets = [];

  if (highCodes.some((c) => /rsi|stoch/i.test(c))) {
    const rsiSnippet = extractIssueContextSnippet(
      sourceText,
      [
        /\bRSI(?:14)?\b[\s\S]{0,120}\b(?:overbought|oversold|extreme|territory|condition|levels?)\b/i,
        /\b(?:EMA alignment|trend|momentum|technical context|technical bias)[^\n]{0,160}\bRSI(?:14)?\s+(?:overbought|oversold)\b/i,
        /\b(?:overbought|oversold|extreme)\b[\s\S]{0,120}\bRSI(?:14)?\b/i,
        /\bStoch(?:astic)?\s*RSI\b[\s\S]{0,140}\b(?:overbought|oversold|extreme)\b/i,
      ],
      "RSI issue context"
    );
    if (rsiSnippet) snippets.push(rsiSnippet);
  }

  if (highCodes.some((c) => /nfp|labor|payroll/i.test(c))) {
    const nfpSnippet = extractIssueContextSnippet(
      sourceText,
      [
        /\bNFP\b[\s\S]{0,180}\b(?:bearish|bullish|fall|rise|yields?|USD|dollar|labor|payroll)\b/i,
        /\b(?:weak|strong)\s+(?:labor|NFP|payrolls?)\b[\s\S]{0,180}\b(?:bearish|bullish|fall|rise|yields?|USD|dollar)\b/i,
        /\b(?:falling|rising)\s+(?:yields?|USD|dollar)\b[\s\S]{0,180}\b(?:NFP|labor|payrolls?)\b/i,
      ],
      "NFP/labor issue context"
    );
    if (nfpSnippet) snippets.push(nfpSnippet);
  }

  if (highCodes.some((c) => /technical_confirmed|confirmed_evidence/i.test(c))) {
    const techSnippet = extractIssueContextSnippet(
      sourceText,
      [
        /Confirmed evidence[\s\S]{0,220}\b(?:technical|technicals|EMA|RSI|MACD|ADX|Bollinger|Keltner|strategy modules?)\b/i,
        /\b(?:technical|technicals|EMA|RSI|MACD|ADX|strategy modules?)\b[\s\S]{0,160}\bconfirmed evidence\b/i,
      ],
      "Technical evidence-label issue context"
    );
    if (techSnippet) snippets.push(techSnippet);
  }

  // If sanitizer changed text, include a very short sanitized-output reference around RSI/technical only.
  if (sanitizedText && sanitizedText !== sourceText && snippets.length < 3) {
    const sanitizedSnippet = extractIssueContextSnippet(
      sanitizedText,
      [
        /Technical confirmation context[\s\S]{0,180}\b(?:technical|EMA|RSI|MACD|ADX|strategy|Stochastic)\b/i,
        /RSI14 is not at a classic extreme[\s\S]{0,120}Stochastic RSI/i,
      ],
      "Post-sanitizer technical wording context"
    );
    if (sanitizedSnippet) snippets.push(sanitizedSnippet);
  }

  const unique = [];
  const seen = new Set();
  for (const s of snippets) {
    const key = `${s.label}:${s.snippet}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(s);
    }
  }

  if (!unique.length) return "";

  return `

RAW AI DEBUG SNIPPETS
These snippets are from the rejected raw AI output and are shown only to diagnose validator patterns. They are not part of the safe report.

${unique.slice(0, 4).map((s) => `${s.label}:
"${s.snippet}"`).join("\n\n")}`;
}


function buildValidationSafeGoldReport(snapshot, validation) {
  const nextMajor = getNextMajorEvent(snapshot) || {};
  const flags = snapshot?.contextQualityFlags || {};
  const tech = snapshot?.technicalContext || {};
  const fredRows = snapshot?.dataReadiness?.fredRows ?? 0;
  const newsItems = snapshot?.dataReadiness?.newsItems ?? 0;
  const replayRecords = snapshot?.dataReadiness?.replayRecords ?? snapshot?.replayEvidence?.count ?? 0;
  const missing = flags.missingCriticalMacroDrivers || [];
  const macroCoverageCompleteForTech = Array.isArray(missing) && missing.length === 0 && Number(fredRows) >= 11;
  const replayAvailableForTech = Number(replayRecords) > 0;
  const techDesc = describeTechnicalForSafeReport(tech, {
    macroCoverageComplete: macroCoverageCompleteForTech,
    replayAvailable: replayAvailableForTech,
  });
  const alignmentText = snapshot?.alignmentContext?.explanation || inferMacroTechnicalAlignment(snapshot, techDesc);
  const latestReplay = snapshot?.replayEvidence?.latest || snapshot?.deterministicScenarioLab?.replaySignal || {};
  const latestReplayMissing = latestReplay?.missingReplay === true;
  const latestReplayAlignment = latestReplay?.alignment || "";
  const latestObservedReaction = latestReplay?.observedReaction || "";
  const replaySignal = Number(replayRecords) > 0 && !latestReplayMissing
    ? (String(latestReplayAlignment).toLowerCase() === "inconclusive"
        ? "available_but_inconclusive"
        : (latestReplayAlignment || latestObservedReaction || "available"))
    : (snapshot?.replayEvidence?.replaySignal || "missing");
  const replayObservedText = Number(replayRecords) > 0 && !latestReplayMissing
    ? `observedReaction=${latestObservedReaction || "unknown"}, alignment=${latestReplayAlignment || "unknown"}`
    : "observedReaction=missing, alignment=missing";
  const replayAvgQuality = snapshot?.replayEvidence?.summary?.avgQuality || 0;
  const macroCoverageComplete = Array.isArray(missing) && missing.length === 0 && Number(fredRows) >= 11;
  const replayAvailable = Number(replayRecords) > 0;
  const replayWording = replayAvailable
    ? "Replay evidence is available but limited/inconclusive; use it only as historical market-reaction context."
    : "Replay evidence is missing; no historical market-reaction validation is available.";

  // v2.41.1.2 initialization-order fix:
  // employment/event wording must be defined before macroWording uses eventEvidenceWording.
  const employmentEvent = snapshot?.employmentEvent || {};
  const employmentPartialFredBackfill = employmentEvent?.status === "partial_fred_backfill";
  const employmentHeadline = employmentEvent?.headline || {};
  const employmentDetails = employmentEvent?.details || {};
  const employmentQuality = employmentEvent?.quality || {};
  const employmentSafeText = employmentPartialFredBackfill
    ? `Prior Employment Situation event is partially available from FRED: PAYEMS actual=${employmentHeadline.actual || "missing"} from ${employmentHeadline.actualSource || "FRED PAYEMS fallback"}; UNRATE=${employmentDetails.unemploymentRate || "missing"} from ${employmentDetails.unemploymentRateSource || "FRED UNRATE fallback"}. Forecast, previous, wage data, and sector composition are still missing, so surpriseDirection=${employmentHeadline.surpriseDirection || "forecast_missing"} and goldImpact=${employmentQuality.goldImpact || "wait_for_confirmation"}.`
    : "";
  const eventEvidenceWording = employmentPartialFredBackfill
    ? "Next CPI actual/forecast values are missing; prior Employment event actual is partially available from FRED, but forecast/previous/sector composition are missing, so labor surprise and labor-quality cannot be confirmed"
    : "event actual/forecast values are missing";
  const employmentEvidenceRow = employmentPartialFredBackfill
    ? `| Employment event intelligence | PAYEMS actual=${employmentHeadline.actual || "missing"} from ${employmentHeadline.actualSource || "FRED PAYEMS fallback"}; UNRATE=${employmentDetails.unemploymentRate || "missing"} from ${employmentDetails.unemploymentRateSource || "FRED UNRATE fallback"}; forecast/previous/sector composition missing | ${employmentQuality.goldImpact || "wait_for_confirmation"}; labor surprise cannot be calculated without forecast | partial_fred_backfill |`
    : "";

  const macroWording = macroCoverageComplete
    ? `Macro driver coverage is complete, but directional confidence remains capped because ${eventEvidenceWording}, news is weak/rate-limited, and replay evidence is limited/inconclusive.`
    : `Macro driver coverage is incomplete; missing critical macro drivers: ${missing.length ? missing.join(", ") : "none listed"}.`;
  const macroEvidenceState = macroCoverageComplete
    ? "Complete FRED coverage; no critical macro drivers missing"
    : `Partial; missing ${missing.length ? missing.join(", ") : "none listed"}`;
  const macroMissingEvidenceText = macroCoverageComplete
    ? "confirmed CPI/PCE outcome, event actual/forecast values, stronger live macro-relevant news, and additional high-quality replay evidence"
    : "confirmed CPI/PCE outcome, complete real-yield and USD drivers, event actual/forecast values, stronger live macro-relevant news, and additional high-quality replay evidence";
  const macroMissingEvidenceTextSafe = macroMissingEvidenceText.replace("event actual/forecast values", employmentPartialFredBackfill ? "next CPI actual/forecast values plus employment forecast/previous/sector composition" : "event actual/forecast values");

  const maxConf = Number(flags.maxRecommendedConfidence ?? 25);
  const safeConfidence = Math.min(maxConf, techDesc.usable ? 25 : 15);

  const nextName = safeValue(nextMajor.name, "No next major event found");
  const nextDate = safeValue(nextMajor.date, "missing date");
  const nextTime = safeValue(nextMajor.time, "missing time");
  const avoidWindow = safeValue(nextMajor.avoidWindow, "missing avoid-window");
  const macroGateHints = snapshot?.macroGateLanguageHints || buildMacroGateLanguageHints();
  const deterministicMacroGates = [
    macroGateHints.nfpWeakYieldUsdDown || "If NFP materially weakens labor expectations and yields/USD fall, then gold may rise.",
    macroGateHints.nfpStrongYieldUsdUp || "If NFP strengthens labor expectations and yields/USD rise, then gold may fall.",
    macroGateHints.cpiHotRealYieldsDown || "If CPI is hot but real yields fall, then gold may rise.",
    macroGateHints.cpiHotRealYieldsUp || "If CPI is hot and real yields rise, then gold may fall.",
  ];

  const validationDisplay = formatRejectedValidationForDisplay(validation);

  const safeReportText = `VALIDATION-GATED SAFE REPORT
The original AI report was rejected because it failed high-severity validation. The following report is generated deterministically from the GoldScope snapshot. The validation list at the end refers to the rejected original AI output, not to this safe report. Non-critical raw-output diagnostics are summarized instead of fully displayed.

1. Dominant research scenario
Wait-Neutral.
The system should not assign a bullish or bearish research scenario because next CPI outcomes are still blank, news strength is weak, and replay evidence is limited/inconclusive. ${macroWording} ${employmentSafeText ? employmentSafeText + " " : ""}${replayWording} ${techDesc.usable ? "Technical context is usable only as confirmation context, not as a standalone scenario driver." : "Technical context is not usable for scenario evidence."} ${alignmentText}

2. Confidence score
${safeConfidence}.
Reason: confidence is capped because source quality is incomplete and high-severity validation errors were detected in the AI output.
Confidence reducers: FRED coverage=${fredRows}/11, macroCoverageComplete=${macroCoverageComplete}, newsStrength=${safeValue(flags.newsStrength)}, macroRelevantNewsCount=${safeValue(flags.macroRelevantNewsCount, 0)}, replayRecords=${replayRecords}, replaySignal=${replaySignal}, ${replayObservedText}, replayAvgQuality=${replayAvgQuality}, technicalStatus=${safeValue(tech.status)}, technicalUsable=${safeValue(tech.usableForScenario)}, eventDataCompleteness=${safeValue(flags.eventDataCompleteness?.nextMajor?.quality)}.

3. Evidence table
| Evidence block | Current state | Gold implication | Reliability |
|---|---|---|---|
| Macro | ${macroEvidenceState} | Direction cannot be confirmed until event surprise, market reaction, and source confirmation are available | ${safeValue(flags.macroReliability)} |
| News | ${newsItems} item(s); newsStrength=${safeValue(flags.newsStrength)}; macroRelevantNewsCount=${safeValue(flags.macroRelevantNewsCount, 0)} | Not sufficient for directional confirmation | ${safeValue(flags.newsStrength)} |
| Calendar/event risk | ${nextName} on ${nextDate} ${nextTime}; next CPI forecast/actual fields are missing | Conditional only | ${safeValue(flags.eventDataCompleteness?.nextMajor?.quality)} |
${employmentEvidenceRow ? employmentEvidenceRow + "\n" : ""}| Replay evidence | ${replayRecords} replay record(s); signal=${replaySignal}; ${replayObservedText}; avgQuality=${replayAvgQuality} | ${replayRecords ? 'Available but limited/inconclusive; historical context only' : 'No historical validation'} | ${safeValue(flags.replayReliability)} |
| Technical context | ${techDesc.evidenceRowState} | ${techDesc.implication} | ${techDesc.reliability} |
| Source/data readiness | FRED rows=${fredRows}; news items=${newsItems}; TradingEconomics/Reddit/YouTube may be missing | Limited source coverage | partial |

4. Bullish case for gold
Confirmed evidence: none.
Conditional evidence: if future labor data weakens expectations and yields/USD fall, gold may receive support; if inflation is hot while real yields fall, gold may receive support. These are conditional gates only because actual and forecast values are missing.
Technical confirmation context: ${techDesc.usable ? technicalCaseWording(tech, "bullish") : "not usable."}
Missing evidence: ${macroMissingEvidenceTextSafe}, and event-time technical reaction.
Invalidation conditions: if labor data strengthens expectations and yields/USD rise, or if hot inflation lifts real yields, the bullish case weakens.

5. Bearish case for gold
Confirmed evidence: none.
Conditional evidence: if future labor data strengthens expectations and yields/USD rise, gold may face pressure; if inflation is hot and real yields rise, gold may face pressure. These are conditional gates only.
Technical confirmation context: ${techDesc.usable ? technicalCaseWording(tech, "bearish") : "not usable."}
Missing evidence: ${macroMissingEvidenceTextSafe}, and event-time technical reaction.
Invalidation conditions: if labor data weakens expectations and yields/USD fall, or if real yields fall despite hot inflation, the bearish case weakens.

6. Wait/neutral case
Wait-Neutral is the appropriate state because the snapshot lacks confirmed next-CPI outcomes and strong macro-relevant news. ${macroWording} ${employmentSafeText ? employmentSafeText + " " : ""}Replay evidence status: ${replayRecords ? `${replayRecords} record(s), signal=${replaySignal}, ${replayObservedText}, avgQuality=${replayAvgQuality}; available but limited/inconclusive` : 'missing'}. ${techDesc.usable ? "Technical context is available, but it is only confirmation context and cannot override missing macro/event evidence. " + alignmentText : "Technical context is not usable as confirmation."}

7. Technical confirmation
${techDesc.section}
Alignment note: ${alignmentText}

8. Decision gates
${deterministicMacroGates.map((gate) => `- ${gate}`).join("\n")}
- If technical context confirms the post-event macro reaction, confidence may improve within the evidence cap.
- If technical context contradicts the post-event macro reaction, keep Wait-Neutral.

9. Next catalyst plan
Next event: ${nextName}.
Date/time: ${nextDate} ${nextTime}.
Before: monitor incoming labor expectations, USD, nominal yields, real yields, and whether technical context remains usable.
After: compare actual event outcome and market reaction in USD/yields/gold, then store replay evidence and check whether technical context confirms or contradicts the reaction.
Avoid-window: ${avoidWindow}.

10. Final research note
This report remains Wait-Neutral because next-CPI outcomes are still blank, prior employment data is only partially available from FRED without forecast/previous/sector composition, news is weak/rate-limited, replay evidence is limited/inconclusive, and the rejected AI output contained validation failures. ${techDesc.usable ? "Technical context is available as confirmation context, but directional bias remains blocked until event outcomes, market reaction, and replay evidence quality improve." : "Directional bias should remain blocked until event outcomes, market reaction, replay evidence quality, and usable technical context improve."} <END_GOLDSCOPE_REPORT>

REJECTED AI OUTPUT VALIDATION
This section explains why the raw AI response was rejected. It is not an error in the safe report.

${validationDisplay}`;
  return safeReportText
    .replace(/confirmed\.,\s*news/gi, "confirmed; news")
    .replace(/confirmed\.,/gi, "confirmed;")
    .replace(/missing\.,\s*news/gi, "missing; news");

}



function collectTechnicalStochRsiValues(snapshot) {
  const tfs = snapshot?.technicalContext?.timeframes || {};
  return Object.values(tfs)
    .map((tf) => Number(tf?.stochRsi14?.k))
    .filter((x) => Number.isFinite(x));
}


function maskStochasticRsiForClassicRsiParsing(reportText) {
  return String(reportText || "")
    .replace(/\bStoch(?:astic)?\s*RSI(?:14)?\s*(?:K|D)?\s*(?:=|:|is|was|reads?|at)?\s*[0-9]{1,3}(?:\.[0-9]+)?/gi, "STOCH_RSI_VALUE_MASKED")
    .replace(/\bStoch(?:astic)?\s*RSI(?:14)?\b/gi, "STOCH_RSI_MASKED");
}

function collectMentionedRsiNumbers(reportText) {
  const s = maskStochasticRsiForClassicRsiParsing(reportText);
  const values = [];

  // Context-isolated classic RSI numeric parser.
  //
  // Captures ONLY tight, direct RSI measurements and excludes Stochastic RSI.
  // Stochastic RSI is validated separately by the StochRSI validator.
  //
  // Valid measured-value examples:
  //   RSI14=43.61
  //   RSI14: 43.61
  //   RSI is 43.61
  //   RSI was 43.61
  //   RSI reads 43.61
  //   RSI at 43.61
  //
  // Invalid/non-value examples:
  //   Stochastic RSI is overbought (85)
  //   RSI below 30
  //   RSI < 30
  //   RSI above 70
  //   news confidence 65
  const patterns = [
    /\bRSI(?:14)?\s*(?:=|:)\s*([0-9]{1,3}(?:\.[0-9]+)?)/gi,
    /\bRSI(?:14)?\s+(?:is|was|reads?|at)\s+([0-9]{1,3}(?:\.[0-9]+)?)/gi,
    /\bRSI\s*\(\s*14\s*\)\s*(?:=|:)\s*([0-9]{1,3}(?:\.[0-9]+)?)/gi,
  ];

  for (const p of patterns) {
    for (const m of s.matchAll(p)) {
      const full = String(m[0] || "");

      // Reject threshold/comparator phrases even if they accidentally match future wording.
      if (/\b(?:below|under|less than|<|above|over|greater than|>)\b/i.test(full)) continue;
      if (/\b(?:threshold|level|classic|overbought|oversold)\b/i.test(full)) continue;
      if (/STOCH_RSI/i.test(full)) continue;

      const n = Number(m[1]);
      if (Number.isFinite(n) && n >= 0 && n <= 100) {
        values.push(Number(n.toFixed(2)));
      }
    }
  }

  return [...new Set(values)];
}

function rsiMentionMatchesSnapshot(value, snapshotRsiValues) {
  const mentioned = Number(value);
  if (!Number.isFinite(mentioned)) return true;

  // v2.37.2: allow integer rounded RSI mentions.
  // Example: AI says RSI14: 28 and snapshot has 28.99 -> acceptable.
  const isIntegerMention = Number.isInteger(mentioned);
  const tolerance = isIntegerMention ? 1.0 : 0.15;

  return snapshotRsiValues.some((r) => Math.abs(Number(r) - mentioned) <= tolerance);
}

function mentionsAlignmentActionAsStrategyModule(reportText, snapshot) {
  const action = String(snapshot?.alignmentContext?.action || "");
  if (!action) return false;
  const escaped = action.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`strategy modules?[\\s\\S]{0,120}${escaped}|${escaped}[\\s\\S]{0,120}strategy modules?`, "i");
  return re.test(String(reportText || ""));
}


function collectTechnicalRsiValues(snapshot) {
  const tfs = snapshot?.technicalContext?.timeframes || {};
  return Object.values(tfs)
    .map((tf) => Number(tf?.rsi14))
    .filter((x) => Number.isFinite(x));
}

function getSectionText(reportText, sectionNumberOrTitle) {
  const s = String(reportText || "");
  const n = String(sectionNumberOrTitle);
  const re = new RegExp(`(?:^|\\n)\\s*${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.?[\\s\\S]*?(?=\\n\\s*\\d+\\.|$)`, "i");
  const m = s.match(re);
  return m ? m[0] : "";
}

function technicalBiasDirection(snapshot) {
  return String(snapshot?.technicalContext?.multiTimeframe?.bias || snapshot?.technicalContext?.technicalBias || "").toLowerCase();
}

function reportMentionsTechnicalConfirmedEvidence(text) {
  const s = String(text || "");
  const bearish = getSectionText(s, "5");
  const bullish = getSectionText(s, "4");
  const joined = `${bullish}\n${bearish}`;

  // Direct line-level guard: "Confirmed evidence: Technical context ..."
  if (/Confirmed evidence\s*:\s*[^\n]*(technical context|technical bias|technicals|strategy modules?|EMA|RSI|MACD|ADX|Bollinger|Keltner|Stoch(?:astic)?\s*RSI)/i.test(joined)) {
    return true;
  }

  // Multi-line guard: Confirmed evidence followed shortly by technical-only language
  if (/Confirmed evidence\s*:[\s\S]{0,220}(technical context|technical bias|technicals|strategy modules?|EMA alignment|RSI14|MACD|ADX|Bollinger|Keltner|Stoch(?:astic)?\s*RSI)/i.test(joined)) {
    return true;
  }

  return /Confirmed evidence\s*:\s*(?:[^\n]*technical|[\s\S]{0,180}technical context|[\s\S]{0,180}technical bias|[\s\S]{0,180}bearish bias|[\s\S]{0,180}bullish bias)/i.test(joined);
}

function hasThinkingArtifactLocal(text) {
  return /<\/think>|<think>|\/think\b|Okay,\s*the user wants|Let me\s|I need to\s|chain[- ]of[- ]thought|hidden reasoning|private thinking|reasoning artifact/i.test(String(text || ""));
}

function sectionMentionsTechnicalWeakensBullish(text) {
  const bullish = getSectionText(text, "4");
  return /(technical|multi[- ]timeframe)[\s\S]{0,160}(weakens|contradicts|does not support|undermines)[\s\S]{0,120}(bullish|upside)/i.test(bullish)
    || /(bearish technical|technical bias is bearish)[\s\S]{0,160}(weakens|contradicts|does not support|undermines)/i.test(bullish);
}

function sectionMentionsTechnicalSupportsBearish(text) {
  const bearish = getSectionText(text, "5");
  return /(technical|multi[- ]timeframe)[\s\S]{0,160}(supports|strengthens|confirms as context|adds confirmation context)[\s\S]{0,120}(bearish|downside)/i.test(bearish)
    || /(bearish technical|technical bias is bearish)[\s\S]{0,160}(supports|strengthens|adds)/i.test(bearish);
}

function sectionMentionsTechnicalWeakensBearish(text) {
  const bearish = getSectionText(text, "5");
  return /(technical|multi[- ]timeframe)[\s\S]{0,160}(weakens|contradicts|does not support|undermines)[\s\S]{0,120}(bearish|downside)/i.test(bearish)
    || /(bullish technical|technical bias is bullish)[\s\S]{0,160}(weakens|contradicts|does not support|undermines)/i.test(bearish);
}

function sectionMentionsTechnicalSupportsBullish(text) {
  const bullish = getSectionText(text, "4");
  return /(technical|multi[- ]timeframe)[\s\S]{0,160}(supports|strengthens|confirms as context|adds confirmation context)[\s\S]{0,120}(bullish|upside)/i.test(bullish)
    || /(bullish technical|technical bias is bullish)[\s\S]{0,160}(supports|strengthens|adds)/i.test(bullish);
}


function sanitizeRawAiTechnicalEvidenceLanguage(rawOutput, snapshot) {
  let out = String(rawOutput || "");
  const hint = snapshot?.technicalContext?.technicalLanguageHints;
  const phrase = hint?.requiredPhrase;

  if (!phrase) {
    return {
      output: out,
      applied: false,
      changes: [],
    };
  }

  const changes = [];

  function replaceAndTrack(regex, replacement, label) {
    const before = out;
    out = out.replace(regex, replacement);
    if (out !== before) changes.push(label);
  }

  function replaceClassicRsiExtremeClaim(regex, replacement, label) {
    const before = out;
    // Protect Stochastic RSI from classic RSI replacements.
    const protectedPhrases = [];
    let protectedOut = out.replace(/\bStoch(?:astic)?\s+RSI(?:14)?\s+(?:is\s+)?(?:overbought|oversold)\b/gi, (m) => {
      const token = `__GOLDSCOPE_STOCH_RSI_${protectedPhrases.length}__`;
      protectedPhrases.push([token, m]);
      return token;
    });

    protectedOut = protectedOut.replace(regex, replacement);

    for (const [token, original] of protectedPhrases) {
      protectedOut = protectedOut.replaceAll(token, original);
    }

    out = protectedOut;
    if (out !== before) changes.push(label);
  }

  // Scope: technical wording only.
  // Do NOT alter macro decision gates, NFP logic, CPI/yield logic, event outcomes, or scenario labels.
  // 1) Prevent technical-only evidence from being framed as "Confirmed evidence".
  replaceAndTrack(
    /Confirmed evidence\s*:\s*(?=(?:[^\n]*(?:Technical context|technical context|Technicals|technicals|Technical bias|technical bias|EMA|RSI|MACD|ADX|Bollinger|Keltner|Stoch(?:astic)?\s*RSI|strategy modules?)))/g,
    "Technical confirmation context: ",
    "technical_confirmed_evidence_header"
  );

  replaceAndTrack(
    /Confirmed evidence\s*:\s*\n(?=\s*[-*]?\s*(?:Technical context|technical context|Technicals|technicals|Technical bias|technical bias|EMA|RSI|MACD|ADX|Bollinger|Keltner|Stoch(?:astic)?\s*RSI|strategy modules?))/g,
    "Technical confirmation context:\n",
    "technical_confirmed_evidence_multiline_header"
  );

  // 2) Targeted classic RSI/StochRSI conflation sanitizer.
  // Only sanitize definitive classic RSI extreme claims.
  // Do NOT modify "Stochastic RSI is overbought/oversold".
  const definitiveRsiExtremePatterns = [
    {
      regex: /\bRSI(?:14)?\s+is\s+overbought\b/gi,
      label: "rsi_is_overbought_to_required_phrase",
    },
    {
      regex: /\bRSI(?:14)?\s+shows\s+overbought\b/gi,
      label: "rsi_shows_overbought_to_required_phrase",
    },
    {
      regex: /\bRSI(?:14)?\s+indicates\s+overbought\b/gi,
      label: "rsi_indicates_overbought_to_required_phrase",
    },
    {
      regex: /\bRSI(?:14)?\s+remains\s+overbought\b/gi,
      label: "rsi_remains_overbought_to_required_phrase",
    },
    {
      regex: /\boverbought\s+RSI(?:14)?\b/gi,
      label: "overbought_rsi_to_required_phrase",
    },
    {
      regex: /\bRSI(?:14)?\s+is\s+oversold\b/gi,
      label: "rsi_is_oversold_to_required_phrase",
    },
    {
      regex: /\bRSI(?:14)?\s+shows\s+oversold\b/gi,
      label: "rsi_shows_oversold_to_required_phrase",
    },
    {
      regex: /\bRSI(?:14)?\s+indicates\s+oversold\b/gi,
      label: "rsi_indicates_oversold_to_required_phrase",
    },
    {
      regex: /\bRSI(?:14)?\s+remains\s+oversold\b/gi,
      label: "rsi_remains_oversold_to_required_phrase",
    },
    {
      regex: /\boversold\s+RSI(?:14)?\b/gi,
      label: "oversold_rsi_to_required_phrase",
    },
  ];

  for (const item of definitiveRsiExtremePatterns) {
    replaceClassicRsiExtremeClaim(item.regex, phrase, item.label);
  }

  // 3) If a line explicitly says technicals are confirmed evidence, downgrade wording.
  replaceAndTrack(
    /\btechnical(?:s| context| bias)?\s+(?:is|are)\s+confirmed evidence\b/gi,
    "technical context is confirmation context",
    "technical_confirmed_sentence"
  );

  return {
    output: out,
    applied: changes.length > 0,
    changes: [...new Set(changes)],
  };
}



function containsDefinitiveRsiOverboughtClaim(reportText) {
  const s = String(reportText || "");

  // Remove Stochastic RSI phrases before testing classic RSI.
  // This prevents "Stochastic RSI overbought" from being mistaken as "RSI overbought".
  const classicOnly = s.replace(/\bStoch(?:astic)?\s+RSI(?:14)?\b/gi, "STOCH_RSI_INDICATOR");

  const patterns = [
    /\bRSI(?:14)?\s+is\s+overbought\b/i,
    /\bRSI(?:14)?\s+shows\s+overbought\b/i,
    /\bRSI(?:14)?\s+indicates\s+overbought\b/i,
    /\bRSI(?:14)?\s+remains\s+overbought\b/i,
    /\boverbought\s+RSI(?:14)?\b/i,

    // v2.40.16: bare definitive phrases caught after false negative:
    // "EMA alignment, RSI overbought", "trend, RSI overbought", "RSI14 overbought".
    /\bRSI(?:14)?\s+overbought\b/i,
    /\b(?:EMA alignment|trend|momentum|technical context|technical bias|bearish|bullish)[^.\n]{0,120}\bRSI(?:14)?\s+overbought\b/i,
    /\bRSI(?:14)?\s+overbought[^.\n]{0,120}\b(?:EMA alignment|trend|momentum|technical context|technical bias|bearish|bullish)\b/i,
  ];

  return patterns.some((p) => p.test(classicOnly));
}

function containsDefinitiveRsiOversoldClaim(reportText) {
  const s = String(reportText || "");

  // Remove Stochastic RSI phrases before testing classic RSI.
  const classicOnly = s.replace(/\bStoch(?:astic)?\s+RSI(?:14)?\b/gi, "STOCH_RSI_INDICATOR");

  const patterns = [
    /\bRSI(?:14)?\s+is\s+oversold\b/i,
    /\bRSI(?:14)?\s+shows\s+oversold\b/i,
    /\bRSI(?:14)?\s+indicates\s+oversold\b/i,
    /\bRSI(?:14)?\s+remains\s+oversold\b/i,
    /\boversold\s+RSI(?:14)?\b/i,

    // v2.40.16: bare definitive phrases.
    /\bRSI(?:14)?\s+oversold\b/i,
    /\b(?:EMA alignment|trend|momentum|technical context|technical bias|bearish|bullish)[^.\n]{0,120}\bRSI(?:14)?\s+oversold\b/i,
    /\bRSI(?:14)?\s+oversold[^.\n]{0,120}\b(?:EMA alignment|trend|momentum|technical context|technical bias|bearish|bullish)\b/i,
  ];

  return patterns.some((p) => p.test(classicOnly));
}


function validateAiGoldReport(output, snapshot) {
  const hasThinkingArtifactLocal = (value) =>
    /<\s*\/?\s*think(?:ing)?\s*>|\/think\b|\breasoning artifact\b|\binternal planning text\b/i.test(String(value || ""));


  const hasMarkdownTechnicalConfirmedEvidenceLocal = (reportText) => {
    const s = String(reportText || "");
    const confirmedLabel = String.raw`(?:[-*]\s*)?(?:\*\*)?\s*Confirmed evidence\s*(?:\*\*)?\s*:`;
    const techTerms = String.raw`(?:Technical context|technical context|Technicals|technicals|technical bias|EMA|RSI|MACD|ADX|Bollinger|Keltner|Stoch(?:astic)?\s*RSI|strategy\s*modules?|StrategyModules)`;
    const sameLine = new RegExp(`${confirmedLabel}[^\\n]{0,260}\\b${techTerms}\\b`, "i");
    const nextLine = new RegExp(`${confirmedLabel}\\s*\\n\\s*(?:[-*]\\s*)?[^\\n]{0,220}\\b${techTerms}\\b`, "i");
    return sameLine.test(s) || nextLine.test(s);
  };

  const isFinalResearchNoteTruncatedLocal = (reportText) => {
    const s = String(reportText || "").trim();
    const finalIdx = s.search(/10\.\s*(?:\*\*)?\s*Final research note/i);
    if (finalIdx === -1) return false;

    const tail = s.slice(finalIdx).trim();
    if (tail.includes("<END_GOLDSCOPE_REPORT>")) return false;

    const afterHeader = tail
      .replace(/^10\.\s*(?:\*\*)?\s*Final research note(?:\*\*)?\s*/i, "")
      .replace(/^[-:\s]+/, "")
      .trim();

    if (!afterHeader) return true;
    if (afterHeader.length < 90) return true;

    const lastLine = afterHeader.split(/\n/).map((x) => x.trim()).filter(Boolean).pop() || "";
    const incompleteEnding = /\b(?:and|or|but|because|with|without|while|until|unless|bear|bull|bullish|bearish|macro|technical|event|replay)$/i.test(lastLine);
    const hasTerminalPunctuation = /[.!?]$/.test(lastLine);

    return incompleteEnding || !hasTerminalPunctuation;
  };

  const hasTechnicalPredictionOverclaimLocal = (reportText) => {
    const s = String(reportText || "");
    const patterns = [
      /\btechnical context\b[\s\S]{0,220}\blikely to continue (?:a |the )?(?:downward|upward|bearish|bullish)?\s*trend\b/i,
      /\btechnical(?:s| context| bias)?\b[\s\S]{0,180}\bwill continue\b/i,
      /\btechnical(?:s| context| bias)?\b[\s\S]{0,180}\bconfirms? bearish trend\b/i,
      /\btechnical(?:s| context| bias)?\b[\s\S]{0,180}\bconfirms? bullish trend\b/i,
      /\bconfirmed bearish evidence\b/i,
      /\bconfirmed bullish evidence\b/i,
      /\blikely to continue downward trend\b/i,
      /\blikely to continue upward trend\b/i,
    ];
    return patterns.some((p) => p.test(s));
  };

  const getExpectedAvoidWindowLocal = (snap) => {
    return String(
      snap?.deterministicScenarioLab?.nextMajor?.avoidWindow ||
      snap?.calendar?.nextMajor?.avoidWindow ||
      ""
    ).trim();
  };

  const getExpectedNextEventNameLocal = (snap) => {
    return String(
      snap?.deterministicScenarioLab?.nextMajor?.name ||
      snap?.calendar?.nextMajor?.name ||
      ""
    ).trim();
  };

  const hasAvoidWindowExactMismatchLocal = (reportText, snap) => {
    const expected = getExpectedAvoidWindowLocal(snap);
    if (!expected) return false;
    const s = String(reportText || "");
    if (!/avoid[- ]window/i.test(s)) return false;
    return !s.includes(expected);
  };

  const hasNextEventExactMismatchLocal = (reportText, snap) => {
    const expected = getExpectedNextEventNameLocal(snap);
    if (!expected) return false;
    const s = String(reportText || "");
    if (!/Next event/i.test(s)) return false;

    const nextEventLine = (s.match(/(?:^|\n)\s*[-*]?\s*(?:\*\*)?\s*Next event(?:\*\*)?\s*:?[^\n]*/i) || [])[0] || "";
    if (!nextEventLine) return false;

    // The exact event name must be present, and "(nextMajor event)" should not be used as a substitute label.
    if (!nextEventLine.includes(expected)) return true;
    if (/\(nextMajor event\)/i.test(nextEventLine)) return true;
    return false;
  };


  const extractDominantScenarioFromReportLocal = (reportText) => {
    const s = String(reportText || "");
    const firstSection = s.slice(0, 1400);

    const direct = /Dominant research scenario\s*(?:\n|\r|:|\*\*)+\s*(?:\*\*)?\s*(Bullish|Bearish|Wait[-/ ]?Neutral|Wait\s*\/\s*neutral)/i.exec(firstSection);
    if (direct) {
      const v = direct[1].toLowerCase();
      if (v.includes("bullish")) return "bullish";
      if (v.includes("bearish")) return "bearish";
      return "wait-neutral";
    }

    const bold = /\*\*\s*(Bullish|Bearish|Wait[-/ ]?Neutral|Wait\s*\/\s*neutral)\s*\*\*/i.exec(firstSection);
    if (bold) {
      const v = bold[1].toLowerCase();
      if (v.includes("bullish")) return "bullish";
      if (v.includes("bearish")) return "bearish";
      return "wait-neutral";
    }

    return "unknown";
  };

  const snapshotRequiresWaitNeutralScenarioLocal = (snap) => {
    const det = String(snap?.deterministicScenarioLab?.dominant || "").toLowerCase();
    const replayRecords = Number(snap?.dataReadiness?.replayRecords ?? snap?.replayEvidence?.count ?? 0);
    const eventQuality = String(snap?.contextQualityFlags?.eventDataCompleteness?.nextMajor?.quality || "").toLowerCase();
    const missingCritical = snap?.contextQualityFlags?.missingCriticalMacroDrivers || [];

    return (
      det.includes("wait") &&
      replayRecords === 0 &&
      eventQuality === "date-only" &&
      Array.isArray(missingCritical) &&
      missingCritical.length > 0
    );
  };

  const reportAdmitsDirectionalConfirmationMissingLocal = (reportText) => {
    const s = String(reportText || "");
    return /(?:event outcomes?|actual\/forecast|forecast\/actual|replay evidence|replay records?|post-event evidence)[\s\S]{0,120}(?:still required|required|missing|absent|blank|not available|needed|not confirmed)/i.test(s)
      || /(?:still required|required|missing|absent|blank|not available|needed|not confirmed)[\s\S]{0,120}(?:event outcomes?|actual\/forecast|forecast\/actual|replay evidence|replay records?|post-event evidence)/i.test(s);
  };

  const collectTechnicalSnapshotNumbersLocal = (snap) => {
    const tech = snap?.technicalContext || {};
    const nums = [];

    const add = (n, label) => {
      const v = Number(n);
      if (Number.isFinite(v)) nums.push({ value: Number(v.toFixed(2)), label });
    };

    const tfs = tech.timeframes || {};
    for (const [tfName, tf] of Object.entries(tfs)) {
      add(tf?.rsi14, `${tfName}.rsi14`);
      add(tf?.atr14, `${tfName}.atr14`);
      add(tf?.ema20, `${tfName}.ema20`);
      add(tf?.ema50, `${tfName}.ema50`);
      add(tf?.ema200, `${tfName}.ema200`);
      add(tf?.lastPrice, `${tfName}.lastPrice`);
      add(tf?.previousClose, `${tfName}.previousClose`);
      add(tf?.macd?.macd, `${tfName}.macd`);
      add(tf?.macd?.signal, `${tfName}.macd.signal`);
      add(tf?.macd?.histogram, `${tfName}.macd.histogram`);
      add(tf?.adx14?.adx, `${tfName}.adx`);
      add(tf?.adx14?.plusDI, `${tfName}.plusDI`);
      add(tf?.adx14?.minusDI, `${tfName}.minusDI`);
      add(tf?.stochRsi14?.k, `${tfName}.stochRsiK`);
      add(tf?.stochRsi14?.d, `${tfName}.stochRsiD`);
      for (const x of tf?.support || []) add(x, `${tfName}.support`);
      for (const x of tf?.resistance || []) add(x, `${tfName}.resistance`);
    }

    add(tech.technicalConfidence, "technicalConfidence");
    add(tech.dataQuality?.qualityScore, "dataQuality.qualityScore");
    add(tech.candleCount, "candleCount");

    return nums;
  };

  const numberApproximatelyMatchesSnapshotLocal = (value, snapshotNumbers) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return true;
    return snapshotNumbers.some((x) => Math.abs(Number(x.value) - n) <= 0.15);
  };

  const collectMentionedTechnicalNumericClaimsLocal = (reportText) => {
    const s = String(reportText || "");
    const claims = [];

    const measurementVerbs = String.raw`(?:=|:|is|at|was|reads?)`;

    // v2.37.3:
    // This generic technical numeric parser must capture only measured-value claims,
    // not threshold/comparator expressions.
    //
    // Numeric fact claims:
    //   RSI14 = 28.5
    //   RSI14: 28.5
    //   RSI14 is 28.5
    //   RSI14 reads 28.5
    //
    // Not numeric fact claims:
    //   RSI14 < 30
    //   RSI14 > 70
    //   RSI below 30
    //   RSI above 70
    //   Stochastic RSI > 80
    //   Stochastic RSI < 20
    const patterns = [
      {
        label: "RSI14",
        re: new RegExp(String.raw`\bRSI(?:14)?\s*${measurementVerbs}\s*([0-9]{1,4}(?:\.[0-9]+)?)`, "gi"),
      },
      {
        label: "ATR14",
        re: new RegExp(String.raw`\bATR(?:14)?\s*${measurementVerbs}\s*([0-9]{1,5}(?:\.[0-9]+)?)`, "gi"),
      },
      {
        label: "EMA",
        re: new RegExp(String.raw`\bEMA(?:20|50|200)?\s*${measurementVerbs}\s*([0-9]{1,6}(?:\.[0-9]+)?)`, "gi"),
      },
      {
        label: "MACD",
        re: new RegExp(String.raw`\bMACD\s*${measurementVerbs}\s*(-?[0-9]{1,5}(?:\.[0-9]+)?)`, "gi"),
      },
      {
        label: "ADX",
        re: new RegExp(String.raw`\bADX(?:14)?\s*${measurementVerbs}\s*([0-9]{1,4}(?:\.[0-9]+)?)`, "gi"),
      },
      {
        label: "StochRSI",
        re: new RegExp(String.raw`\bStoch(?:astic)?\s*RSI(?:14)?(?:\s*K|\s*D)?\s*${measurementVerbs}\s*([0-9]{1,4}(?:\.[0-9]+)?)`, "gi"),
      },
    ];

    const comparatorOrThreshold = /(?:<|>|<=|>=|\bbelow\b|\bunder\b|\babove\b|\bover\b|\bless than\b|\bgreater than\b|\bthreshold\b|\blevel\b)/i;

    for (const item of patterns) {
      for (const m of s.matchAll(item.re)) {
        const full = String(m[0] || "");

        // Explicitly exclude comparator / threshold expressions.
        if (comparatorOrThreshold.test(full)) continue;

        // Defensive window check: if the matched value is immediately followed by threshold language,
        // do not treat it as a measured-value fact claim.
        const post = s.slice(m.index + full.length, m.index + full.length + 30);
        if (/^\s*(?:threshold|level|line|zone)\b/i.test(post)) continue;

        const value = Number(m[1]);
        if (Number.isFinite(value)) claims.push({ label: item.label, value, text: full });
      }
    }

    return claims;
  };

  const reportUsesDataQualityWarningAsMarketSignalLocal = (reportText) => {
    const s = String(reportText || "");
    return /many_invalid_ohlc_removed[\s\S]{0,180}\b(?:volatility|ATR|trend|bearish|bullish|momentum|signal|market|price action|high volatility)\b/i.test(s)
      || /\b(?:volatility|ATR|trend|bearish|bullish|momentum|signal|market|price action|high volatility)\b[\s\S]{0,180}many_invalid_ohlc_removed/i.test(s);
  };


  const issues = [];
  const text = String(output || "");
  const lower = text.toLowerCase();

  // 0a) markdown evidence-label, completion, and exact-field validation
  if (hasMarkdownTechnicalConfirmedEvidenceLocal(text)) {
    issues.push({
      severity: "high",
      code: "technical_confirmed_evidence_error",
      message: "AI placed technical context or technical indicators under Confirmed evidence, including markdown-formatted evidence labels. Technicals are confirmation/contradiction context only.",
    });
  }

  if (/Confirmed evidence\s*(?:\*\*)?\s*:?[^\n]{0,260}\b(?:candlestick|Doji|Hammer|Engulfing|Morning Star|Evening Star|Shooting Star|Harami)\b/i.test(text)) {
    issues.push({
      severity: "high",
      code: "candlestick_confirmed_evidence_error",
      message: "AI placed candlestick patterns under Confirmed evidence. Candlestick patterns are technical confirmation context only.",
    });
  }

  if (/\b(?:candlestick|Doji|Hammer|Engulfing|Morning Star|Evening Star|Shooting Star|Harami)\b[\s\S]{0,180}\b(?:will|guarantees?|confirms? a move|proves?|trade signal|entry|exit)\b/i.test(text)) {
    issues.push({
      severity: "medium",
      code: "candlestick_prediction_overclaim",
      message: "AI used candlestick patterns as predictive or trade-signal language. They are confirmation context only.",
    });
  }

  if (!text.includes("<END_GOLDSCOPE_REPORT>") && isFinalResearchNoteTruncatedLocal(text)) {
    issues.push({
      severity: "high",
      code: "incomplete_final_report_error",
      message: "AI output is missing <END_GOLDSCOPE_REPORT> and the Final research note appears truncated or unfinished.",
    });
  }

  if (hasTechnicalPredictionOverclaimLocal(text)) {
    issues.push({
      severity: "medium",
      code: "technical_prediction_overclaim",
      message: "AI used technical context as predictive/confirmed trend language. Technical context is confirmation context only and must not imply trend continuation without macro/event/replay confirmation.",
    });
  }

  if (hasAvoidWindowExactMismatchLocal(text, snapshot)) {
    issues.push({
      severity: "medium",
      code: "avoid_window_exact_mismatch",
      message: `AI did not copy the avoid-window exactly. Expected: "${getExpectedAvoidWindowLocal(snapshot)}".`,
    });
  }

  if (hasNextEventExactMismatchLocal(text, snapshot)) {
    issues.push({
      severity: "medium",
      code: "next_event_exact_mismatch",
      message: `AI did not use the exact nextMajor event name cleanly. Expected: "${getExpectedNextEventNameLocal(snapshot)}".`,
    });
  }

  // 0) dominant scenario overclaim and technical fact checks
  const aiDominant = extractDominantScenarioFromReportLocal(text);
  if (snapshotRequiresWaitNeutralScenarioLocal(snapshot) && (aiDominant === "bullish" || aiDominant === "bearish")) {
    issues.push({
      severity: "high",
      code: "dominant_scenario_overclaim_error",
      message: "AI selected a directional dominant scenario even though deterministicScenarioLab is Wait/neutral, replayRecords=0, next event data is date-only, and critical macro drivers are missing.",
    });
  }

  if ((aiDominant === "bullish" || aiDominant === "bearish") && reportAdmitsDirectionalConfirmationMissingLocal(text)) {
    issues.push({
      severity: "high",
      code: "self_contradictory_directional_scenario_error",
      message: "AI selected a directional scenario while also stating that event outcomes or replay evidence are still required/missing.",
    });
  }

  const snapshotTechNumbers = collectTechnicalSnapshotNumbersLocal(snapshot);
  const technicalClaims = collectMentionedTechnicalNumericClaimsLocal(text);
  for (const claim of technicalClaims) {
    if (!numberApproximatelyMatchesSnapshotLocal(claim.value, snapshotTechNumbers)) {
      issues.push({
        severity: "high",
        code: "technical_numeric_fact_error",
        message: `AI mentioned a technical numeric value not found in the snapshot: ${claim.label} value ${claim.value} in "${claim.text}".`,
      });
      break;
    }
  }

  if (reportUsesDataQualityWarningAsMarketSignalLocal(text)) {
    issues.push({
      severity: "medium",
      code: "data_quality_warning_used_as_market_signal",
      message: "AI appears to treat many_invalid_ohlc_removed as a volatility/trend/market signal. It is a data-quality warning, not market evidence.",
    });
  }

  // 1) invented numeric thresholds when actual/forecast values are blank
  const hasBlankEventForecasts = !snapshot?.deterministicScenarioLab?.nextMajor?.forecast && !snapshot?.deterministicScenarioLab?.nextMajor?.actual;
  const inventedThresholdPatterns = [
    /\bPAYEMS\s*[<>]\s*\d+/i,
    /\bNFP\s*[<>]\s*\d+/i,
    /\bpayrolls?\s*[<>]\s*\d+/i,
    /\bjobs?\s*[<>]\s*\d+\s*k\b/i,
    /\bCPI\s*[<>]\s*\d+(\.\d+)?\s*%/i,
    /\binflation\s*[<>]\s*\d+(\.\d+)?\s*%/i,
  ];
  if (hasBlankEventForecasts && inventedThresholdPatterns.some((p) => p.test(text))) {
    issues.push({
      severity: "high",
      code: "invented_numeric_threshold",
      message: "AI output appears to invent NFP/PAYEMS/CPI thresholds while event forecast/actual values are blank.",
    });
  }

  // 2) macro logic contradictions
  if (/hot cpi[\s\S]{0,90}real yields?\s+fall[\s\S]{0,90}(bearish|gold may fall|gold loses|negative)/i.test(text)) {
    issues.push({
      severity: "high",
      code: "cpi_real_yield_contradiction_1",
      message: "Hot CPI + falling real yields was described as bearish. It should usually be gold-supportive or ambiguous, not bearish.",
    });
  }

  if (/hot cpi[\s\S]{0,90}real yields?\s+ris(e|ing)[\s\S]{0,90}(bullish|gold may rise|gold gains|positive)/i.test(text)) {
    issues.push({
      severity: "high",
      code: "cpi_real_yield_contradiction_2",
      message: "Hot CPI + rising real yields was described as bullish. It should usually be gold-negative or ambiguous.",
    });
  }

  if (/rising real yields?[\s\S]{0,80}(bullish|gold-supportive|support gold|gold may rise)/i.test(text)) {
    issues.push({
      severity: "high",
      code: "real_yield_direction_error",
      message: "Rising real yields were described as gold-supportive.",
    });
  }

  // 3) wrong next event date
  const nextDate = snapshot?.deterministicScenarioLab?.nextMajor?.date || snapshot?.calendar?.nextMajor?.date;
  const allDates = extractIsoDatesFromSnapshot(snapshot);
  const monthDateMatches = [...text.matchAll(/\b(?:Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|September|Oct|October|Nov|November|Dec|December)\s+\d{1,2},\s+20\d{2}\b/g)];
  if (nextDate && monthDateMatches.length) {
    const nextDateObj = new Date(`${nextDate}T12:00:00Z`);
    for (const m of monthDateMatches) {
      const parsed = new Date(`${m[0]} 12:00:00 UTC`);
      if (!isNaN(parsed.getTime())) {
        const iso = parsed.toISOString().slice(0, 10);
        if (text.slice(Math.max(0, m.index - 80), m.index + 80).toLowerCase().includes("next event") && iso !== nextDate) {
          issues.push({
            severity: "high",
            code: "wrong_next_event_date",
            message: `AI output gave next-event date ${iso}, but snapshot nextMajor date is ${nextDate}.`,
          });
        }
      }
    }
  }

  // 4) avoid-window paraphrase mismatch
  const avoidWindow = snapshot?.deterministicScenarioLab?.nextMajor?.avoidWindow || snapshot?.calendar?.nextMajor?.avoidWindow || "";
  if (avoidWindow && avoidWindow.includes("2h before") && avoidWindow.includes("1h after")) {
    if (/2\s*hours?\s+before\/after|2h\s+before\/after|2\s*hours?\s+before\s+and\s+after/i.test(text)) {
      issues.push({
        severity: "medium",
        code: "avoid_window_mismatch",
        message: "AI output paraphrased avoid-window as 2h before/after, but snapshot says 2h before and 1h after.",
      });
    }
  }

  // 5) leaked artifacts
  if (/^\s*器材/.test(text)) {
    issues.push({
      severity: "medium",
      code: "output_artifact",
      message: "AI output contains non-report artifact text at the beginning.",
    });
  }

  // 6) missing end marker
  if (!text.includes("<END_GOLDSCOPE_REPORT>")) {
    issues.push({
      severity: "medium",
      code: "missing_end_marker",
      message: "AI output is missing <END_GOLDSCOPE_REPORT>; response may be incomplete.",
    });
  }


  // 7) instrument guard: mining/equity news must not be treated as XAUUSD move
  const miningTitles = extractMiningNewsTitles(snapshot);
  const hasMiningNews = miningTitles.length > 0;
  if (hasMiningNews) {
    const stockToSpotPatterns = [
      /gold price drop/i,
      /gold prices? (drop|fall|fell|recover|stabilize|rise|rally)/i,
      /xauusd (drop|fall|fell|recover|stabilize|rise|rally)/i,
      /spot gold (drop|fall|fell|recover|stabilize|rise|rally)/i,
      /broader market weakness/i,
    ];
    const mentionedCompanyStock = /(victoria gold|kinross|barrick|newmont|otcmkts|corporation|shares|stock|trading down)/i.test(text);
    const convertedToSpot = stockToSpotPatterns.some((p) => p.test(text));

    if (convertedToSpot && !mentionedCompanyStock) {
      issues.push({
        severity: "high",
        code: "instrument_confusion_mining_stock_vs_xauusd",
        message: "AI appears to interpret mining-company/equity news as spot gold/XAUUSD price action.",
      });
    }

    if (/weak news about a gold price drop/i.test(text)) {
      issues.push({
        severity: "high",
        code: "instrument_confusion_gold_price_drop",
        message: "AI says 'gold price drop' even though available weak news may be company/retail news, not confirmed XAUUSD price action.",
      });
    }
  }

  // 8) price-level hallucination guard
  const hasPriceContext = snapshotHasSpotOrTechnicalPrice(snapshot);
  const priceLevelPatterns = [
    /\$\s?\d{1,3}(?:,\d{3})+(?:\.\d+)?\s*(?:\/\s*oz|per\s+oz|ounce)?/i,
    /\b\d{4}(?:\.\d+)?\s*(?:\/\s*oz|per\s+oz|ounce)\b/i,
    /\b(?:above|below|over|under|breaks?|recover(?:s|ed)? above|falls? below|support|resistance)\s+\$?\s?\d{4}(?:\.\d+)?\b/i,
  ];
  if (!hasPriceContext && priceLevelPatterns.some((p) => p.test(text))) {
    issues.push({
      severity: "high",
      code: "invented_price_level",
      message: "AI output contains price levels/support/resistance language, but snapshot has no spot price or technicalContext.",
    });
  }
  // 9) NFP direction validator - line based

  // 11) technical reliability and EMA logic guard
  if (snapshot?.technicalContext?.status === "unreliable") {
    if (/technical context shows[\s\S]{0,120}(bullish|bearish)|mild-bullish bias|mild-bearish bias/i.test(text)) {
      issues.push({
        severity: "high",
        code: "unreliable_technical_used_as_signal",
        message: "Technical context is marked unreliable but AI used it as directional evidence.",
      });
    }
  }

  if (/EMA20\s+(below|under)\s+EMA200[\s\S]{0,120}(bullish|mild-bullish|supportive)/i.test(text)) {
    issues.push({
      severity: "high",
      code: "ema_alignment_logic_error",
      message: "EMA20 below EMA200 was described as bullish. This should be mixed/bearish or unreliable, not bullish by itself.",
    });
  }



  // 12) masked technical suppression validator
  if (snapshot?.technicalContext?.usableForScenario === false || snapshot?.technicalContext?.technicalBias === "masked-unreliable") {
    const forbiddenMaskedTechnicalUse = [
      /mild-bullish/i,
      /mild-bearish/i,
      /RSI\s*(?:is|=|:)?\s*\d+/i,
      /EMA\s*(?:alignment|20|50|200)/i,
      /support\s*(?:level|near|at|\/|and)/i,
      /resistance\s*(?:level|near|at|\/|and)/i,
      /price\s+above\s+EMA200/i,
      /priceVsEMA200/i,
      /technical context shows[\s\S]{0,120}(bullish|bearish|trend)/i,
    ];

    if (forbiddenMaskedTechnicalUse.some((p) => p.test(text))) {
      issues.push({
        severity: "high",
        code: "masked_unreliable_technical_leak",
        message: "AI used raw technical fields even though technicalContext was masked as unusable for scenario analysis.",
      });
    }
  }


  // 9) NFP direction validator - line based and precision-safe
  const reportLines = splitReportLines(text);
  for (const line of reportLines) {
    if (lineHasWeakNfpFallingYields(line) && lineStatesBearish(line)) {
      issues.push({
        severity: "high",
        code: "nfp_direction_error_weak_labor",
        message: "A single line describes weak NFP/labor with falling yields/USD as bearish. It should usually be gold-supportive.",
      });
    }

    if (lineHasStrongNfpRisingYields(line) && lineStatesBullish(line)) {
      issues.push({
        severity: "high",
        code: "nfp_direction_error_strong_labor",
        message: "A single line describes strong NFP/labor with rising yields/USD as bullish. It should usually be gold-negative.",
      });
    }
  }

  // 10) Next catalyst exactness validator
  const nextMajor = getNextMajorEvent(snapshot);
  const nextBlock = extractNextCatalystBlock(text);
  if (nextMajor && nextBlock) {
    const expectedName = normalizeEventName(nextMajor.name);
    const expectedDate = nextMajor.date;

    const mentionsWrongFomcAsNext = /next event[\s\S]{0,120}FOMC/i.test(nextBlock)
      && !/FOMC/i.test(nextMajor.name || "");

    if (mentionsWrongFomcAsNext) {
      issues.push({
        severity: "high",
        code: "wrong_next_catalyst_event",
        message: `AI named FOMC as the next event, but snapshot nextMajor is ${nextMajor.name}.`,
      });
    }

    const blockNorm = normalizeEventName(nextBlock);
    const expectedTokens = expectedName.split(" ").filter((t) => t.length >= 4);
    const matchedTokens = expectedTokens.filter((t) => blockNorm.includes(t)).length;
    if (expectedTokens.length && matchedTokens < Math.min(2, expectedTokens.length)) {
      issues.push({
        severity: "medium",
        code: "next_catalyst_name_not_exact",
        message: `Next catalyst block does not clearly reference snapshot nextMajor: ${nextMajor.name}.`,
      });
    }

    const datesInNextBlock = extractHumanDates(nextBlock);
    const wrongDates = datesInNextBlock.filter((d) => d !== expectedDate);
    if (wrongDates.length) {
      issues.push({
        severity: "high",
        code: "wrong_next_catalyst_date",
        message: `Next catalyst block contains date(s) ${wrongDates.join(", ")} but snapshot nextMajor date is ${expectedDate}.`,
      });
    }
  }

  // 11) invented conceptual examples when forecast/actual are blank
  if (hasBlankEventForecasts && /\be\.g\.,?\s*(strong payrolls|weak payrolls|rate hikes|rate cuts|NFP beats|FOMC|Employment Report|unemployment rate|wage growth|DGS2-DFF)/i.test(text)) {
    issues.push({
      severity: "medium",
      code: "invented_conceptual_example",
      message: "AI used conceptual examples not present in snapshot while event actual/forecast data are blank.",
    });
  }



  // 13) Think-tag / hidden-reasoning artifact rejection
  if (hasThinkingArtifactLocal(text)) {
    issues.push({
      severity: "high",
      code: "thinking_artifact_leak",
      message: "AI output contains think tags or hidden-reasoning artifacts and must be rejected.",
    });
  }

  // 14) Technical RSI fact validator
  const rsiValues = collectTechnicalRsiValues(snapshot);
  const hasRsiAbove70 = rsiValues.some((x) => x > 70);
  const hasRsiBelow30 = rsiValues.some((x) => x < 30);

  if (containsDefinitiveRsiOverboughtClaim(text) && !hasRsiAbove70) {
    issues.push({
      severity: "high",
      code: "rsi_overbought_fact_error",
      message: `AI described RSI as overbought, but no technical RSI value is above 70. RSI values: ${rsiValues.join(", ") || "none"}.`,
    });
  }

  if (containsDefinitiveRsiOversoldClaim(text) && !hasRsiBelow30) {
    issues.push({
      severity: "high",
      code: "rsi_oversold_fact_error",
      message: `AI described RSI as oversold, but no technical RSI value is below 30. RSI values: ${rsiValues.join(", ") || "none"}.`,
    });
  }


  // 14b) Stochastic RSI fact validator
  const stochRsiValues = collectTechnicalStochRsiValues(snapshot);
  const hasStochAbove80 = stochRsiValues.some((x) => x >= 80);
  const hasStochBelow20 = stochRsiValues.some((x) => x <= 20);

  if (/stoch(?:astic)?\s*RSI[\s\S]{0,80}\boverbought\b|\boverbought\b[\s\S]{0,80}stoch(?:astic)?\s*RSI/i.test(text) && !hasStochAbove80) {
    issues.push({
      severity: "high",
      code: "stoch_rsi_overbought_fact_error",
      message: `AI described Stochastic RSI as overbought, but no StochRSI K value is >= 80. K values: ${stochRsiValues.join(", ") || "none"}.`,
    });
  }

  if (/stoch(?:astic)?\s*RSI[\s\S]{0,80}\boversold\b|\boversold\b[\s\S]{0,80}stoch(?:astic)?\s*RSI/i.test(text) && !hasStochBelow20) {
    issues.push({
      severity: "high",
      code: "stoch_rsi_oversold_fact_error",
      message: `AI described Stochastic RSI as oversold, but no StochRSI K value is <= 20. K values: ${stochRsiValues.join(", ") || "none"}.`,
    });
  }



  // 14c) Numeric RSI hallucination validator
  const mentionedRsiNumbers = collectMentionedRsiNumbers(text);
  for (const mentionedRsi of mentionedRsiNumbers) {
    if (!rsiMentionMatchesSnapshot(mentionedRsi, rsiValues)) {
      issues.push({
        severity: "high",
        code: "rsi_numeric_mismatch",
        message: `AI mentioned RSI value ${mentionedRsi}, but it does not match any RSI value in the snapshot. Snapshot RSI values: ${rsiValues.join(", ") || "none"}.`,
      });
    }
  }

  // 14d) Strategy module / alignment action confusion validator
  if (mentionsAlignmentActionAsStrategyModule(text, snapshot)) {
    issues.push({
      severity: "medium",
      code: "strategy_module_alignment_action_confusion",
      message: "AI described alignmentContext.action as if it were a strategy module. Strategy modules are trend, momentum, volatility, and structure only.",
    });
  }


  // 15) Technical context must not be treated as confirmed evidence
  if (reportMentionsTechnicalConfirmedEvidence(text)) {
    issues.push({
      severity: "high",
      code: "technical_confirmed_evidence_error",
      message: "AI placed technical context under Confirmed evidence. Technicals are confirmation/contradiction context only, not confirmed macro/event evidence.",
    });
  }

  // 16) Case-specific technical wording validator
  const techDir = technicalBiasDirection(snapshot);
  const techUsable = snapshot?.technicalContext?.usableForScenario === true && snapshot?.technicalContext?.status === "available";

  if (techUsable && techDir.includes("bearish")) {
    if (!sectionMentionsTechnicalWeakensBullish(text)) {
      issues.push({
        severity: "medium",
        code: "missing_bearish_technical_weakens_bullish_case",
        message: "Technical bias is bearish, but the bullish case does not clearly state that technicals currently weaken the bullish conditional case.",
      });
    }
    if (!sectionMentionsTechnicalSupportsBearish(text)) {
      issues.push({
        severity: "medium",
        code: "missing_bearish_technical_supports_bearish_case",
        message: "Technical bias is bearish, but the bearish case does not clearly state that technicals support the bearish conditional case as confirmation context.",
      });
    }
  }

  if (techUsable && techDir.includes("bullish")) {
    if (!sectionMentionsTechnicalSupportsBullish(text)) {
      issues.push({
        severity: "medium",
        code: "missing_bullish_technical_supports_bullish_case",
        message: "Technical bias is bullish, but the bullish case does not clearly state that technicals support the bullish conditional case as confirmation context.",
      });
    }
    if (!sectionMentionsTechnicalWeakensBearish(text)) {
      issues.push({
        severity: "medium",
        code: "missing_bullish_technical_weakens_bearish_case",
        message: "Technical bias is bullish, but the bearish case does not clearly state that technicals currently weaken the bearish conditional case.",
      });
    }
  }


  return {
    ok: issues.filter((i) => i.severity === "high").length === 0,
    issues,
  };
}

function formatValidationReport(validation) {
  const issues = validation?.issues || [];
  if (!issues.length) return "AI output validation passed.";

  const high = issues.filter((i) => String(i.severity || "").toLowerCase() === "high");
  const medium = issues.filter((i) => String(i.severity || "").toLowerCase() === "medium");
  const low = issues.filter((i) => String(i.severity || "").toLowerCase() === "low");
  const visible = high.length ? high : [...medium, ...low];

  const title = high.length ? "REJECTED AI OUTPUT VALIDATION" : "AI OUTPUT DIAGNOSTICS";
  const subtitle = high.length
    ? "High-severity issue(s) caused the raw AI output to be rejected."
    : "Non-critical diagnostic warning(s). The raw AI output was not rejected.";

  const lines = visible
    .map((i, idx) => `${idx + 1}. [${String(i.severity || "").toUpperCase()}] ${i.code}: ${i.message}`)
    .join("\n");

  const suppressedCount = high.length ? medium.length + low.length : 0;
  const suppressed = suppressedCount
    ? `\n\nSuppressed non-critical diagnostics: ${suppressedCount} item(s) (${medium.length} medium, ${low.length} low).`
    : "";

  return `${title}
${subtitle}

${lines}${suppressed}`;
}
// ─────────────────────────────────────────────────────────────────────────────

function classifyArticle(article) {
  const titleRaw = String(article.title || "");
  const title = titleRaw.toLowerCase();
  const source = String(article.domain || article.source || "");
  const sourceLower = source.toLowerCase();

  let sourceTier = "medium";
  if (HIGH_TIER_DOMAINS.some((d) => sourceLower.includes(d))) sourceTier = "high";
  else if (LOW_TIER_DOMAINS.some((d) => sourceLower.includes(d))) sourceTier = "low";

  let category = "general gold";
  let driver = "";
  if (MACRO_GOLD_DRIVERS.fed.test(title)) { category = "Fed / rates"; driver = "fed"; }
  else if (MACRO_GOLD_DRIVERS.yields.test(title)) { category = "Treasury / real yields"; driver = "yields"; }
  else if (MACRO_GOLD_DRIVERS.dollar.test(title)) { category = "DXY / dollar"; driver = "dollar"; }
  else if (MACRO_GOLD_DRIVERS.inflation.test(title)) { category = "inflation"; driver = "inflation"; }
  else if (MACRO_GOLD_DRIVERS.labor.test(title)) { category = "labor / NFP"; driver = "labor"; }
  else if (MACRO_GOLD_DRIVERS.geopolitical.test(title)) { category = "geopolitical risk"; driver = "geopolitical"; }
  else if (MACRO_GOLD_DRIVERS.centralBank.test(title)) { category = "central bank buying"; driver = "centralBank"; }
  else if (MACRO_GOLD_DRIVERS.etf.test(title)) { category = "ETF flows"; driver = "etf"; }

  const retail = isRetailNoise(article);
  let relevance = "low-relevance";
  if (driver && !retail) relevance = "macro-relevant";
  else if (!retail && category !== "general gold") relevance = "mixed-relevance";

  let impact = "uncertain";
  const BULLISH_PATTERNS = /safe haven|war|conflict|geopolit|dovish|rate cut|lower yield|falling dollar|weaker dollar|dollar falls|central bank buying|gold demand|etf inflow|recession|risk.?off|flight to safety/i;
  const BEARISH_PATTERNS = /hawkish|rate hike|higher.?for.?longer|strong dollar|dollar strength|dollar rallies|higher yield|rising yield|strong jobs|strong payroll|beat.*forecast|above.*expectation/i;
  if (BULLISH_PATTERNS.test(titleRaw)) impact = "bullish";
  if (BEARISH_PATTERNS.test(titleRaw)) impact = impact === "bullish" ? "uncertain" : "bearish";
  if (relevance === "low-relevance") impact = "uncertain";

  let confidence = 50;
  if (sourceTier === "high" && relevance === "macro-relevant") confidence = 85;
  else if (sourceTier === "high" && relevance === "mixed-relevance") confidence = 70;
  else if (sourceTier === "medium" && relevance === "macro-relevant") confidence = 65;
  else if (sourceTier === "medium") confidence = 55;
  else confidence = 35;

  return {
    id: article.url || `${titleRaw}-${article.seendate}`,
    title: titleRaw || "Untitled",
    source: article.domain || source || "GDELT",
    sourceTier,
    url: article.url || "#",
    publishedAt: article.seendate || article.datetime || new Date().toISOString(),
    summary: titleRaw || "No summary available.",
    category,
    driver,
    impact,
    confidence,
    relevance,
    freshness: 80,
    tone: impact === "bullish" ? "positive" : impact === "bearish" ? "negative" : "neutral",
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

  const classified = (Array.isArray(data.articles) ? data.articles : [])
    .map(classifyArticle)
    .sort((a, b) => {
      const order = { "macro-relevant": 0, "mixed-relevance": 1, "low-relevance": 2 };
      return (order[a.relevance] ?? 2) - (order[b.relevance] ?? 2);
    });

  const filtered = classified.filter((a) => a.relevance !== "low-relevance");
  return filtered.length ? filtered : classified.slice(0, 8);
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
  const [smartRunStatus, setSmartRunStatus] = useState("ready");
  const [aiHistory, setAiHistory] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("goldscope.v2.ai.history") || "[]");
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  });
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
    localStorage.setItem("goldscope.v2.ai.history", JSON.stringify(aiHistory));
  }, [aiHistory]);

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
      unemploymentRate: values.unemploymentRate || "",
      averageHourlyEarningsMoM: values.averageHourlyEarningsMoM || "",
      averageHourlyEarningsYoY: values.averageHourlyEarningsYoY || "",
      sectorCompositionText: values.sectorCompositionText || "",
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
      if (cached?.rows?.length && cached.rows.length >= FRED_SERIES.length && Date.now() - cached.savedAt < FRED_CACHE_TTL_MS) {
        setFredRows(cached.rows);
        setHealth((h) => ({
          ...h,
          fred: {
            status: "live",
            message: `Using cached FRED macro drivers (${cached.rows.length}/${FRED_SERIES.length}). ${cacheStatusText(KEYS.fredCache, FRED_CACHE_TTL_MS)}.`,
            lastFetch: new Date(cached.savedAt).toISOString(),
          },
        }));
        return;
      }
      if (cached?.rows?.length && cached.rows.length < FRED_SERIES.length) {
        localStorage.removeItem(KEYS.fredCache);
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
            ? `Loaded ${result.rows.length}/${FRED_SERIES.length} FRED series; ${result.errors.length} failed: ${result.errors.slice(0, 3).join(" | ")}`
            : `Loaded ${result.rows.length}/${FRED_SERIES.length} FRED macro drivers.`,
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
    ["control", "Home"],
    ["chart", "Chart"],
    ["eventRisk", "Events"],
    ["scenarioLab", "Scenario"],
    ["aiEngine", "AI Analysis"],
    ["health", "Health"],
    ["export", "Export"],
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

    function providerKeyFromBaseUrl(baseUrl = "") {
      const url = String(baseUrl).toLowerCase();
      if (url.includes("deepseek.com")) return "deepseek";
      if (url.includes("groq.com")) return "groq";
      if (url.includes("openrouter.ai")) return "openrouter";
      if (url.includes("together.xyz")) return "together";
      return null;
    }

    function normalizeCredentialConfig(raw) {
      const keys = {};
      const defaults = {};
      const settings = {};
      const custom = [];

      for (const providerKey of ["deepseek", "groq", "openrouter", "together"]) {
        const cfg = raw?.[providerKey];
        if (!cfg || typeof cfg !== "object") continue;
        if (cfg.api_key && !String(cfg.api_key).startsWith("PASTE_")) keys[providerKey] = String(cfg.api_key).trim();
        if (cfg.model) defaults[providerKey] = String(cfg.model).trim();
        settings[providerKey] = {
          maxCompletionTokens: cfg.max_completion_tokens || cfg.max_tokens || null,
          temperature: cfg.temperature ?? null,
          reasoningEffort: cfg.reasoning_effort || null,
          thinking: cfg.thinking || null,
        };
        if (cfg.model) custom.push({
          providerKey,
          model: String(cfg.model).trim(),
          displayName: cfg.model_display_name || cfg.model,
          baseUrl: cfg.base_url || "",
          maxTokens: cfg.max_tokens || null,
          maxCompletionTokens: cfg.max_completion_tokens || cfg.max_tokens || null,
          temperature: cfg.temperature ?? null,
          reasoningEffort: cfg.reasoning_effort || null,
          thinking: cfg.thinking || null,
        });
      }

      const customModelsArray = Array.isArray(raw?.custom_models) ? raw.custom_models : [];
      for (const cm of customModelsArray) {
        const providerKey = providerKeyFromBaseUrl(cm.base_url);
        if (!providerKey || !cm.model) continue;
        if (cm.api_key && !String(cm.api_key).startsWith("PASTE_")) keys[providerKey] = String(cm.api_key).trim();
        defaults[providerKey] = String(cm.model).trim();
        settings[providerKey] = {
          maxCompletionTokens: cm.max_completion_tokens || cm.max_tokens || null,
          temperature: cm.temperature ?? null,
          reasoningEffort: cm.reasoning_effort || null,
          thinking: cm.thinking || null,
        };
        custom.push({
          providerKey,
          model: String(cm.model).trim(),
          displayName: cm.model_display_name || cm.model,
          baseUrl: cm.base_url || "",
          maxTokens: cm.max_tokens || null,
          maxCompletionTokens: cm.max_completion_tokens || cm.max_tokens || null,
          temperature: cm.temperature ?? null,
          reasoningEffort: cm.reasoning_effort || null,
          thinking: cm.thinking || null,
        });
      }

      return {
        keys,
        defaults,
        settings,
        customModels: custom.filter((m, idx, arr) => arr.findIndex((x) => x.providerKey === m.providerKey && x.model === m.model) === idx),
      };
    }

    async function loadAICredentialsFromFile(showSuccess = true) {
      setCredentialStatus("loading /config/ai_credentials.json...");
      try {
        const response = await fetch(`/config/ai_credentials.json?ts=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const raw = await response.json();
        const normalized = normalizeCredentialConfig(raw);

        setApiKeys((prev) => ({ ...prev, ...normalized.keys }));
        setCredentialSource((prev) => {
          const next = { ...prev };
          for (const key of Object.keys(normalized.keys)) next[key] = "file";
          return next;
        });
        setCustomModels(normalized.customModels);
        setModelDefaults(normalized.defaults);
        setProviderSettings((prev) => ({ ...prev, ...normalized.settings }));

        if (normalized.defaults[provider]) {
          setModel(normalized.defaults[provider]);
        }

        const loadedProviders = Object.keys(normalized.keys);
        setCredentialStatus(
          loadedProviders.length
            ? `loaded keys for: ${loadedProviders.join(", ")}`
            : "config file loaded, but no API keys were found"
        );

        if (showSuccess && loadedProviders.length) setAiStatus("credentials loaded from file");
      } catch (err) {
        setCredentialStatus(`credentials file unavailable: ${err.message}`);
      }
    }

    useEffect(() => {
      loadAICredentialsFromFile(false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


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
      unemploymentRate: "",
      averageHourlyEarningsMoM: "",
      averageHourlyEarningsYoY: "",
      sectorCompositionText: "",
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
        unemploymentRate: result?.unemploymentRate ?? selected.unemploymentRate ?? "",
        averageHourlyEarningsMoM: result?.averageHourlyEarningsMoM ?? selected.averageHourlyEarningsMoM ?? "",
        averageHourlyEarningsYoY: result?.averageHourlyEarningsYoY ?? selected.averageHourlyEarningsYoY ?? "",
        sectorCompositionText: result?.sectorCompositionText ?? "",
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
            {selected && isEmploymentSituationEvent(selected) && (
              <>
                <div><label style={label}>Unemployment rate</label><input style={input} value={form.unemploymentRate} onChange={(e) => setForm({ ...form, unemploymentRate: e.target.value })} placeholder="e.g., 4.3%" /></div>
                <div><label style={label}>Avg hourly earnings MoM</label><input style={input} value={form.averageHourlyEarningsMoM} onChange={(e) => setForm({ ...form, averageHourlyEarningsMoM: e.target.value })} placeholder="e.g., 0.3%" /></div>
                <div><label style={label}>Avg hourly earnings YoY</label><input style={input} value={form.averageHourlyEarningsYoY} onChange={(e) => setForm({ ...form, averageHourlyEarningsYoY: e.target.value })} placeholder="optional" /></div>
              </>
            )}
          </div>

          {selected && isEmploymentSituationEvent(selected) && (
            <div style={{ marginTop: 12 }}>
              <label style={label}>Employment sector composition</label>
              <textarea
                style={{ ...input, minHeight: 92 }}
                value={form.sectorCompositionText}
                onChange={(e) => setForm({ ...form, sectorCompositionText: e.target.value })}
                placeholder={"Paste sector lines, e.g.\nLeisure and hospitality +48K\nHealth care and social assistance +65K\nGovernment -3K"}
              />
              <p style={{ color: C.muted, fontSize: 12, lineHeight: 1.5 }}>
                Used by the Labor Composition Analyzer. If leisure/hospitality dominates, the system downgrades headline NFP quality as potentially seasonal/event-sensitive unless independent evidence confirms the cause.
              </p>
            </div>
          )}

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
                    {r.unemploymentRate && <Badge value="blue">unemp {r.unemploymentRate}</Badge>}
                    {r.averageHourlyEarningsMoM && <Badge value="blue">AHE MoM {r.averageHourlyEarningsMoM}</Badge>}
                    {r.sectorCompositionText && <Badge value="supportive">sector composition saved</Badge>}
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


    const MANUAL_REPLAY_KEY = "goldscope.manualReplayRecords.v1";
    const MANUAL_REPLAY_ANCHOR_KEY = "goldscope.manualReplayAnchor.v1";
    const [manualReplayRefresh, setManualReplayRefresh] = useState(0);

    function readManualReplayRecords() {
      try {
        const raw = localStorage.getItem(MANUAL_REPLAY_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    function writeManualReplayRecords(records) {
      localStorage.setItem(MANUAL_REPLAY_KEY, JSON.stringify((records || []).slice(-200)));
    }

    function getManualReplayStatus() {
      try {
        return localStorage.getItem("goldscope.manualReplayStatus.v1") || "manual replay idle";
      } catch {
        return "manual replay idle";
      }
    }

    function setManualReplayStatus(msg) {
      try {
        localStorage.setItem("goldscope.manualReplayStatus.v1", msg);
      } catch {}
      setManualReplayRefresh((x) => x + 1);
    }

    function readReplaySnapshotSafely() {
      try {
        const raw = localStorage.getItem("goldscope.latestSnapshot.v1");
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }

    function extractReplayTechnicalFromSnapshot(snapshot) {
      const tech = snapshot?.technicalContext || {};
      const tfKey = tech?.timeframes ? Object.keys(tech.timeframes)[0] : null;
      const tf = tfKey ? tech.timeframes[tfKey] : null;
      return {
        status: tech.status || "missing",
        usableForScenario: tech.usableForScenario || false,
        technicalBias: tech.technicalBias || "unknown",
        technicalConfidence: tech.technicalConfidence || 0,
        multiTimeframe: tech.multiTimeframe || null,
        sourceSelection: tech.sourceSelection?.selected || null,
        selectedTimeframe: tfKey,
        selectedBlock: tf || null,
        goldPrice: tf?.lastPrice || "",
      };
    }

    function manualReplayMove(before, after, epsilon = 0.0005) {
      const b = Number(before);
      const a = Number(after);
      if (!Number.isFinite(b) || !Number.isFinite(a) || Math.abs(b) < 1e-9) {
        return { change: null, pct: null, direction: "unknown" };
      }
      const change = a - b;
      const pct = change / Math.abs(b);
      return {
        change: Number(change.toFixed(4)),
        pct: Number((pct * 100).toFixed(4)),
        direction: pct > epsilon ? "up" : pct < -epsilon ? "down" : "flat",
      };
    }

    function classifyManualReplay(move) {
      if (move.direction === "up") return { label: "gold_supportive_reaction", bias: "bullish_reaction", summary: "Gold proxy rose after the anchor." };
      if (move.direction === "down") return { label: "gold_negative_reaction", bias: "bearish_reaction", summary: "Gold proxy fell after the anchor." };
      if (move.direction === "flat") return { label: "muted_reaction", bias: "neutral_reaction", summary: "Gold proxy reaction was muted." };
      return { label: "insufficient_reaction_data", bias: "unknown", summary: "Not enough before/after price data." };
    }

    function getReplayEventFromSnapshot(snapshot) {
      return snapshot?.calendar?.nextMajor
        || snapshot?.deterministicScenarioLab?.nextMajor
        || snapshot?.calendar?.upcomingHighImpact?.[0]
        || null;
    }

    function captureManualPreEventAnchor() {
      const snapshot = readReplaySnapshotSafely();
      if (!snapshot) {
        setManualReplayStatus("No snapshot found. Go to AI Engine, click Preview Prompt once, then return here.");
        return;
      }
      const tech = extractReplayTechnicalFromSnapshot(snapshot);
      if (tech.status !== "available") {
        setManualReplayStatus("Latest snapshot has no available technical context. In AI Engine, load technical context and Preview Prompt first.");
        return;
      }
      const event = getReplayEventFromSnapshot(snapshot);
      if (!event) {
        setManualReplayStatus("No nextMajor event found in latest snapshot.");
        return;
      }
      const anchor = {
        capturedAt: new Date().toISOString(),
        snapshotGeneratedAt: snapshot.generatedAt || "",
        event: {
          id: event.id || "",
          name: event.name || "",
          date: event.date || "",
          time: event.time || "",
          category: event.category || "",
          importance: event.importance || "",
          source: event.source || "",
          avoidWindow: event.avoidWindow || "",
        },
        before: {
          goldPrice: tech.goldPrice || "",
          usdIndex: "",
          nominalYield: "",
          realYield: "",
        },
        technicalBefore: tech,
      };
      localStorage.setItem(MANUAL_REPLAY_ANCHOR_KEY, JSON.stringify(anchor));
      setManualReplayStatus(`Pre-event anchor captured from latest snapshot for ${event.name || event.id}.`);
    }

    function saveManualPostEventReplay() {
      const snapshot = readReplaySnapshotSafely();
      if (!snapshot) {
        setManualReplayStatus("No latest snapshot found. Go to AI Engine and click Preview Prompt after refreshing technical context.");
        return;
      }
      const raw = localStorage.getItem(MANUAL_REPLAY_ANCHOR_KEY);
      if (!raw) {
        setManualReplayStatus("No anchor found. Click Capture Pre-Event Anchor first.");
        return;
      }
      const anchor = JSON.parse(raw);
      const technicalAfter = extractReplayTechnicalFromSnapshot(snapshot);
      if (technicalAfter.status !== "available") {
        setManualReplayStatus("Latest snapshot has no available technical context. Refresh technical context and Preview Prompt first.");
        return;
      }
      const goldMove = manualReplayMove(anchor?.before?.goldPrice, technicalAfter.goldPrice);
      const classification = classifyManualReplay(goldMove);
      const record = {
        id: `manual-replay-${Date.now()}`,
        createdAt: new Date().toISOString(),
        event: anchor.event || {},
        before: anchor.before || {},
        after: {
          goldPrice: technicalAfter.goldPrice || "",
          usdIndex: "",
          nominalYield: "",
          realYield: "",
        },
        reactions: {
          gold: goldMove,
          usd: { change: null, pct: null, direction: "unknown" },
          nominalYield: { change: null, pct: null, direction: "unknown" },
          realYield: { change: null, pct: null, direction: "unknown" },
        },
        reactionClassification: classification,
        technicalBefore: anchor.technicalBefore || null,
        technicalAfter,
        qualityScore: anchor?.before?.goldPrice && technicalAfter.goldPrice ? 45 : 20,
        notes: "Manual replay record from Event Replay tab using latest stored GoldScope snapshot. USD/yield fields are placeholders.",
      };
      writeManualReplayRecords([...readManualReplayRecords(), record]);
      setManualReplayStatus(`Replay saved: ${classification.label}, quality=${record.qualityScore}.`);
    }

    function clearManualReplayRecords() {
      localStorage.removeItem(MANUAL_REPLAY_KEY);
      localStorage.removeItem(MANUAL_REPLAY_ANCHOR_KEY);
      setManualReplayStatus("Manual replay records and anchor cleared.");
    }

    const manualReplayRecords = readManualReplayRecords();
    const manualReplayStatus = getManualReplayStatus();



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
              <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, marginBottom: 12 }}>
                <b>v2.36 replay evidence workflow:</b>
                <div style={{ color: C.muted, lineHeight: 1.7 }}>
                  Use this tab for event replay work. First prepare/load technical context from AI Engine, then use replay tools here if available.
                  If this tab does not show capture buttons yet, use the existing post-event/event replay controls in this tab and then return to AI Engine.
                </div>
              </div>

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
          <Title icon="🔁" title="Event Replay Tracker" sub="Advanced post-event reconstruction. Not part of the normal daily workflow." />

          <Card style={{ background: "#102016", borderColor: "#166534", marginBottom: 14 }}>
            <b style={{ color: C.green }}>Post-event only:</b>{" "}
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

    async function runSmartAnalysis() {
      setSmartRunStatus("running");
      setControlStatus("Smart Analysis: loading official calendar...");
      await loadGeneratedOfficialCalendar();

      setControlStatus("Smart Analysis: refreshing FRED macro data...");
      try { await refreshFred(); } catch {}

      setControlStatus("Smart Analysis: refreshing GDELT news...");
      try { await refreshGdelt(); } catch {}

      const readyEvents = calendarUniverse
        .filter((e) => isHighImpactEvent(e))
        .filter((e) => eventTimeToTimestamp(e) + 60 * 60000 <= Date.now());

      if (readyEvents.length) {
        setControlStatus("Smart Analysis: reconstructing recent event reactions...");
        await replayRecentCompletedEvents(5);
      }

      setControlStatus("Smart Analysis finished. Review Scenario Lab.");
      setSmartRunStatus("finished");
      setTab("scenarioLab");
    }

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
          <Title icon="🎛️" title="GoldScope Home" sub="Use this page first. Most work should start and end here." />

          <Card style={{ background: "#102016", borderColor: "#166534", marginBottom: 14 }}>
            <b style={{ color: C.green }}>Simplified workflow:</b>{" "}
            <span style={{ color: C.muted }}>
              Most days you only need one button: Run Smart Analysis. Event Results is optional only.
            </span>
          </Card>

          <Card style={{ background: C.card2, borderColor: `${C.gold}66`, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: "0 0 6px", color: C.gold }}>One-click Smart Analysis</h2>
                <p style={{ color: C.muted, lineHeight: 1.6, margin: 0 }}>
                  Loads calendar, refreshes FRED/GDELT, reconstructs recent completed event reactions if available, then opens Scenario Lab.
                </p>
              </div>
              <button onClick={runSmartAnalysis} style={{ ...btn(false), fontSize: 16, padding: "14px 18px" }}>
                Run Smart Analysis
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <Badge value={smartRunStatus === "finished" ? "supportive" : smartRunStatus === "running" ? "warning" : "blue"}>smart: {smartRunStatus}</Badge>
              <Badge value="supportive">stable mode</Badge>
            </div>
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
              desc="Daily default. This refreshes the research state."
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
              desc="Use only after a high-impact event has passed. This reconstructs post-event evidence if a completed event is available."
              action={runPostEventUpdate}
              button="Run post-event update"
              secondary={<button onClick={() => setTab("eventResults")} style={btn(false)}>Optional enrichment</button>}
            />

            <StepCard
              number="4"
              title="Optional AI scenario analysis"
              desc="Optional deeper explanation from the local/free AI model. Use after Home is updated."
              action={() => setTab("aiEngine")}
              button="Open AI Engine"
              secondary={<Badge value="blue">optional</Badge>}
            />

            <StepCard
              number="5"
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
            <Title icon="🧭" title="What should I do now?" sub="Follow only this recommendation. Ignore advanced tabs unless needed." />
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
              Advanced research/debug pages are hidden from the main navigation to keep the workflow simple. Use Home, Events, Scenario, and AI Analysis for normal work. Detailed pages still exist internally and can be reached from action buttons when needed.
            </p>
          </Card>

          <Card>
            <Title icon="📌" title="Control status" sub="Last orchestration message." />
            <p style={{ color: C.muted, lineHeight: 1.7 }}>{controlStatus}</p>
            <Badge value={smartRunStatus === "finished" ? "supportive" : smartRunStatus === "running" ? "warning" : "blue"}>smart analysis: {smartRunStatus}</Badge>
          </Card>
        </div>
      </div>
    );
  }







  function AIScenarioEngine() {
    const [model, setModel] = useState("qwen3:8b");
    const [models, setModels] = useState(["qwen3:8b", "llama3.2:3b", "mistral:7b", "gemma3:4b"]);
    const [proxyStatus, setProxyStatus] = useState("not checked");
    const [ollamaStatus, setOllamaStatus] = useState("not checked");
    const [aiStatus, setAiStatus] = useState("idle");
    const [aiRunning, setAiRunning] = useState(false);
    const [aiOutput, setAiOutput] = useState("");
    const [lastRaw, setLastRaw] = useState("");
    const [promptPreview, setPromptPreview] = useState("");
    const [contextSnapshot, setContextSnapshot] = useState(null);
    const [technicalContext, setTechnicalContext] = useState(null);
    const [technicalStatus, setTechnicalStatus] = useState("not loaded");
    const [promptMode, setPromptMode] = useState("scenario");
    const [outputDepth, setOutputDepth] = useState("standard");

    const OLLAMA_PROXY = "/api/ollama";
const USE_THINKING_STOP_TOKENS = false; // v2.37.1: optional; keep false to avoid blank/truncated outputs when a model starts with <think>.

    const input = {
      width: "100%",
      boxSizing: "border-box",
      background: C.card2,
      color: C.text,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      padding: "9px 10px",
    };

    function statusBadge(status) {
      if (status.includes("OK") || status.includes("live") || status.includes("complete") || status.includes("ready")) return "supportive";
      if (status.includes("error") || status.includes("failed") || status.includes("offline") || status.includes("not reachable") || status.includes("empty")) return "negative";
      return "warning";
    }

    function safeCompact(obj) {
      try {
        return JSON.stringify(obj, null, 2);
      } catch {
        return "{}";
      }
    }

    async function fetchWithTimeout(url, options = {}, timeoutMs = 240000) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        return await fetch(url, { ...options, signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
    }

    async function checkProxy() {
      setProxyStatus("checking internal Vite Ollama proxy...");
      setAiStatus("checking internal proxy...");
      try {
        const res = await fetchWithTimeout(`${OLLAMA_PROXY}/api/tags`, { cache: "no-store" }, 12000);
        const text = await res.text();
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
        const data = JSON.parse(text);
        const names = Array.isArray(data.models) ? data.models.map((m) => m.name).filter(Boolean) : [];
        setProxyStatus(names.length ? `internal proxy OK: ${names.length} Ollama model(s)` : "internal proxy OK, but no Ollama models found");
        setAiStatus("internal proxy OK");
        return true;
      } catch (err) {
        setProxyStatus(`internal proxy failed: ${err.message}`);
        setAiStatus("internal proxy failed");
        setAiOutput(`GoldScope internal Ollama proxy is not reachable.

This version does NOT need Start-AI-Proxy.bat.

Expected:
- GoldScope must be started with Start-GoldScope-v2.bat
- Ollama must be running at http://localhost:11434
- Vite must proxy /api/ollama -> http://localhost:11434

Quick tests:
1. Open in browser: http://localhost:11434/api/tags
2. Open in browser while GoldScope is running: http://127.0.0.1:5173/api/ollama/api/tags

Error:
${err.message}`);
        return false;
      }
    }

    async function checkOllama() {
      setOllamaStatus("checking Ollama through internal proxy...");
      setAiStatus("checking Ollama...");
      try {
        const res = await fetchWithTimeout(`${OLLAMA_PROXY}/api/tags`, { cache: "no-store" }, 12000);
        const text = await res.text();
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
        const data = JSON.parse(text);
        const names = Array.isArray(data.models) ? data.models.map((m) => m.name).filter(Boolean) : [];
        setModels(names.length ? names : ["qwen3:8b"]);
        if (names.length && !names.includes(model)) setModel(names[0]);
        setOllamaStatus(names.length ? `Ollama live: ${names.join(", ")}` : "Ollama live, but no model is installed");
        setAiStatus("Ollama OK");
        return true;
      } catch (err) {
        setOllamaStatus(`Ollama not reachable: ${err.message}`);
        setAiStatus("Ollama not reachable");
        setAiOutput(`Ollama is not reachable through GoldScope internal proxy.

Direct Ollama should answer:
http://localhost:11434/api/tags

GoldScope internal proxy should answer:
http://127.0.0.1:5173/api/ollama/api/tags

Error:
${err.message}`);
        return false;
      }
    }

    function compactFredRows() {
      return (fredRows || []).slice(0, 18).map((r) => ({
        id: r.id,
        label: r.label || r.id,
        latest: r.latest,
        previous: r.previous,
        change: r.change,
        direction: r.direction || "",
        score: r.score,
        interpretation: r.interpretation || "",
        updatedAt: r.updatedAt || r.lastUpdated || "",
      }));
    }


    function classifyNewsSourceTier(item) {
      const source = String(item?.source || "").toLowerCase();
      const title = String(item?.title || "").toLowerCase();

      const lowTierSources = [
        "newsx.com",
        "dailypolitical.com",
        "insidermonkey.com",
        "otcmkts",
      ];

      const highTierSources = [
        "reuters.com",
        "bloomberg.com",
        "ft.com",
        "wsj.com",
        "marketwatch.com",
        "cnbc.com",
        "federalreserve.gov",
        "bls.gov",
        "bea.gov",
        "eia.gov",
        "treasury.gov",
      ];

      const retailTerms = [
        "gold rate today",
        "city-wise",
        "24k",
        "22k",
        "18k",
        "dubai",
        "india",
        "uae",
        "saudi",
        "qatar",
        "oman",
        "cheaper in",
        "should you buy now",
      ];

      if (highTierSources.some((s) => source.includes(s))) return "high";
      if (lowTierSources.some((s) => source.includes(s))) return "low";
      if (retailTerms.some((t) => title.includes(t))) return "low";
      return "medium";
    }

    function classifyGoldNewsRelevance(item) {
      const title = String(item?.title || "").toLowerCase();
      const source = String(item?.source || "").toLowerCase();
      const text = `${title} ${source}`;

      const strongMacroTerms = [
        "fomc",
        "fed",
        "federal reserve",
        "treasury yield",
        "real yield",
        "dxy",
        "dollar index",
        "nonfarm",
        "nfp",
        "payroll",
        "unemployment",
        "cpi",
        "pce",
        "inflation expectations",
        "rate cut",
        "rate hike",
        "geopolitical",
        "central bank buying",
      ];

      const broadGoldTerms = [
        "gold",
        "bullion",
        "xau",
        "silver",
        "gold rate",
        "gold price",
      ];

      const lowRelevanceTerms = [
        "city-wise",
        "jewelry",
        "gold rate today",
        "dubai",
        "india",
        "uae",
        "saudi",
        "qatar",
        "oman",
        "stock",
        "corporation",
        "otcmkts",
        "trading down",
        "shares",
        "analyst rating",
        "24k",
        "22k",
        "18k",
      ];

      const strongHit = strongMacroTerms.some((t) => text.includes(t));
      const broadHit = broadGoldTerms.some((t) => text.includes(t));
      const lowHit = lowRelevanceTerms.some((t) => text.includes(t));

      if (strongHit && !lowHit) return "macro-relevant";
      if (strongHit && lowHit) return "mixed-relevance";
      if (broadHit && !lowHit) return "mixed-relevance";
      return "low-relevance";
    }

    function classifyNewsStrength(newsItems) {
      const items = Array.isArray(newsItems) ? newsItems : [];
      const macroRelevant = items.filter((n) => n.relevance === "macro-relevant");
      const mixed = items.filter((n) => n.relevance === "mixed-relevance");
      const highTierMacro = macroRelevant.filter((n) => n.sourceTier === "high");
      const mediumOrHighMacro = macroRelevant.filter((n) => n.sourceTier === "high" || n.sourceTier === "medium");

      if (highTierMacro.length >= 2 || (highTierMacro.length >= 1 && mediumOrHighMacro.length >= 2)) {
        return "strong";
      }

      if (mediumOrHighMacro.length >= 2 || (macroRelevant.length >= 1 && mixed.length >= 2)) {
        return "moderate";
      }

      return "weak";
    }


    function confidenceCapFromContext(baseScore, qualityFlags) {
      let cap = Number(baseScore || 40);

      if (qualityFlags?.missingCriticalMacroDrivers?.length >= 5) cap = Math.min(cap, 35);
      if (qualityFlags?.replayReliability === "missing") cap = Math.min(cap, 40);
      if (qualityFlags?.newsReliability !== "live") cap = Math.min(cap, 35);
      if (qualityFlags?.newsRelevance === "low") cap = Math.min(cap, 35);
      if (qualityFlags?.newsStrength === "weak") cap = Math.min(cap, 35);
      if (qualityFlags?.eventDataCompleteness?.nextMajor?.quality === "date-only") cap = Math.min(cap, 40);

      return Math.max(10, cap);
    }

    function computeContextQuality(fred, _gdelt, _replay) {
      const fredIds = new Set((fred || []).map((r) => r.id));
      const criticalMacro = ["DGS10", "DGS2", "DFII10", "DTWEXBGS", "DFF", "UNRATE", "PAYEMS"];
      const missingCriticalMacroDrivers = criticalMacro.filter((id) => !fredIds.has(id));

      const gdeltStatus = health?.gdelt?.status || "unknown";
      const fredStatus = health?.fred?.status || "unknown";
      const replayCount = (replayRecords || []).length;

      const eventCompleteness = {};
      const nextMajor = buildScenarioModel()?.nextMajor;
      if (nextMajor) {
        eventCompleteness.nextMajor = {
          event: nextMajor.name,
          hasPrevious: Boolean(nextMajor.previous),
          hasForecast: Boolean(nextMajor.forecast),
          hasActual: Boolean(nextMajor.actual),
          quality: nextMajor.actual || nextMajor.forecast ? "partial-results" : "date-only",
        };
      }

      const newsItems = compactNews();
      const macroRelevantNewsCount = newsItems.filter((n) => n.relevance === "macro-relevant").length;
      const mixedNewsCount = newsItems.filter((n) => n.relevance === "mixed-relevance").length;
      const highTierMacroNewsCount = newsItems.filter((n) => n.relevance === "macro-relevant" && n.sourceTier === "high").length;
      const lowTierMacroNewsCount = newsItems.filter((n) => n.relevance === "macro-relevant" && n.sourceTier === "low").length;
      const newsRelevance = macroRelevantNewsCount >= 2 ? "high" : macroRelevantNewsCount + mixedNewsCount >= 1 ? "partial" : "low";
      const newsStrength = classifyNewsStrength(newsItems);

      const preliminaryFlags = {
        missingCriticalMacroDrivers,
        macroReliability: missingCriticalMacroDrivers.length ? "partial" : "stronger",
        newsReliability: gdeltStatus === "live" ? "live" : gdeltStatus === "fallback" ? "low-fallback" : "weak-or-missing",
        newsRelevance,
        newsStrength,
        macroRelevantNewsCount,
        highTierMacroNewsCount,
        lowTierMacroNewsCount,
        replayReliability: replayCount > 0 ? "available" : "missing",
        eventDataCompleteness: eventCompleteness,
        sourceReliabilitySummary: {
          fred: fredStatus,
          gdelt: gdeltStatus,
          tradingEconomics: health?.tradingEconomics?.status || "unknown",
          reddit: health?.reddit?.status || "unknown",
          youtube: health?.youtube?.status || "unknown",
        },
      };

      const qualityFlags = {
        ...preliminaryFlags,
        maxRecommendedConfidence: confidenceCapFromContext(buildScenarioModel()?.confidence?.score, preliminaryFlags),
        evidenceLabelRule: "Only items with observed values, actual outcomes, replay records, or live macro-relevant news may be called confirmed. Conditional future events must be labeled unconfirmed/conditional.",
        instrumentGuard: {
          goldScopeInstrument: "XAUUSD / spot gold only",
          miningCompanyNewsCount: newsItems.filter(isMiningCompanyOrEquityNews).length,
          hasSpotOrTechnicalPrice: false,
          rule: "Mining-company/equity/retail gold-rate news is not spot gold/XAUUSD price action.",
        },
      };

      return qualityFlags;
    }

    function compactNews() {
      return (news || []).slice(0, 12).map((n) => ({
        title: n.title,
        source: n.source,
        sourceTier: classifyNewsSourceTier(n),
        driver: n.driver || n.category || "",
        impact: n.impact,
        confidence: n.confidence,
        tone: n.tone || n.sentiment || "",
        relevance: classifyGoldNewsRelevance(n),
        publishedAt: n.publishedAt,
        url: n.url || "",
      }));
    }

    function compactCalendar() {
      const now = Date.now();
      const upcoming = (calendarUniverse || [])
        .filter((e) => isHighImpactEvent(e))
        .filter((e) => eventTimeToTimestamp(e) >= now - 24 * 3600 * 1000)
        .sort((a, b) => eventTimeToTimestamp(a) - eventTimeToTimestamp(b))
        .slice(0, 10)
        .map((e) => ({
          id: e.id,
          name: e.name,
          date: e.date,
          time: e.time,
          country: e.country,
          category: e.category,
          importance: e.importance,
          previous: e.previous || "",
          forecast: e.forecast || "",
          actual: e.actual || "",
          expectedImpact: e.expectedImpact || "",
          avoidWindow: e.avoidWindow || "",
          source: e.source,
        }));

      return {
        nextMajor: buildScenarioModel()?.nextMajor || null,
        eventRiskSummary,
        upcomingHighImpact: upcoming,
      };
    }

    function compactReplay() {
      const latest = latestReplaySignal();
      const recent = (replayRecords || []).slice(0, 8).map((r) => ({
        eventName: r.eventName,
        eventDate: r.eventDate,
        eventTime: r.eventTime,
        savedAt: r.savedAt,
        post15: r.post15Analysis || r.reactionSchedule?.comparisons?.post15m?.analysis || null,
        post60: r.post60Analysis || r.reactionSchedule?.comparisons?.post60m?.analysis || null,
      }));
      return { latest, recent };
    }


    async function loadTechnicalContext() {
      setTechnicalStatus("loading best technical data source...");
      try {
        const selected = await loadBestTechnicalCandles();
        const ctx = computeTechnicalContextFromCandles(
          selected.candles,
          selected.symbol,
          selected.interval,
          selected.sourceName
        );

        try {
          if (selected.interval === "1h" && ctx.status === "available") {
            const candles4h = resampleCandles(selected.candles, 4);
            const ctx4h = computeTechnicalContextFromCandles(candles4h, selected.symbol, "4h", selected.sourceName);
            if (ctx4h.status === "available" && ctx4h.timeframes?.["4h"]) {
              ctx.timeframes["4h"] = ctx4h.timeframes["4h"];
            }
          }

          if (ctx.status === "available") {
            let dailyCandles = [];
            try {
              if (selected.sourceName === "Yahoo") {
                dailyCandles = await fetchYahooChart(selected.symbol, "1y", "1d");
              } else if (selected.sourceName === "Stooq") {
                dailyCandles = await fetchStooqDaily(selected.symbol);
              }
            } catch (dailyErr) {
              ctx.dailySourceError = dailyErr.message;
            }

            if (dailyCandles.length) {
              const ctx1d = computeTechnicalContextFromCandles(dailyCandles, selected.symbol, "1d", selected.sourceName);
              if (ctx1d.status === "available" && ctx1d.timeframes?.["1d"]) {
                ctx.timeframes["1d"] = ctx1d.timeframes["1d"];
              }
            }

            ctx.multiTimeframe = buildMultiTimeframeSummary(ctx.timeframes);
            if (ctx.multiTimeframe?.bias) {
              ctx.technicalBias = ctx.multiTimeframe.bias;
              ctx.technicalConfidence = Math.min(75, Math.max(ctx.technicalConfidence || 0, 35 + Math.abs(ctx.multiTimeframe.score || 0) * 8));
            }
          }
        } catch (mtErr) {
          ctx.multiTimeframeError = mtErr.message;
        }

        ctx.sourceSelection = {
          selected: {
            sourceName: selected.sourceName,
            symbol: selected.symbol,
            range: selected.range,
            interval: selected.interval,
          },
          attempts: selected.attempts.map((a) => ({
            sourceName: a.sourceName,
            symbol: a.symbol,
            range: a.range,
            interval: a.interval,
            qualityScore: a.qualityScore,
            qualityLabel: a.qualityLabel,
            rawCount: a.rawCount,
            cleanCount: a.cleanCount,
            issues: a.issues,
            ok: a.ok,
          })),
        };
        setTechnicalContext(ctx);
        setTechnicalStatus(ctx.status === "available"
          ? `technical context ready: ${ctx.sourceName}:${ctx.symbol} ${ctx.technicalBias} / ${ctx.technicalConfidence} quality=${ctx.dataQuality?.qualityLabel}`
          : ctx.status === "unreliable"
            ? `technical context unreliable: ${ctx.sourceName}:${ctx.symbol} ${ctx.sanityIssues?.join(", ") || "sanity issues"}`
            : `technical context ${ctx.status}: ${ctx.reason || ""}`);
        return ctx;
      } catch (err) {
        const ctx = {
          symbol: "none",
          sourceName: "none",
          proxy: "No technical data source available.",
          status: "error",
          reliability: "unreliable",
          usableForScenario: false,
          error: err.message,
          timeframes: {},
          technicalBias: "unknown",
          technicalConfidence: 0,
          dataQuality: {
            qualityScore: 0,
            qualityLabel: "error",
            issues: [err.message],
          },
        };
        setTechnicalContext(ctx);
        setTechnicalStatus(`technical context error: ${err.message}`);
        return ctx;
      }
    }


    function maskTechnicalContextForPrompt(ctx) {
      if (!ctx) {
        return {
          status: "missing",
          usableForScenario: false,
          reason: "Technical context has not been loaded yet.",
          technicalBias: "unknown",
          technicalConfidence: 0,
        };
      }

      if (ctx.status === "unreliable" || ctx.reliability === "unreliable") {
        return {
          symbol: ctx.symbol || "GC=F",
          proxy: ctx.proxy || "Gold futures proxy for XAUUSD; not spot XAUUSD.",
          status: "unreliable",
          reliability: "unreliable",
          usableForScenario: false,
          technicalBias: "masked-unreliable",
          technicalConfidence: Math.min(Number(ctx.technicalConfidence || 0), 20),
          sanityIssues: ctx.sanityIssues || [],
          maskedFields: [
            "raw trend",
            "raw momentum",
            "EMA values",
            "RSI14",
            "ATR14",
            "support",
            "resistance",
            "priceVsEMA200",
            "technicalBias"
          ],
          diagnosticSummary: "Technical data failed sanity checks. Raw trend/EMA/RSI/support/resistance fields are intentionally masked and must not be used as directional evidence.",
          dataQuality: ctx.dataQuality || null,
          sourceSelection: ctx.sourceSelection ? {
            selected: ctx.sourceSelection.selected,
            attempts: ctx.sourceSelection.attempts?.map((a) => ({
              sourceName: a.sourceName,
              symbol: a.symbol,
              qualityScore: a.qualityScore,
              qualityLabel: a.qualityLabel,
              cleanCount: a.cleanCount,
              issues: a.issues,
              ok: a.ok,
            }))
          } : null,
          guardrails: [
            "Do not use this technical context as bullish or bearish evidence.",
            "Do not mention raw mild-bullish/mild-bearish labels from the original technical calculation.",
            "Treat technicals as unavailable for scenario confirmation until data quality is repaired."
          ],
        };
      }

      return {
        ...ctx,
        usableForScenario: ctx.status === "available",
      };
    }


    function normalizeOneSourceHealth(item) {
      const status = String(item?.status || "unknown").toLowerCase();
      const message = String(item?.message || "");
      const lower = message.toLowerCase();

      if (lower.includes("429") || lower.includes("rate-limit") || lower.includes("rate limit") || lower.includes("too many requests")) {
        return {
          ...item,
          status: "rate-limited",
          originalStatus: item?.status || "unknown",
          conservative: true,
          message: item?.message || "Rate limited.",
        };
      }

      if (lower.includes("missing-key") || lower.includes("not connected") || lower.includes("missing key")) {
        return {
          ...item,
          status: item?.status === "live" ? "missing-key" : item?.status,
          conservative: true,
        };
      }

      if (status === "live" && /error|failed|fallback/i.test(message)) {
        return {
          ...item,
          status: "degraded",
          originalStatus: item?.status || "live",
          conservative: true,
        };
      }

      return item;
    }

    function normalizeSourceHealth(health) {
      const h = health || {};
      return Object.fromEntries(
        Object.entries(h).map(([key, value]) => [key, normalizeOneSourceHealth(value)])
      );
    }

    function conservativeStatusFromHealth(item) {
      const s = String(item?.status || "unknown").toLowerCase();
      if (s === "rate-limited") return "rate-limited";
      if (s === "degraded") return "degraded";
      if (s === "partial") return "partial";
      if (s === "missing-key") return "missing-key";
      if (s === "live") return "live";
      return s || "unknown";
    }

    function applySourceHealthConservatism(flags, normalizedHealth) {
      const next = { ...(flags || {}) };
      next.sourceReliabilitySummary = {
        ...(next.sourceReliabilitySummary || {}),
        fred: conservativeStatusFromHealth(normalizedHealth?.fred),
        gdelt: conservativeStatusFromHealth(normalizedHealth?.gdelt),
        tradingEconomics: conservativeStatusFromHealth(normalizedHealth?.tradingEconomics),
        reddit: conservativeStatusFromHealth(normalizedHealth?.reddit),
        youtube: conservativeStatusFromHealth(normalizedHealth?.youtube),
      };

      if (next.sourceReliabilitySummary.fred === "rate-limited") {
        next.macroReliability = next.macroReliability === "complete" ? "partial" : (next.macroReliability || "partial");
        next.fredRateLimited = true;
      }

      if (next.sourceReliabilitySummary.gdelt === "rate-limited") {
        next.newsReliability = "rate-limited";
        next.newsStrength = next.newsStrength === "strong" ? "moderate" : (next.newsStrength || "weak");
        next.gdeltRateLimited = true;
      }

      if (Object.values(next.sourceReliabilitySummary).some((s) => s === "rate-limited" || s === "degraded")) {
        next.sourceHealthConservative = true;
      }

      return next;
    }


    const REPLAY_STORAGE_KEY = "goldscope.eventReplayRecords.v1";

    function readReplayRecords() {
      try {
        const raw = localStorage.getItem(REPLAY_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    function writeReplayRecords(records) {
      try {
        localStorage.setItem(REPLAY_STORAGE_KEY, JSON.stringify((records || []).slice(-200)));
      } catch (err) {
        console.warn("Failed to write replay records", err);
      }
    }

    function getReplayEvidenceSnapshot() {
      const records = readReplayRecords();
      const sorted = records.filter(Boolean).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
      const recent = sorted.slice(0, 10);
      const classified = recent.map((r) => r?.reactionClassification?.bias).filter(Boolean);
      const bullishCount = classified.filter((x) => x === "bullish_reaction").length;
      const bearishCount = classified.filter((x) => x === "bearish_reaction").length;
      const contradictoryCount = classified.filter((x) => String(x).includes("contradictory")).length;
      let replaySignal = "missing";
      if (recent.length) {
        if (bullishCount > bearishCount && bullishCount >= 2) replaySignal = "bullish_reaction_pattern";
        else if (bearishCount > bullishCount && bearishCount >= 2) replaySignal = "bearish_reaction_pattern";
        else if (contradictoryCount >= 2) replaySignal = "contradictory_pattern";
        else replaySignal = "limited_mixed";
      }
      return {
        latest: sorted[0] || null,
        recent,
        count: sorted.length,
        replaySignal,
        summary: {
          bullishCount,
          bearishCount,
          contradictoryCount,
          avgQuality: recent.length ? Number((recent.reduce((a, b) => a + Number(b.qualityScore || 0), 0) / recent.length).toFixed(1)) : 0,
        },
      };
    }

    function inferReplayMove(before, after, epsilon = 0.0005) {
      const b = Number(before);
      const a = Number(after);
      if (!Number.isFinite(b) || !Number.isFinite(a) || Math.abs(b) < 1e-9) return { change: null, pct: null, direction: "unknown" };
      const change = a - b;
      const pct = change / Math.abs(b);
      return {
        change: Number(change.toFixed(4)),
        pct: Number((pct * 100).toFixed(4)),
        direction: pct > epsilon ? "up" : pct < -epsilon ? "down" : "flat",
      };
    }

    function classifyReplayReaction(reactions) {
      const g = reactions?.gold?.direction;
      if (g === "up") return { label: "gold_supportive_reaction", bias: "bullish_reaction", summary: "Gold proxy rose after the event anchor." };
      if (g === "down") return { label: "gold_negative_reaction", bias: "bearish_reaction", summary: "Gold proxy fell after the event anchor." };
      if (g === "flat") return { label: "muted_reaction", bias: "neutral_reaction", summary: "Gold proxy reaction was muted." };
      return { label: "insufficient_reaction_data", bias: "unknown", summary: "Not enough before/after data to classify reaction." };
    }

    function capturePreEventReplayAnchor() {
      const event = calendar?.nextMajor || calendar?.eventRiskSummary?.nextMajor || null;
      if (!event) {
        setReplayStatus("No next major event available to anchor.");
        return null;
      }
      if (!technicalContext || technicalContext.status === "missing" || String(technicalStatus || "").toLowerCase().includes("loading")) {
        setReplayStatus("Load technical context first and wait until it is ready before capturing anchor.");
        return null;
      }
      const tfKey = technicalContext?.timeframes ? Object.keys(technicalContext.timeframes)[0] : null;
      const tf = tfKey ? technicalContext.timeframes[tfKey] : null;
      const anchor = {
        event,
        capturedAt: new Date().toISOString(),
        before: {
          goldPrice: tf?.lastPrice || "",
          usdIndex: "",
          nominalYield: "",
          realYield: "",
        },
        technicalBefore: {
          status: technicalContext.status,
          usableForScenario: technicalContext.usableForScenario,
          technicalBias: technicalContext.technicalBias,
          technicalConfidence: technicalContext.technicalConfidence,
          multiTimeframe: technicalContext.multiTimeframe || null,
          selectedTimeframe: tfKey,
          selectedBlock: tf || null,
        },
      };
      localStorage.setItem("goldscope.eventReplayAnchor.v1", JSON.stringify(anchor));
      setReplayStatus(`Pre-event anchor captured for ${event.name || event.id}.`);
      return anchor;
    }

    function saveManualReplayRecord() {
      try {
        const anchorRaw = localStorage.getItem("goldscope.eventReplayAnchor.v1");
        if (!anchorRaw) {
          setReplayStatus("No pre-event anchor found. Click Capture Pre-Event Anchor first.");
          return null;
        }
        if (!technicalContext || technicalContext.status === "missing" || String(technicalStatus || "").toLowerCase().includes("loading")) {
          setReplayStatus("Load technical context first and wait until it is ready before saving replay.");
          return null;
        }
        const anchor = JSON.parse(anchorRaw);
        const event = anchor.event || calendar?.nextMajor || calendar?.eventRiskSummary?.nextMajor || {};
        const tfKey = technicalContext?.timeframes ? Object.keys(technicalContext.timeframes)[0] : null;
        const tf = tfKey ? technicalContext.timeframes[tfKey] : null;
        const beforeGold = anchor?.before?.goldPrice || "";
        const afterGold = tf?.lastPrice || "";
        const reactions = {
          gold: inferReplayMove(beforeGold, afterGold),
          usd: inferReplayMove(anchor?.before?.usdIndex, ""),
          nominalYield: inferReplayMove(anchor?.before?.nominalYield, ""),
          realYield: inferReplayMove(anchor?.before?.realYield, ""),
        };
        const reactionClassification = classifyReplayReaction(reactions);
        const record = {
          id: `replay-${event.id || "manual"}-${Date.now()}`,
          createdAt: new Date().toISOString(),
          event: {
            id: event.id || "",
            name: event.name || "",
            date: event.date || "",
            time: event.time || "",
            category: event.category || "",
            importance: event.importance || "",
            source: event.source || "",
          },
          eventOutcome: {
            previous: event.previous || "",
            forecast: event.forecast || "",
            actual: event.actual || "",
            surpriseDirection: "",
            notes: "Manual replay record; event actual/forecast can be extended later.",
          },
          before: anchor.before || {},
          after: {
            goldPrice: afterGold,
            usdIndex: "",
            nominalYield: "",
            realYield: "",
          },
          reactions,
          reactionClassification,
          technicalBefore: anchor.technicalBefore || null,
          technicalAfter: {
            status: technicalContext.status,
            usableForScenario: technicalContext.usableForScenario,
            technicalBias: technicalContext.technicalBias,
            technicalConfidence: technicalContext.technicalConfidence,
            multiTimeframe: technicalContext.multiTimeframe || null,
            selectedTimeframe: tfKey,
            selectedBlock: tf || null,
          },
          qualityScore: beforeGold && afterGold ? 45 : 20,
          notes: "Saved from GoldScope Replay UI.",
        };
        const records = readReplayRecords();
        writeReplayRecords([...records, record]);
        const snapshot = getReplayEvidenceSnapshot();
        setReplayEvidence(snapshot);
        setReplayStatus(`Replay record saved: ${record.reactionClassification.label}, quality=${record.qualityScore}.`);
        return record;
      } catch (err) {
        setReplayStatus(`Replay save failed: ${err.message}`);
        return null;
      }
    }

    function clearReplayRecords() {
      writeReplayRecords([]);
      localStorage.removeItem("goldscope.eventReplayAnchor.v1");
      const snapshot = getReplayEvidenceSnapshot();
      setReplayEvidence(snapshot);
      setReplayStatus("Replay records and anchor cleared.");
    }

    useEffect(() => {
      try {
        setReplayEvidence(getReplayEvidenceSnapshot());
        setReplayStatus("Replay evidence loaded from local storage.");
      } catch (err) {
        setReplayStatus(`Replay evidence load skipped: ${err.message}`);
      }
    }, []);


    function getManualReplayEvidenceForSnapshot() {
      try {
        const raw = localStorage.getItem("goldscope.manualReplayRecords.v1");
        const parsed = raw ? JSON.parse(raw) : [];
        const records = Array.isArray(parsed) ? parsed : [];
        const sorted = records.filter(Boolean).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
        const recent = sorted.slice(0, 10);
        const classified = recent.map((r) => r?.reactionClassification?.bias).filter(Boolean);
        const bullishCount = classified.filter((x) => x === "bullish_reaction").length;
        const bearishCount = classified.filter((x) => x === "bearish_reaction").length;
        const contradictoryCount = classified.filter((x) => String(x).includes("contradictory")).length;
        let replaySignal = "missing";
        if (recent.length) {
          if (bullishCount > bearishCount && bullishCount >= 2) replaySignal = "bullish_reaction_pattern";
          else if (bearishCount > bullishCount && bearishCount >= 2) replaySignal = "bearish_reaction_pattern";
          else replaySignal = "limited_mixed";
        }
        return {
          latest: sorted[0] || null,
          recent,
          count: sorted.length,
          replaySignal,
          summary: {
            bullishCount,
            bearishCount,
            contradictoryCount,
            avgQuality: recent.length ? Number((recent.reduce((a, b) => a + Number(b.qualityScore || 0), 0) / recent.length).toFixed(1)) : 0,
          },
        };
      } catch {
        return { latest: null, recent: [], count: 0, replaySignal: "missing", summary: { bullishCount: 0, bearishCount: 0, contradictoryCount: 0, avgQuality: 0 } };
      }
    }


    const SNAPSHOT_STORAGE_KEY = "goldscope.latestSnapshot.v1";

    function saveLatestSnapshotForReplay(snapshot) {
      try {
        localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
      } catch (err) {
        console.warn("Failed to save latest snapshot for replay", err);
      }
      return snapshot;
    }

    function readLatestSnapshotForReplay() {
      try {
        const raw = localStorage.getItem(SNAPSHOT_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }

    
    function buildMacroGateLanguageHints() {
      return {
        available: true,
        nfpWeakYieldUsdDown: "If NFP materially weakens labor expectations and yields/USD fall, then gold may rise.",
        nfpStrongYieldUsdUp: "If NFP strengthens labor expectations and yields/USD rise, then gold may fall.",
        cpiHotRealYieldsDown: "If CPI is hot but real yields fall, then gold may rise.",
        cpiHotRealYieldsUp: "If CPI is hot and real yields rise, then gold may fall.",
        instruction: "When macroGateLanguageHints exists, copy these gates exactly in the Decision gates section.",
      };
    }


function parseMacroNumber(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const cleaned = raw.replace(/,/g, "").replace(/\s+/g, "");
  const match = cleaned.match(/(-?\d+(?:\.\d+)?)([kKmMbB%]*)/);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n)) return null;
  const suffix = (match[2] || "").toLowerCase();
  if (suffix === "k") return n;
  if (suffix === "m") return n * 1000;
  if (suffix === "b") return n * 1000000;
  return n;
}

function formatK(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return `${Math.round(n)}K`;
}

function findFredDriverValue(fredRows, id) {
  const row = (fredRows || []).find((r) => String(r.id || r.label || "").toUpperCase() === String(id || "").toUpperCase());
  if (!row) return null;
  return row;
}

function buildFredEmploymentBackfill(fredRows) {
  const payems = findFredDriverValue(fredRows, "PAYEMS");
  const unrate = findFredDriverValue(fredRows, "UNRATE");

  const payemsChange = Number(payems?.change);
  const unrateLatest = Number(unrate?.latest);

  return {
    payemsActualK: Number.isFinite(payemsChange) ? Math.round(payemsChange) : null,
    payemsActual: Number.isFinite(payemsChange) ? formatK(payemsChange) : "",
    unemploymentRate: Number.isFinite(unrateLatest) ? `${round2(unrateLatest)}%` : "",
    source: Number.isFinite(payemsChange) || Number.isFinite(unrateLatest) ? "FRED employment fallback" : "",
    payemsSource: Number.isFinite(payemsChange) ? "FRED PAYEMS fallback" : "",
    unrateSource: Number.isFinite(unrateLatest) ? "FRED UNRATE fallback" : "",
  };
}

function normalizeEventResultValue(result, event, key) {
  const v = result?.[key] ?? event?.[key] ?? "";
  return String(v ?? "").trim();
}

function isEmploymentSituationEvent(event) {
  const name = String(event?.name || "").toLowerCase();
  const category = String(event?.category || "").toLowerCase();
  const id = String(event?.id || "").toLowerCase();
  return category.includes("labor") || name.includes("employment situation") || name.includes("non-farm") || name.includes("nonfarm") || id.includes("nfp");
}

function eventActualForecastExtractor(event, result = {}) {
  const actual = normalizeEventResultValue(result, event, "actual");
  const forecast = normalizeEventResultValue(result, event, "forecast");
  const previous = normalizeEventResultValue(result, event, "previous");

  const actualK = parseMacroNumber(actual);
  const forecastK = parseMacroNumber(forecast);
  const previousK = parseMacroNumber(previous);

  const surpriseK = Number.isFinite(actualK) && Number.isFinite(forecastK) ? Math.round(actualK - forecastK) : null;
  const previousDeltaK = Number.isFinite(actualK) && Number.isFinite(previousK) ? Math.round(actualK - previousK) : null;

  let surpriseDirection = "unknown";
  if (Number.isFinite(surpriseK)) {
    if (surpriseK > 10) surpriseDirection = "stronger_than_expected";
    else if (surpriseK < -10) surpriseDirection = "weaker_than_expected";
    else surpriseDirection = "near_forecast";
  }

  let previousComparison = "unknown";
  if (Number.isFinite(previousDeltaK)) {
    if (previousDeltaK > 10) previousComparison = "higher_than_previous";
    else if (previousDeltaK < -10) previousComparison = "lower_than_previous";
    else previousComparison = "near_previous";
  }

  return {
    actual,
    forecast,
    previous,
    actualK,
    forecastK,
    previousK,
    surpriseK,
    surpriseDirection,
    previousDeltaK,
    previousComparison,
    source: result?.source || event?.source || "",
    savedAt: result?.savedAt || "",
    status: actual ? "available" : "missing",
  };
}

function parseSectorCompositionText(text) {
  const raw = String(text || "").trim();
  if (!raw) return [];

  const aliases = [
    ["leisureAndHospitality", /leisure\s*(?:and|&)\s*hospitality/i, "Leisure and hospitality", "cyclical_or_event_sensitive"],
    ["healthCareAndSocialAssistance", /health\s*care(?:\s*and\s*social\s*assistance)?|social\s*assistance/i, "Health care and social assistance", "defensive_structural"],
    ["government", /\bgovernment\b/i, "Government", "public_sector"],
    ["professionalAndBusinessServices", /professional\s*(?:and|&)\s*business\s*services|business\s*services/i, "Professional and business services", "higher_quality_private"],
    ["manufacturing", /\bmanufacturing\b/i, "Manufacturing", "cyclical_high_quality"],
    ["construction", /\bconstruction\b/i, "Construction", "cyclical_private"],
    ["retailTrade", /retail\s*trade/i, "Retail trade", "consumer_service"],
    ["temporaryHelp", /temporary\s*help/i, "Temporary help services", "lower_quality_cyclical"],
    ["transportationAndWarehousing", /transportation\s*(?:and|&)\s*warehousing|warehousing/i, "Transportation and warehousing", "cyclical_private"],
    ["information", /\binformation\b/i, "Information", "higher_wage_private"],
    ["financialActivities", /financial\s*activities/i, "Financial activities", "higher_wage_private"],
    ["miningAndLogging", /mining\s*(?:and|&)\s*logging/i, "Mining and logging", "cyclical_private"],
    ["education", /\beducation\b/i, "Education", "mixed_public_private"],
    ["otherServices", /other\s*services/i, "Other services", "service_sector"],
  ];

  const out = [];
  for (const [key, re, label, qualityTag] of aliases) {
    const lineMatch = raw
      .split(/\r?\n|;/)
      .map((x) => x.trim())
      .find((line) => re.test(line));

    if (!lineMatch) continue;

    const valueMatch =
      lineMatch.match(/(?:\+|increase(?:d)?\s+by|added|gain(?:ed)?|change(?:d)?\s*[:=]?)\s*(-?\d+(?:\.\d+)?)\s*[kK]?/) ||
      lineMatch.match(/(-?\d+(?:\.\d+)?)\s*[kK]?\s*(?:jobs|payrolls|employment|change)?/i);

    const changeK = valueMatch ? Number(valueMatch[1]) : null;
    out.push({
      key,
      label,
      changeK: Number.isFinite(changeK) ? changeK : null,
      qualityTag,
      sourceText: lineMatch,
    });
  }

  return out;
}

function blsEmploymentSituationParser(event, result = {}) {
  const detailsText = [result?.sectorCompositionText, result?.notes, event?.notes].filter(Boolean).join("\n");
  const sectors = parseSectorCompositionText(detailsText);

  return {
    unemploymentRate: String(result?.unemploymentRate || event?.unemploymentRate || "").trim(),
    averageHourlyEarningsMoM: String(result?.averageHourlyEarningsMoM || result?.averageHourlyEarnings || event?.averageHourlyEarningsMoM || "").trim(),
    averageHourlyEarningsYoY: String(result?.averageHourlyEarningsYoY || event?.averageHourlyEarningsYoY || "").trim(),
    sectorBreakdown: sectors,
    source: sectors.length ? "event result notes / sector composition text" : "not_available",
    parserStatus: sectors.length ? "parsed_from_text" : "sector_breakdown_missing",
  };
}

function laborCompositionAnalyzer(headline, details) {
  const sectors = details?.sectorBreakdown || [];
  const actualK = Number(headline?.actualK);
  const enriched = sectors.map((s) => ({
    ...s,
    shareOfHeadline: Number.isFinite(actualK) && actualK !== 0 && Number.isFinite(Number(s.changeK))
      ? Number((Number(s.changeK) / actualK).toFixed(2))
      : null,
  }));

  const leisure = enriched.find((s) => s.key === "leisureAndHospitality");
  const tempHelp = enriched.find((s) => s.key === "temporaryHelp");
  const gov = enriched.find((s) => s.key === "government");
  const higherQuality = enriched.filter((s) => ["professionalAndBusinessServices", "manufacturing", "construction", "financialActivities", "information"].includes(s.key));

  let sectorConcentration = "not_yet_verified";
  let breadth = "not_yet_verified";
  let compositionSignal = "composition_not_verified";
  let eventSensitivityNote = "Sector composition is not available; do not infer durability from the headline alone.";

  if (enriched.length) {
    const largest = [...enriched]
      .filter((s) => Number.isFinite(Number(s.changeK)))
      .sort((a, b) => Math.abs(Number(b.changeK)) - Math.abs(Number(a.changeK)))[0];

    const leisureHeavy = leisure && Number(leisure.shareOfHeadline) >= 0.25;
    const tempHeavy = tempHelp && Number(tempHelp.shareOfHeadline) >= 0.15;
    const govHeavy = gov && Number(gov.shareOfHeadline) >= 0.25;
    const highQualityPrivate = higherQuality.reduce((sum, s) => sum + (Number(s.shareOfHeadline) || 0), 0);

    if (leisureHeavy) {
      sectorConcentration = "leisure_hospitality_heavy";
      compositionSignal = "lower_quality_if_leisure_hospitality_concentrated";
      eventSensitivityNote = "A large leisure/hospitality contribution can be seasonal or event-sensitive, so the headline beat should be discounted unless confirmed by broader private-sector hiring.";
    } else if (tempHeavy) {
      sectorConcentration = "temporary_help_heavy";
      compositionSignal = "lower_quality_if_temporary_help_concentrated";
      eventSensitivityNote = "Temporary-help concentration is a lower-quality cyclical hiring signal.";
    } else if (govHeavy) {
      sectorConcentration = "government_heavy";
      compositionSignal = "lower_quality_if_public_sector_concentrated";
      eventSensitivityNote = "Government-heavy hiring is less direct evidence of private-sector demand strength.";
    } else if (highQualityPrivate >= 0.45) {
      sectorConcentration = "higher_quality_private_broadening";
      compositionSignal = "higher_quality_private_sector_support";
      eventSensitivityNote = "Private-sector breadth is stronger when gains are spread across higher-quality categories.";
    } else {
      sectorConcentration = largest?.key ? `${largest.key}_largest` : "mixed";
      compositionSignal = "mixed_or_unclassified";
      eventSensitivityNote = "Composition is available but does not show a clearly dominant quality signal.";
    }

    breadth = enriched.length >= 5 ? "broader_verified" : "partial_verified";
  }

  return {
    sectorConcentration,
    breadth,
    compositionSignal,
    eventSensitivityNote,
    sectorBreakdown: enriched,
  };
}

function laborQualityClassifier(headline, details, composition) {
  const strongHeadline = headline?.surpriseDirection === "stronger_than_expected";
  const weakHeadline = headline?.surpriseDirection === "weaker_than_expected";
  const forecastMissing = headline?.surpriseDirection === "forecast_missing";

  let headlineSignal = "unknown";
  if (forecastMissing && headline?.actual) headlineSignal = "actual_available_forecast_missing";
  else if (strongHeadline) headlineSignal = "strong";
  else if (weakHeadline) headlineSignal = "weak";
  else if (headline?.surpriseDirection === "near_forecast") headlineSignal = "near_forecast";

  let qualityScore = 0;
  if (strongHeadline) qualityScore += 2;
  if (weakHeadline) qualityScore -= 2;

  if (composition?.compositionSignal?.startsWith("lower_quality")) qualityScore -= 1;
  if (composition?.compositionSignal === "higher_quality_private_sector_support") qualityScore += 1;

  if (String(details?.averageHourlyEarningsMoM || "").includes("0.3")) qualityScore += 0.5;

  let qualityLabel = "not_verified";
  if (headlineSignal === "actual_available_forecast_missing") qualityLabel = "actual_available_forecast_missing";
  else if (qualityScore >= 2.5) qualityLabel = "strong_and_higher_quality";
  else if (qualityScore >= 1) qualityLabel = "headline_strong_but_quality_dependent";
  else if (qualityScore <= -1) qualityLabel = "weak_or_lower_quality";
  else qualityLabel = "mixed_or_inconclusive";

  return {
    headlineSignal,
    compositionSignal: composition?.compositionSignal || "composition_not_verified",
    qualityScore: Number(qualityScore.toFixed(2)),
    qualityLabel,
    caveat: composition?.eventSensitivityNote || "Composition not verified.",
  };
}

function fedImplicationMapper(headline, quality) {
  if (headline?.surpriseDirection === "forecast_missing") {
    return "neutral_or_data_dependent";
  }
  if (headline?.surpriseDirection === "stronger_than_expected") {
    if (quality?.qualityLabel === "headline_strong_but_quality_dependent") return "less_dovish_but_quality_dependent";
    if (quality?.qualityLabel === "strong_and_higher_quality") return "less_dovish_or_more_hawkish";
    return "less_dovish";
  }
  if (headline?.surpriseDirection === "weaker_than_expected") return "more_dovish";
  return "neutral_or_data_dependent";
}

function goldImpactMapper(headline, quality, fedImplication) {
  const confirmationRequired = ["DXY", "DGS10", "DFII10", "gold post-event reaction"];

  if (headline?.surpriseDirection === "forecast_missing" && headline?.actual) {
    return {
      goldImpact: "wait_for_confirmation",
      rationale: "Actual payroll change is available from FRED, but surprise cannot be calculated without forecast. Do not infer stronger/weaker labor impact until forecast/previous and market reaction context are available.",
      confirmationRequired,
    };
  }

  if (fedImplication === "more_dovish") {
    return {
      goldImpact: "conditionally_bullish",
      rationale: "A weaker labor surprise can support gold if it lowers USD, nominal yields, and real yields.",
      confirmationRequired,
    };
  }

  if (String(fedImplication).includes("less_dovish") || String(fedImplication).includes("hawkish")) {
    return {
      goldImpact: quality?.compositionSignal?.startsWith("lower_quality") ? "bearish_but_downgraded_by_composition" : "conditionally_bearish",
      rationale: "A stronger labor surprise is first-order gold-negative if it lifts USD/yields or reduces rate-cut expectations; composition quality can weaken or strengthen that signal.",
      confirmationRequired,
    };
  }

  return {
    goldImpact: "wait_for_confirmation",
    rationale: "The labor signal is not strong enough to infer gold direction without USD/yield and post-event reaction confirmation.",
    confirmationRequired,
  };
}

function buildEmploymentEventIntelligence(calendarEvents, eventResults, replayEvidence, fredRows = []) {
  const laborEvents = [...(calendarEvents || [])]
    .filter((e) => isEmploymentSituationEvent(e))
    .sort((a, b) => eventTimeToTimestamp(b) - eventTimeToTimestamp(a));

  const latestCompleted = laborEvents.find((e) => eventTimeToTimestamp(e) <= Date.now()) || laborEvents[0] || null;
  if (!latestCompleted) {
    return {
      available: false,
      status: "no_employment_event_found",
      note: "No employment event is available in the calendar.",
    };
  }

  const result = eventResults?.[latestCompleted.id] || {};
  const fredBackfill = buildFredEmploymentBackfill(fredRows);
  const headline = eventActualForecastExtractor(latestCompleted, result);

  const actualWasMissing = !headline.actual;
  if (actualWasMissing && fredBackfill.payemsActual) {
    headline.actual = fredBackfill.payemsActual;
    headline.actualK = fredBackfill.payemsActualK;
    headline.source = fredBackfill.payemsSource || headline.source || "FRED PAYEMS fallback";
    headline.status = "partial_fred_backfill";
  }

  // v2.41.1 guardrail:
  // Do not compute stronger/weaker surprise unless forecast exists.
  if (!headline.forecast) {
    headline.surpriseK = null;
    headline.surpriseDirection = "forecast_missing";
  }

  // Do not backfill previous from FRED PAYEMS level or previous level.
  // Previous event value must come from eventResults/calendar/provider.
  if (!headline.previous) {
    headline.previousK = null;
    headline.previousDeltaK = null;
    headline.previousComparison = "previous_missing";
  }

  const details = blsEmploymentSituationParser(latestCompleted, result);
  if (!details.unemploymentRate && fredBackfill.unemploymentRate) {
    details.unemploymentRate = fredBackfill.unemploymentRate;
    details.unemploymentRateSource = fredBackfill.unrateSource || "FRED UNRATE fallback";
  }

  const composition = laborCompositionAnalyzer(headline, details);
  const quality = laborQualityClassifier(headline, details, composition);
  const fedImplication = fedImplicationMapper(headline, quality);
  const gold = goldImpactMapper(headline, quality, fedImplication);

  const replayLatest = replayEvidence?.latest || {};
  const hasAnyLaborData = Boolean(headline.actual || headline.forecast || headline.previous || details.unemploymentRate || details.sectorBreakdown?.length);
  const available = hasAnyLaborData;

  let status = "missing_actual_forecast";
  if (headline.status === "partial_fred_backfill" && !headline.forecast && !headline.previous) status = "partial_fred_backfill";
  else if (available && !headline.forecast) status = "partial_missing_forecast";
  else if (available) status = "available";

  return {
    available,
    status,
    event: {
      id: latestCompleted.id,
      name: latestCompleted.name,
      date: latestCompleted.date,
      time: latestCompleted.time,
      source: headline.source || latestCompleted.source || "",
    },
    headline: {
      actual: headline.actual,
      forecast: headline.forecast,
      previous: headline.previous,
      surpriseK: headline.surpriseK,
      surpriseDirection: headline.surpriseDirection,
      previousDeltaK: headline.previousDeltaK,
      previousComparison: headline.previousComparison,
      actualSource: headline.source || "",
      headlineInterpretation: headline.surpriseDirection === "forecast_missing"
        ? "actual_available_forecast_missing"
        : headline.surpriseDirection === "stronger_than_expected"
          ? "strong_vs_forecast"
          : headline.surpriseDirection === "weaker_than_expected"
            ? "weak_vs_forecast"
            : headline.surpriseDirection,
    },
    details: {
      unemploymentRate: details.unemploymentRate,
      averageHourlyEarningsMoM: details.averageHourlyEarningsMoM,
      averageHourlyEarningsYoY: details.averageHourlyEarningsYoY,
      sectorConcentration: composition.sectorConcentration,
      breadth: composition.breadth,
      sectorBreakdown: composition.sectorBreakdown,
      parserStatus: details.parserStatus,
      unemploymentRateSource: details.unemploymentRateSource || "",
    },
    quality: {
      headlineSignal: quality.headlineSignal,
      compositionSignal: quality.compositionSignal,
      laborQualityScore: quality.qualityScore,
      laborQualityLabel: quality.qualityLabel,
      fedImplication,
      goldImpact: gold.goldImpact,
      rationale: gold.rationale,
      compositionCaveat: quality.caveat,
      confirmationRequired: gold.confirmationRequired,
    },
    replayContext: replayLatest?.eventName ? {
      latestEventName: replayLatest.eventName,
      observedReaction: replayLatest.observedReaction || "",
      alignment: replayLatest.alignment || "",
      interpretation: replayLatest.interpretation || "",
    } : null,
    guardrail: "Employment event intelligence is composition-aware context only. Do not treat a headline NFP beat as uniformly hawkish until sector composition, wages, unemployment, USD/yields and replay reaction are checked.",
  };
}

function formatEmploymentEventFactsForPrompt(snapshot) {
  const e = snapshot?.employmentEvent;
  if (!e?.available) {
    return `EMPLOYMENT EVENT INTELLIGENCE:
Status: ${e?.status || "missing"}.
No usable actual/forecast/previous, unemployment rate, or sector composition is available. Do not infer employment-event quality.`;
  }

  const sectors = e.details?.sectorBreakdown?.length
    ? e.details.sectorBreakdown.map((s) => `- ${s.label}: ${Number.isFinite(Number(s.changeK)) ? formatK(s.changeK) : "n/a"}; share=${s.shareOfHeadline ?? "n/a"}; qualityTag=${s.qualityTag}`).join("\n")
    : "- sector breakdown not available";

  return `EMPLOYMENT EVENT INTELLIGENCE:
Event: ${e.event?.name} (${e.event?.date} ${e.event?.time})
Headline:
- actual=${e.headline?.actual || "missing"}
- actualSource=${e.headline?.actualSource || "unknown"}
- forecast=${e.headline?.forecast || "missing"}
- previous=${e.headline?.previous || "missing"}
- surpriseK=${e.headline?.surpriseK ?? "unknown"}
- surpriseDirection=${e.headline?.surpriseDirection || "unknown"}
Details:
- unemploymentRate=${e.details?.unemploymentRate || "missing"}
- unemploymentRateSource=${e.details?.unemploymentRateSource || "unknown"}
- averageHourlyEarningsMoM=${e.details?.averageHourlyEarningsMoM || "missing"}
- sectorConcentration=${e.details?.sectorConcentration || "not_yet_verified"}
- breadth=${e.details?.breadth || "not_yet_verified"}
Sector breakdown:
${sectors}
Quality:
- headlineSignal=${e.quality?.headlineSignal || "unknown"}
- compositionSignal=${e.quality?.compositionSignal || "unknown"}
- laborQualityLabel=${e.quality?.laborQualityLabel || "unknown"}
- fedImplication=${e.quality?.fedImplication || "unknown"}
- goldImpact=${e.quality?.goldImpact || "unknown"}
- compositionCaveat=${e.quality?.compositionCaveat || ""}
- confirmationRequired=${(e.quality?.confirmationRequired || []).join(", ")}
Guardrail: Do not treat headline NFP as uniformly hawkish/dovish until sector composition, wage pressure, unemployment, USD/yields and replay reaction are checked. If leisure/hospitality is concentrated, describe it as potentially seasonal/event-sensitive unless independent evidence attributes it to a specific event such as the World Cup.`;
}


function buildGoldScopeContextSnapshot() {
      const scenario = buildScenarioModel();
      const fredCompact = compactFredRows();
      const replayCompact = compactReplay();
      const qualityFlags = computeContextQuality(fredCompact, null, replayCompact);

      const employmentEvent = buildEmploymentEventIntelligence(calendarUniverse, eventResults, replayCompact, fredCompact);

      const snapshot = {
        generatedAt: new Date().toISOString(),
        instrument: "XAUUSD / Gold only",
        appVersion: "GoldScope v2.41.1.11",
        deterministicScenarioLab: {
          dominant: scenario?.dominant,
          confidence: scenario?.confidence,
          scores: scenario?.scores,
          macroDirection: scenario?.macroDirection,
          newsDirection: scenario?.newsDirection,
          replaySignal: scenario?.replaySignal,
          nextMajor: scenario?.nextMajor,
          gates: scenario?.gates || [],
        },
        fredMacroDrivers: fredCompact,
        gdeltNews: {
          score: newsScore,
          items: compactNews(),
        },
        calendar: compactCalendar(),
        replayEvidence: replayCompact,
        employmentEvent,
        technicalContext: maskTechnicalContextForPrompt(technicalContext),
        alignmentContext: buildAlignmentContextForSnapshot(scenario.macroDirection, maskTechnicalContextForPrompt(technicalContext)),
        macroGateLanguageHints: buildMacroGateLanguageHints(),
        sourceHealth: normalizeSourceHealth(health),
        contextQualityFlags: applySourceHealthConservatism(qualityFlags, normalizeSourceHealth(health)),
        dataReadiness: {
          fredRows: (fredRows || []).length,
          newsItems: (news || []).length,
          calendarEvents: (calendarUniverse || []).length,
          replayRecords: (replayRecords || []).length,
          technicalStatus,
          proxyStatus,
          ollamaStatus,
        },
      };
      setContextSnapshot(snapshot);
      return snapshot;
    }

    
function formatTechnicalNumericFactsForPrompt(snapshot) {
  const tf = snapshot?.technicalContext?.timeframes || {};
  const order = ["1h", "4h", "1d"];

  const rsiLines = [];
  const stochKLines = [];
  const stochDLines = [];

  for (const key of order) {
    const row = tf?.[key];
    if (!row) continue;

    const rsi = Number(row.rsi14);
    if (Number.isFinite(rsi)) rsiLines.push(`- ${key}: ${round2(rsi)}`);

    const k = Number(row.stochRsi14?.k);
    if (Number.isFinite(k)) stochKLines.push(`- ${key}: ${round2(k)}`);

    const d = Number(row.stochRsi14?.d);
    if (Number.isFinite(d)) stochDLines.push(`- ${key}: ${round2(d)}`);
  }

  const requiredPhrase =
    snapshot?.technicalContext?.technicalLanguageHints?.requiredPhrase ||
    snapshot?.technicalContext?.timeframes?.["1h"]?.technicalLanguageHints?.requiredPhrase ||
    "";

  const selectedSource = snapshot?.technicalContext?.sourceName && snapshot?.technicalContext?.symbol
    ? `${snapshot.technicalContext.sourceName}:${snapshot.technicalContext.symbol}`
    : "unknown";

  return `TECHNICAL NUMERIC FACTS — USE ONLY THESE VALUES:
Selected technical source: ${selectedSource}
Allowed RSI14 values:
${rsiLines.length ? rsiLines.join("\n") : "- none provided"}

Allowed StochRSI K values:
${stochKLines.length ? stochKLines.join("\n") : "- none provided"}

Allowed StochRSI D values:
${stochDLines.length ? stochDLines.join("\n") : "- none provided"}

RSI/StochRSI wording rule:
${requiredPhrase ? `- Required phrase to copy exactly in Technical confirmation: "${requiredPhrase}"` : "- No required RSI/StochRSI phrase provided."}
- Do not mention any RSI14, StochRSI K, or StochRSI D numeric value unless it appears in the allowed lists above.
- Do not round to a new value that is not in the allowed lists.
- Do not invent RSI14=35, StochRSI=85, or any other unlisted technical number.
- If you need to discuss RSI/StochRSI qualitatively, use the required phrase above when available.
- Technical numeric facts are confirmation context only and must not be placed under Confirmed evidence.`;
}



function formatDeterministicTechnicalConfirmationText(snapshot) {
  const tech = snapshot?.technicalContext || {};
  const tf = tech?.timeframes?.["1h"] || {};
  const sourceName = tech?.sourceName || "unknown";
  const symbol = tech?.symbol || "unknown";
  const selected = tech?.sourceSelection?.selected || {};
  const sourceLabel = selected?.sourceName && selected?.symbol
    ? `${selected.sourceName}:${selected.symbol} ${selected.range || ""}/${selected.interval || ""}`.trim()
    : `${sourceName}:${symbol}`;

  if (!tech || !tech.status || tech.status === "missing" || tech.status === "error") {
    return "Technical context is unavailable. Do not use technical evidence as directional confirmation.";
  }

  if (tech.status === "unreliable" || tech.usableForScenario === false) {
    return `Technical context is unreliable/masked and must not be used as directional evidence. Status=${tech.status || "unknown"}; usableForScenario=${tech.usableForScenario}.`;
  }

  const requiredPhrase =
    tech?.technicalLanguageHints?.requiredPhrase ||
    tf?.technicalLanguageHints?.requiredPhrase ||
    "";

  const proxyText = symbol === "GC=F" || /GC=F/i.test(sourceLabel)
    ? "Selected source is Yahoo:GC=F, a gold futures proxy for XAUUSD, not direct spot XAUUSD."
    : `Selected source is ${sourceLabel}.`;

  const macd = tf?.macd
    ? `MACD state=${tf.macd.state ?? "unknown"}, histogram=${safeValue(tf.macd.histogram, "unknown")}.`
    : "MACD unavailable.";

  const adx = tf?.adx14
    ? `ADX trendStrength=${tf.adx14.trendStrength ?? "unknown"}, direction=${tf.adx14.direction ?? "unknown"}.`
    : "ADX unavailable.";

  const bollinger = tf?.bollinger20
    ? `Bollinger position=${tf.bollinger20.position ?? "unknown"}, bandwidthPct=${safeValue(tf.bollinger20.bandwidthPct, "unknown")}.`
    : "Bollinger unavailable.";

  const keltner = tf?.keltner20
    ? `Keltner position=${tf.keltner20.position ?? "unknown"}, widthPct=${safeValue(tf.keltner20.widthPct, "unknown")}.`
    : "Keltner unavailable.";

  const candle = tech?.candlestickPatterns || tf?.candlestickPatterns || {};
  const candleNames = (candle?.patterns || []).map((p) => p.name).join(", ") || "none";
  const candleText = candle?.available
    ? `Candlestick context: status=${candle.status}, bias=${candle.bias}, score=${candle.score}, names=${candleNames}.`
    : "Candlestick context unavailable.";

  const strategy = tech?.strategyModules || tf?.strategyModules || {};
  const modules = strategy?.modules || {};
  const moduleText = strategy?.available
    ? `Strategy modules: aggregateBias=${strategy.aggregateBias}, aggregateScore=${strategy.aggregateScore}; trend=${modules.trend?.bias ?? "unknown"}(${modules.trend?.score ?? "unknown"}), momentum=${modules.momentum?.bias ?? "unknown"}(${modules.momentum?.score ?? "unknown"}), volatility=${modules.volatility?.bias ?? "unknown"}(${modules.volatility?.score ?? "unknown"}), structure=${modules.structure?.bias ?? "unknown"}(${modules.structure?.score ?? "unknown"}).`
    : "Strategy modules unavailable.";

  const mtf = tech?.multiTimeframe
    ? `Multi-timeframe context: bias=${tech.multiTimeframe.bias}, score=${tech.multiTimeframe.score}, conflicts=${(tech.multiTimeframe.conflicts || []).join(", ") || "none"}.`
    : "Multi-timeframe context unavailable.";

  const alignment = snapshot?.alignmentContext?.explanation
    ? `Alignment note: ${snapshot.alignmentContext.explanation}`
    : "Alignment note unavailable.";

  const supportText = Array.isArray(tf?.support) && tf.support.length ? tf.support.join(", ") : "none";
  const resistanceText = Array.isArray(tf?.resistance) && tf.resistance.length ? tf.resistance.join(", ") : "none";

  return [
    "Technical context is available and usable only as confirmation context, not as a macro override.",
    proxyText,
    `Data quality: ${tech?.dataQuality?.qualityLabel ?? tech?.reliability ?? "unknown"} with score ${safeValue(tech?.dataQuality?.qualityScore, "unknown")}.`,
    `Technical bias=${tech?.technicalBias ?? "unknown"}; technicalConfidence=${safeValue(tech?.technicalConfidence, "unknown")}.`,
    `Primary timeframe 1h: trend=${tf?.trend ?? "unknown"}, momentum=${tf?.momentum ?? "unknown"}, priceVsEMA200=${tf?.priceVsEMA200 ?? "unknown"}.`,
    requiredPhrase ? `Required RSI/StochRSI wording: ${requiredPhrase}` : "Required RSI/StochRSI wording unavailable.",
    `Expanded indicators: ${macd} ${adx} ${bollinger} ${keltner}`,
    candleText,
    moduleText,
    `Support=${supportText}; resistance=${resistanceText}. These levels come from the selected technical proxy and are not trade instructions.`,
    mtf,
    alignment,
    "Technical context can confirm, weaken, or contradict macro context, but it cannot override blank event actual/forecast values, weak/rate-limited news, or limited/inconclusive replay evidence."
  ].join("\n");
}



function replaceSection7WithDeterministicTechnicalConfirmation(reportText, snapshot) {
  const report = String(reportText || "");
  const deterministicText = formatDeterministicTechnicalConfirmationText(snapshot);

  if (!report.trim() || !deterministicText.trim()) return report;

  const section7 = `7. Technical confirmation\n${deterministicText}\n`;
  const section7Pattern = /(?:^|\n)\s*7\.\s*(?:\*\*)?\s*Technical confirmation(?:\*\*)?\s*[\r\n]+[\s\S]*?(?=\n\s*8\.\s*(?:\*\*)?\s*Decision gates(?:\*\*)?)/i;
  const section8Pattern = /\n\s*8\.\s*(?:\*\*)?\s*Decision gates(?:\*\*)?/i;

  if (section7Pattern.test(report)) {
    return report.replace(section7Pattern, `\n${section7}\n`);
  }

  const section8Match = report.match(section8Pattern);
  if (section8Match && Number.isFinite(section8Match.index)) {
    return `${report.slice(0, section8Match.index).trimEnd()}\n\n${section7}\n${report.slice(section8Match.index).trimStart()}`;
  }

  // If neither Section 7 nor Section 8 exists, avoid changing macro sections.
  // Validator/completion gate will handle incomplete output.
  return report;
}



function extractNumberedSectionBoundaries(reportText, sectionNumber, nextSectionNumber, titlePattern = "") {
  const text = String(reportText || "");
  const title = titlePattern ? String.raw`\s+(?:\*{0,2})?${titlePattern}` : String.raw`\s+`;
  const startRe = new RegExp(String.raw`(?:^|\n)\s*(?:\*{0,2})${sectionNumber}\.(?:\*{0,2})${title}`, "im");
  const startMatch = startRe.exec(text);
  if (!startMatch) return null;

  const afterStart = text.slice(startMatch.index + startMatch[0].length);
  const endRe = new RegExp(String.raw`(?:^|\n)\s*(?:\*{0,2})${nextSectionNumber}\.(?:\*{0,2})\s+`, "im");
  const endMatch = endRe.exec(afterStart);
  if (!endMatch) return null;

  const startIdx = startMatch.index;
  const endIdx = startMatch.index + startMatch[0].length + endMatch.index;

  return {
    before: text.slice(0, startIdx),
    section: text.slice(startIdx, endIdx),
    after: text.slice(endIdx),
    startIdx,
    endIdx,
  };
}

function shouldForceScenarioWaitNeutral(snapshot) {
  const dominant = String(snapshot?.deterministicScenarioLab?.dominant || "").toLowerCase();
  const quality = String(snapshot?.contextQualityFlags?.eventDataCompleteness?.nextMajor?.quality || "").toLowerCase();
  const maxConf = Number(snapshot?.contextQualityFlags?.maxRecommendedConfidence ?? 100);

  return dominant.includes("wait") && quality === "date-only" && Number.isFinite(maxConf) && maxConf <= 25;
}

function forceSection1WaitNeutralIfNeeded(reportText, snapshot) {
  const text = String(reportText || "");
  if (!shouldForceScenarioWaitNeutral(snapshot)) {
    return { text, applied: false, reason: "conditions_not_met" };
  }

  const bounds = extractNumberedSectionBoundaries(text, 1, 2, "Dominant research scenario");
  if (!bounds) {
    return { text, applied: false, reason: "section_1_boundaries_not_found" };
  }

  if (/\bWait\s*[-/]\s*Neutral\b|\bWait\s*\/\s*neutral\b/i.test(bounds.section)) {
    return { text, applied: false, reason: "already_wait_neutral" };
  }

  const nextEvent = snapshot?.deterministicScenarioLab?.nextMajor?.name || snapshot?.calendar?.nextMajor?.name || "the next major event";
  const macroDir = snapshot?.deterministicScenarioLab?.macroDirection || "mixed";
  const techBias = snapshot?.technicalContext?.technicalBias || "unknown";
  const newsStrength = snapshot?.contextQualityFlags?.newsStrength || "unknown";
  const replayRecords = Number(snapshot?.dataReadiness?.replayRecords ?? snapshot?.replayEvidence?.count ?? 0);
  const replayLatest = snapshot?.replayEvidence?.latest || snapshot?.deterministicScenarioLab?.replaySignal || {};
  const replayPhrase = replayRecords > 0
    ? `Replay evidence is available but limited/inconclusive; latest observedReaction=${replayLatest?.observedReaction || "unknown"}, alignment=${replayLatest?.alignment || "unknown"}.`
    : "Replay evidence is missing.";

  const section1 = `\n1. Dominant research scenario\nWait-Neutral.\nThe system should not assign a bullish or bearish research scenario because the next major event has date-only information and actual/forecast values are missing. News strength is ${newsStrength}. ${replayPhrase} Macro direction is ${macroDir} and technical context is ${techBias}, but technical context is confirmation context only and cannot confirm a directional scenario without event outcomes and stronger replay/news evidence. The next major catalyst is ${nextEvent}; until its outcome and market reaction are known, directional bias should remain blocked.\n\n`;

  return {
    text: bounds.before + section1 + bounds.after,
    applied: true,
    reason: "forced_wait_neutral_for_date_only_low_confidence_state",
  };
}

const TECHNICAL_LABEL_KEYWORDS = [
  "technical context", "technicals", "technical bias", "technical bearish", "technical bullish",
  "technical alignment", "technical indicators", "ema alignment", "ema20", "ema50", "ema200",
  "rsi", "rsi14", "macd", "adx", "bollinger", "keltner", "stoch", "stochrsi", "stochastic rsi", "stochrsi <0.2", "stochrsi < 0.2",
  "candlestick", "strategy modules", "trend module", "momentum module", "volatility module",
  "structure module", "multi-timeframe", "multi timeframe", "pricevsema", "support", "resistance"
];

const MACRO_LABEL_KEYWORDS = [
  "macro", "fred", "fed", "fed funds", "10y", "2y", "yield", "real yield", "nominal yield",
  "dfii10", "dgs10", "dgs2", "dtwexbgs", "dxy", "dollar", "usd",
  "cpi", "pce", "inflation", "core cpi", "core pce", "nfp", "payroll", "payems",
  "unemployment", "unrate", "labor", "employment", "gdp", "retail sales", "news", "replay"
];

function containsAnyKeyword(text, keywords) {
  const lo = String(text || "").toLowerCase();
  return keywords.some((kw) => lo.includes(kw));
}

function splitEvidenceTextByTechnicalMacro(evidenceText) {
  const raw = String(evidenceText || "").trim();
  if (!raw) return { macroPart: "", technicalPart: "", mixed: false };

  // Split on common list separators while preserving readable text.
  const chunks = raw
    .split(/\s*(?:;|\band\b|,)\s*/i)
    .map((x) => x.trim())
    .filter(Boolean);

  if (chunks.length <= 1) {
    const hasTech = containsAnyKeyword(raw, TECHNICAL_LABEL_KEYWORDS);
    const hasMacro = containsAnyKeyword(raw, MACRO_LABEL_KEYWORDS);
    if (hasTech && !hasMacro) return { macroPart: "", technicalPart: raw, mixed: false };
    if (hasTech && hasMacro) {
      // Mixed but not safely splittable: keep macro wording minimal and move full line into technical context
      // only if it is dominated by technical keywords. Otherwise leave it to avoid deleting macro evidence.
      const techHits = TECHNICAL_LABEL_KEYWORDS.filter((kw) => raw.toLowerCase().includes(kw)).length;
      const macroHits = MACRO_LABEL_KEYWORDS.filter((kw) => raw.toLowerCase().includes(kw)).length;
      if (techHits > macroHits) return { macroPart: "", technicalPart: raw, mixed: false };
      return { macroPart: raw, technicalPart: "", mixed: false };
    }
    return { macroPart: raw, technicalPart: "", mixed: false };
  }

  const macroChunks = [];
  const techChunks = [];

  for (const chunk of chunks) {
    const hasTech = containsAnyKeyword(chunk, TECHNICAL_LABEL_KEYWORDS);
    const hasMacro = containsAnyKeyword(chunk, MACRO_LABEL_KEYWORDS);

    if (hasTech && !hasMacro) {
      techChunks.push(chunk);
    } else if (hasTech && hasMacro) {
      // If a chunk is explicitly mixed, keep macro words in macro only when clearly macro-dominant.
      const techHits = TECHNICAL_LABEL_KEYWORDS.filter((kw) => chunk.toLowerCase().includes(kw)).length;
      const macroHits = MACRO_LABEL_KEYWORDS.filter((kw) => chunk.toLowerCase().includes(kw)).length;
      if (techHits >= macroHits) techChunks.push(chunk);
      else macroChunks.push(chunk);
    } else {
      macroChunks.push(chunk);
    }
  }

  return {
    macroPart: macroChunks.join(", ").trim(),
    technicalPart: techChunks.join(", ").trim(),
    mixed: macroChunks.length > 0 && techChunks.length > 0,
  };
}

function normalizeConfirmedEvidenceLineWithMixedSplitter(line) {
  const original = String(line || "");

  // v2.41.1.4: handle markdown/bullet variants with colon either inside or outside bold:
  // - **Confirmed evidence:** Technical context ...
  // - **Confirmed evidence**: Technical context ...
  // - - **Confirmed evidence:** RSI / StochRSI / EMA / MACD / ADX / strategy modules ...
  const re = /^(\s*(?:[-*]\s*)?)(?:\*{0,2})\s*Confirmed evidence\s*:?\s*(?:\*{0,2})\s*:?\s*(.*)$/i;
  const m = original.match(re);
  if (!m) return { line: original, changed: false };

  const bullet = m[1] || "";
  const body = (m[2] || "").trim();

  const split = splitEvidenceTextByTechnicalMacro(body);
  const hasTechnical = !!split.technicalPart;
  const hasMacro = !!split.macroPart;

  const cleanTail = (s) => String(s || "").replace(/[.;,\s]+$/g, "").trim();
  const bulletPrefix = /^\s*[-*]\s*/.test(bullet) ? "- " : bullet;

  if (hasTechnical && hasMacro) {
    return {
      line: `${bulletPrefix}Confirmed evidence: ${cleanTail(split.macroPart)}.\n${bulletPrefix}Technical confirmation context: ${cleanTail(split.technicalPart)}.`,
      changed: true,
      mode: "mixed_split",
    };
  }

  if (hasTechnical && !hasMacro) {
    return {
      line: `${bulletPrefix}Technical confirmation context: ${cleanTail(split.technicalPart)}.`,
      changed: true,
      mode: "technical_only_relabel",
    };
  }

  return { line: original, changed: false };
}

function normalizeTechnicalEvidenceLabelsWithMixedSplitter(reportText) {
  const text = String(reportText || "");
  const s4 = extractNumberedSectionBoundaries(text, 4, 6);
  const target = s4 ? s4.section : text;

  const lines = target.split("\n");
  const changes = [];
  const fixedLines = lines.map((line) => {
    if (!/Confirmed evidence\s*:/i.test(line)) return line;
    const fixed = normalizeConfirmedEvidenceLineWithMixedSplitter(line);
    if (fixed.changed) changes.push(fixed.mode || "technical_label_fixed");
    return fixed.line;
  });

  if (!changes.length) return { text, applied: false, changes: [] };

  const fixedTarget = fixedLines.join("\n");
  if (s4) {
    return {
      text: s4.before + fixedTarget + s4.after,
      applied: true,
      changes: [...new Set(changes)],
    };
  }

  return { text: fixedTarget, applied: true, changes: [...new Set(changes)] };
}


const MACRO_CONFIRMED_OVERCLAIM_KEYWORDS = [
  "macro supportive",
  "macro support",
  "macro context aligns",
  "macro context aligned",
  "macro drivers support",
  "macro drivers supportive",
  "fred macro drivers",
  "fred drivers",
  "replay evidence",
  "replay record",
  "replay records",
  "replay signal",
  "macro read is supportive",
  "macroDirection: supportive",
  "macro direction supportive",
];

function shouldDowngradeMacroConfirmedEvidence(snapshot) {
  const eventQuality = String(snapshot?.contextQualityFlags?.eventDataCompleteness?.nextMajor?.quality || "").toLowerCase();
  const newsStrength = String(snapshot?.contextQualityFlags?.newsStrength || "").toLowerCase();

  const replayAlignment =
    String(snapshot?.deterministicScenarioLab?.replaySignal?.alignment ||
      snapshot?.replayEvidence?.latest?.alignment ||
      "").toLowerCase();

  const hasConfirmedOutcome =
    Boolean(snapshot?.calendar?.nextMajor?.actual) ||
    Boolean(snapshot?.deterministicScenarioLab?.nextMajor?.actual);

  const hasStrongReplay =
    ["aligned", "confirmed", "macro_aligned", "gold-positive-aligned", "gold-negative-aligned"].some((x) =>
      replayAlignment.includes(x)
    ) && !replayAlignment.includes("inconclusive");

  // Only downgrade in weak/incomplete states.
  // Do not downgrade when there is an actual outcome or clearly strong replay alignment.
  return eventQuality === "date-only" &&
    newsStrength === "weak" &&
    (replayAlignment === "" || replayAlignment.includes("inconclusive")) &&
    !hasConfirmedOutcome &&
    !hasStrongReplay;
}

function isConfirmedEvidenceNoneLine(line) {
  return /^\s*(?:[-*]\s*)?(?:\*{0,2})\s*Confirmed evidence\s*:?\s*(?:\*{0,2})\s*:?\s*(?:none|no confirmed evidence|n\/a)\.?\s*$/i.test(String(line || ""));
}

function parseConfirmedEvidenceLine(line) {
  const original = String(line || "");
  const re = /^(\s*(?:[-*]\s*)?)(?:\*{0,2})\s*Confirmed evidence\s*:?\s*(?:\*{0,2})\s*:?\s*(.*)$/i;
  const m = original.match(re);
  if (!m) return null;
  return {
    bullet: m[1] || "",
    body: (m[2] || "").trim(),
  };
}

function containsMacroOverclaimKeyword(text) {
  const lo = String(text || "").toLowerCase();
  return MACRO_CONFIRMED_OVERCLAIM_KEYWORDS.some((kw) => lo.includes(kw.toLowerCase()));
}

function downgradeMacroConfirmedEvidenceLine(line, snapshot) {
  const original = String(line || "");
  const parsed = parseConfirmedEvidenceLine(original);
  if (!parsed) return { line: original, changed: false };

  if (isConfirmedEvidenceNoneLine(original)) {
    return { line: original, changed: false };
  }

  if (!shouldDowngradeMacroConfirmedEvidence(snapshot)) {
    return { line: original, changed: false };
  }

  const body = parsed.body;
  if (!containsMacroOverclaimKeyword(body)) {
    return { line: original, changed: false };
  }

  const split = splitEvidenceTextByTechnicalMacro(body);
  const bulletPrefix = /^\s*[-*]\s*/.test(parsed.bullet) ? "- " : parsed.bullet;
  const cleanTail = (s) => String(s || "").replace(/[.;,\s]+$/g, "").trim();

  const conditionalLine = `${bulletPrefix}Conditional evidence: Macro context is supportive, but event outcomes, forecast/actual values, and replay confirmation are still missing/inconclusive.`;

  if (split.technicalPart) {
    return {
      line: `${conditionalLine}\n${bulletPrefix}Technical confirmation context: ${cleanTail(split.technicalPart)}.`,
      changed: true,
      mode: "macro_confirmed_overclaim_downgraded_with_technical_split",
    };
  }

  return {
    line: conditionalLine,
    changed: true,
    mode: "macro_confirmed_overclaim_downgraded",
  };
}

function downgradeMacroConfirmedEvidenceOverclaims(reportText, snapshot) {
  const text = String(reportText || "");
  const s4 = extractNumberedSectionBoundaries(text, 4, 6);
  const target = s4 ? s4.section : text;

  const changes = [];
  const fixedLines = target.split("\n").map((line) => {
    if (!/Confirmed evidence/i.test(line)) return line;
    const fixed = downgradeMacroConfirmedEvidenceLine(line, snapshot);
    if (fixed.changed) changes.push(fixed.mode || "macro_confirmed_overclaim_downgraded");
    return fixed.line;
  });

  if (!changes.length) return { text, applied: false, changes: [] };

  const fixedTarget = fixedLines.join("\n");
  if (s4) {
    return {
      text: s4.before + fixedTarget + s4.after,
      applied: true,
      changes: [...new Set(changes)],
    };
  }

  return { text: fixedTarget, applied: true, changes: [...new Set(changes)] };
}



function forceRelabelRemainingTechnicalConfirmedEvidence(reportText, snapshot) {
  const text = String(reportText || "");
  const s4 = extractNumberedSectionBoundaries(text, 4, 6);
  const target = s4 ? s4.section : text;

  const changes = [];
  const fixedLines = target.split("\n").map((line) => {
    const parsed = parseConfirmedEvidenceLine(line);
    if (!parsed) return line;
    if (isConfirmedEvidenceNoneLine(line)) return line;

    const body = parsed.body || "";
    const split = splitEvidenceTextByTechnicalMacro(body);
    const hasTechnical = !!split.technicalPart;
    const hasMacro = !!split.macroPart;

    if (!hasTechnical) return line;

    const bulletPrefix = /^\s*[-*]\s*/.test(parsed.bullet || "") ? "- " : (parsed.bullet || "");
    const cleanTail = (s) => String(s || "").replace(/[.;,\s]+$/g, "").trim();

    // Final guardrail: any remaining Confirmed evidence line containing technical context
    // must not remain confirmed. If there is a macro part, downgrade it to conditional
    // under incomplete/date-only evidence conditions; otherwise keep a neutral conditional line.
    if (hasMacro) {
      const conditional =
        shouldDowngradeMacroConfirmedEvidence(snapshot)
          ? `${bulletPrefix}Conditional evidence: Macro context is supportive, but event outcomes, forecast/actual values, and replay confirmation are still missing/inconclusive.`
          : `${bulletPrefix}Conditional evidence: ${cleanTail(split.macroPart)}.`;
      changes.push("remaining_mixed_confirmed_evidence_forced_split");
      return `${conditional}\n${bulletPrefix}Technical confirmation context: ${cleanTail(split.technicalPart)}.`;
    }

    changes.push("remaining_technical_confirmed_evidence_forced_relabel");
    return `${bulletPrefix}Technical confirmation context: ${cleanTail(split.technicalPart)}.`;
  });

  if (!changes.length) {
    return { text, applied: false, changes: [] };
  }

  const fixedTarget = fixedLines.join("\n");
  if (s4) {
    return {
      text: s4.before + fixedTarget + s4.after,
      applied: true,
      changes: [...new Set(changes)],
    };
  }

  return { text: fixedTarget, applied: true, changes: [...new Set(changes)] };
}


function applyScenarioHeaderAndTechnicalLabelPostProcessing(reportText, snapshot) {
  let text = String(reportText || "");
  const changes = [];

  const s1 = forceSection1WaitNeutralIfNeeded(text, snapshot);
  if (s1.applied) {
    text = s1.text;
    changes.push(`section1_forced_wait_neutral:${s1.reason}`);
  }

  const labels = normalizeTechnicalEvidenceLabelsWithMixedSplitter(text);
  if (labels.applied) {
    text = labels.text;
    changes.push(...labels.changes.map((x) => `technical_evidence_label:${x}`));
  }

  const macroDowngrade = downgradeMacroConfirmedEvidenceOverclaims(text, snapshot);
  if (macroDowngrade.applied) {
    text = macroDowngrade.text;
    changes.push(...macroDowngrade.changes.map((x) => `macro_confirmed_overclaim:${x}`));
  }

  const finalTechnicalConfirmedSafety = forceRelabelRemainingTechnicalConfirmedEvidence(text, snapshot);
  if (finalTechnicalConfirmedSafety.applied) {
    text = finalTechnicalConfirmedSafety.text;
    changes.push(...finalTechnicalConfirmedSafety.changes.map((x) => `final_confirmed_evidence_safety:${x}`));
  }

  return {
    output: text,
    changes,
    anyApplied: changes.length > 0,
  };
}



function buildEmploymentEventReportRow(snapshot) {
  const e = snapshot?.employmentEvent || {};
  if (e?.status !== "partial_fred_backfill") return "";
  const h = e?.headline || {};
  const d = e?.details || {};
  const q = e?.quality || {};
  return `| Employment event intelligence | PAYEMS actual=${h.actual || "missing"} from ${h.actualSource || "FRED PAYEMS fallback"}; UNRATE=${d.unemploymentRate || "missing"} from ${d.unemploymentRateSource || "FRED UNRATE fallback"}; forecast/previous/sector composition missing | labor surprise cannot be calculated; goldImpact=${q.goldImpact || "wait_for_confirmation"} | partial |`;
}

function injectEmploymentEventRowIntoEvidenceTable(reportText, snapshot) {
  const row = buildEmploymentEventReportRow(snapshot);
  const text = String(reportText || "");
  if (!row || /Employment event intelligence/i.test(text)) {
    return { text, applied: false };
  }

  const replayRowRe = /\n\|\s*Replay evidence\s*\|/i;
  if (replayRowRe.test(text)) {
    return {
      text: text.replace(replayRowRe, `\n${row}\n| Replay evidence |`),
      applied: true,
    };
  }

  const calendarRowRe = /(\n\|\s*Calendar\/event risk\s*\|[^\n]*\n)/i;
  if (calendarRowRe.test(text)) {
    return {
      text: text.replace(calendarRowRe, `$1${row}\n`),
      applied: true,
    };
  }

  return { text, applied: false };
}

function enforceExactAvoidWindowInSection9(reportText, snapshot) {
  const text = String(reportText || "");
  const avoidWindow =
    snapshot?.deterministicScenarioLab?.nextMajor?.avoidWindow ||
    snapshot?.calendar?.nextMajor?.avoidWindow ||
    "";
  if (!avoidWindow) return { text, applied: false };

  const bounds = extractNumberedSectionBoundaries(text, 9, 10, "Next catalyst plan");
  if (!bounds) return { text, applied: false };

  let section = bounds.section;
  const exactLine = `Avoid-window: ${avoidWindow}.`;

  if (/Avoid-window\s*:\s*/i.test(section)) {
    section = section.replace(/Avoid-window\s*:\s*[^\n]*/i, exactLine);
  } else if (/\bavoid[- ]window\b/i.test(section)) {
    section = section.replace(/.*\bavoid[- ]window\b.*$/im, exactLine);
  } else {
    section = section.replace(/\s*$/, `\n${exactLine}\n`);
  }

  return {
    text: bounds.before + section + bounds.after,
    applied: section !== bounds.section,
  };
}

function ensureBullishCaseTechnicalWeakening(reportText, snapshot) {
  const text = String(reportText || "");
  const techBias = String(snapshot?.technicalContext?.technicalBias || "").toLowerCase();
  if (techBias !== "bearish") return { text, applied: false };

  const sentence = "Technical confirmation context: Technical bias is bearish; therefore it currently weakens the bullish conditional case.";
  if (text.includes(sentence)) return { text, applied: false };

  const bounds = extractNumberedSectionBoundaries(text, 4, 5, "Bullish case for gold");
  if (!bounds) return { text, applied: false };

  let section = bounds.section;

  if (/Technical confirmation context\s*:/i.test(section)) {
    section = section.replace(/Technical confirmation context\s*:[^\n]*/i, sentence);
  } else if (/Missing evidence\s*:/i.test(section)) {
    section = section.replace(/(\n\s*(?:[-*]\s*)?(?:\*{0,2})?Missing evidence(?:\*{0,2})?\s*:)/i, `\n${sentence}\n$1`);
  } else {
    section = section.replace(/\s*$/, `\n${sentence}\n`);
  }

  return {
    text: bounds.before + section + bounds.after,
    applied: section !== bounds.section,
  };
}


function normalizeNfpDirectionalInvalidationPhrases(reportText) {
  let text = String(reportText || "");
  const changes = [];

  const replaceLine = (line, sectionName = "") => {
    const raw = String(line || "");
    let fixed = raw;

    const isInvalidation = /Invalidation conditions\s*:/i.test(raw);
    const hasStrongLabor =
      /\bstrong\s+NFP\b/i.test(raw) ||
      /\bstrong\s+labor\b/i.test(raw) ||
      /\blabor data strengthens\b/i.test(raw) ||
      /\blabor strengthens\b/i.test(raw);

    const hasWeakLabor =
      /\bweak\s+NFP\b/i.test(raw) ||
      /\bweak\s+labor\b/i.test(raw) ||
      /\blabor data weakens\b/i.test(raw) ||
      /\blabor weakens\b/i.test(raw);

    const hasRisingYieldsUsd =
      /rising\s+yields\s*\/\s*USD/i.test(raw) ||
      /yields\s*\/\s*USD\s+rise/i.test(raw) ||
      /yields\s+and\s+USD\s+rise/i.test(raw);

    const hasFallingYieldsUsd =
      /falling\s+yields\s*\/\s*USD/i.test(raw) ||
      /yields\s*\/\s*USD\s+fall/i.test(raw) ||
      /yields\s+and\s+USD\s+fall/i.test(raw);

    // Bullish case guard:
    // strong labor + rising yields/USD should weaken bullish gold case, not support it.
    if (/bullish/i.test(sectionName) && isInvalidation && hasStrongLabor && hasRisingYieldsUsd) {
      fixed = raw.replace(
        /Invalidation conditions\s*:[^\n]*/i,
        "Invalidation conditions: if labor data strengthens expectations and yields/USD rise, the bullish case weakens; if hot inflation lifts real yields, the bullish case weakens."
      );
      changes.push("bullish_invalidation_strong_labor_rising_yields_fixed");
    }

    // Bearish case guard:
    // weak labor + falling yields/USD should weaken bearish gold case, not support it.
    if (/bearish/i.test(sectionName) && isInvalidation && hasWeakLabor && hasFallingYieldsUsd) {
      fixed = raw.replace(
        /Invalidation conditions\s*:[^\n]*/i,
        "Invalidation conditions: if labor data weakens expectations and yields/USD fall, the bearish case weakens; if real yields fall despite hot inflation, the bearish case weakens."
      );
      changes.push("bearish_invalidation_weak_labor_falling_yields_fixed");
    }

    // Generic cleanup for parenthetical examples that trigger NFP-direction validator.
    // Avoid "e.g., strong NFP, rising yields/USD" without explicit gold-negative consequence.
    if (isInvalidation && /\(e\.g\.,\s*strong\s+NFP,\s*rising\s+yields\s*\/\s*USD\)/i.test(fixed)) {
      fixed = fixed.replace(
        /\(e\.g\.,\s*strong\s+NFP,\s*rising\s+yields\s*\/\s*USD\)/ig,
        "(strong labor with rising yields/USD is gold-negative and weakens the bullish case)"
      );
      changes.push("strong_nfp_example_explicitly_gold_negative");
    }

    if (isInvalidation && /\(e\.g\.,\s*weak\s+NFP,\s*falling\s+yields\s*\/\s*USD\)/i.test(fixed)) {
      fixed = fixed.replace(
        /\(e\.g\.,\s*weak\s+NFP,\s*falling\s+yields\s*\/\s*USD\)/ig,
        "(weak labor with falling yields/USD is gold-supportive and weakens the bearish case)"
      );
      changes.push("weak_nfp_example_explicitly_gold_supportive");
    }

    return fixed;
  };

  const applyToSection = (sectionNumber, nextSectionNumber, title, sectionName) => {
    const bounds = extractNumberedSectionBoundaries(text, sectionNumber, nextSectionNumber, title);
    if (!bounds) return;

    const fixedSection = bounds.section
      .split("\n")
      .map((line) => replaceLine(line, sectionName))
      .join("\n");

    if (fixedSection !== bounds.section) {
      text = bounds.before + fixedSection + bounds.after;
    }
  };

  applyToSection(4, 5, "Bullish case for gold", "bullish");
  applyToSection(5, 6, "Bearish case for gold", "bearish");

  return {
    output: text,
    anyApplied: changes.length > 0,
    changes: [...new Set(changes)],
  };
}



function isTechnicalContextMaskedOrUnusable(snapshot) {
  const tc = snapshot?.technicalContext || {};
  const status = String(tc?.status || "").toLowerCase();
  const reliability = String(tc?.reliability || "").toLowerCase();
  const usable = tc?.usableForScenario === true;

  return !tc ||
    !usable ||
    status === "missing" ||
    status === "masked" ||
    status === "unreliable" ||
    reliability === "unreliable" ||
    reliability === "masked";
}

function sanitizeMaskedTechnicalLeaks(reportText, snapshot) {
  let text = String(reportText || "");
  if (!isTechnicalContextMaskedOrUnusable(snapshot)) {
    return { output: text, anyApplied: false, changes: [] };
  }

  const changes = [];
  const maskedLine = "Technical confirmation context: Technical context is masked/unreliable and not usable for scenario evidence; RSI, Stochastic RSI, EMA, MACD, ADX, Bollinger, Keltner, support/resistance, and strategy-module claims must be ignored until usableForScenario=true.";

  // Section 3: replace Technical context table row.
  const technicalRowRe = /\n\|\s*Technical context\s*\|[^\n]*/i;
  if (technicalRowRe.test(text)) {
    text = text.replace(
      technicalRowRe,
      "\n| Technical context | Masked/unreliable or unavailable | Not usable as directional evidence | missing |"
    );
    changes.push("section3_technical_row_masked");
  }

  // Sections 4 and 5: replace any line that mentions technical indicators/context.
  const sanitizeSectionLines = (sectionNumber, nextSectionNumber, title) => {
    const bounds = extractNumberedSectionBoundaries(text, sectionNumber, nextSectionNumber, title);
    if (!bounds) return;

    const fixedSection = bounds.section
      .split("\n")
      .map((line) => {
        const lo = String(line || "").toLowerCase();
        const mentionsTech =
          lo.includes("technical") ||
          lo.includes("rsi") ||
          lo.includes("stoch") ||
          lo.includes("macd") ||
          lo.includes("adx") ||
          lo.includes("ema") ||
          lo.includes("bollinger") ||
          lo.includes("keltner") ||
          lo.includes("support") ||
          lo.includes("resistance") ||
          lo.includes("strategy module");

        if (!mentionsTech) return line;

        if (/missing evidence\s*:/i.test(line)) {
          return line.replace(/event-time technical reaction/ig, "usable technical reaction");
        }

        if (/Invalidation conditions\s*:/i.test(line)) {
          return line.replace(/,\s*or if technicals?[^.]*\.?/ig, ".").replace(/\s{2,}/g, " ");
        }

        changes.push(`section${sectionNumber}_masked_technical_line_sanitized`);
        const bulletPrefix = /^\s*[-*]\s*/.test(line) ? "- " : "";
        return `${bulletPrefix}${maskedLine}`;
      })
      .join("\n");

    if (fixedSection !== bounds.section) {
      text = bounds.before + fixedSection + bounds.after;
    }
  };

  sanitizeSectionLines(4, 5, "Bullish case for gold");
  sanitizeSectionLines(5, 6, "Bearish case for gold");

  // Section 7: replace fully with deterministic masked technical text.
  const section7 = extractNumberedSectionBoundaries(text, 7, 8, "Technical confirmation");
  if (section7) {
    const maskedSection7 = `\n7. Technical confirmation\nTechnical context is unreliable/masked and unusable for scenario evidence. Sanity issues: not specified. Technical context must not confirm, weaken, or contradict the macro scenario until usableForScenario=true.\nAlignment note: Technical context is unusable and must not affect scenario direction.\n\n`;
    text = section7.before + maskedSection7 + section7.after;
    changes.push("section7_masked_replaced");
  }

  return {
    output: text,
    anyApplied: changes.length > 0,
    changes: [...new Set(changes)],
  };
}



function ensureBearishCaseTechnicalSupport(reportText, snapshot) {
  const text = String(reportText || "");
  const techBias = String(snapshot?.technicalContext?.technicalBias || "").toLowerCase();
  const usable = snapshot?.technicalContext?.usableForScenario === true;
  if (techBias !== "bearish" || !usable) return { text, applied: false };

  const sentence = "Technical confirmation context: Technical bias is bearish; therefore it currently supports the bearish conditional case as confirmation context, but it cannot confirm the case without macro/event validation.";
  if (text.includes(sentence)) return { text, applied: false };

  const bounds = extractNumberedSectionBoundaries(text, 5, 6, "Bearish case for gold");
  if (!bounds) return { text, applied: false };

  let section = bounds.section;

  // Replace malformed or incomplete technical confirmation context in Section 5.
  if (/Technical confirmation context\s*:/i.test(section)) {
    section = section.replace(/^\s*(?:[-*]\s*)?(?:\*{0,2})?Technical confirmation context(?:\*{0,2})?\s*:[^\n]*/im, sentence);
  } else if (/Missing evidence\s*:/i.test(section)) {
    section = section.replace(/(\n\s*(?:[-*]\s*)?(?:\*{0,2})?Missing evidence(?:\*{0,2})?\s*:)/i, `\n${sentence}\n$1`);
  } else {
    section = section.replace(/\s*$/, `\n${sentence}\n`);
  }

  return {
    text: bounds.before + section + bounds.after,
    applied: section !== bounds.section,
  };
}



function forceGlobalTechnicalConfirmedEvidenceRelabel(reportText, snapshot) {
  const text = String(reportText || "");
  const changes = [];

  const fixed = text.split("\n").map((line) => {
    const original = String(line || "");
    if (!/Confirmed evidence/i.test(original)) return original;
    if (isConfirmedEvidenceNoneLine(original)) return original;

    const parsed = parseConfirmedEvidenceLine(original);
    if (!parsed) return original;

    const body = parsed.body || "";
    const split = splitEvidenceTextByTechnicalMacro(body);

    const bodyLower = body.toLowerCase();
    const explicitlyTechnical =
      bodyLower.includes("technical context") ||
      bodyLower.includes("technical bias") ||
      bodyLower.includes("technical analysis") ||
      bodyLower.includes("technicals") ||
      bodyLower.includes("yahoo:gc=f") ||
      bodyLower.includes("gc=f") ||
      bodyLower.includes("rsi") ||
      bodyLower.includes("stoch") ||
      bodyLower.includes("macd") ||
      bodyLower.includes("adx") ||
      bodyLower.includes("ema") ||
      bodyLower.includes("bollinger") ||
      bodyLower.includes("keltner") ||
      bodyLower.includes("support") ||
      bodyLower.includes("resistance") ||
      bodyLower.includes("strategy module");

    const hasTechnical = !!split.technicalPart || explicitlyTechnical;
    if (!hasTechnical) return original;

    const bulletPrefix = /^\s*[-*]\s*/.test(parsed.bullet || "") ? "- " : (parsed.bullet || "");
    const cleanTail = (s) => String(s || "").replace(/[.;,\s]+$/g, "").trim();

    const technicalPart = cleanTail(split.technicalPart || body);
    const macroPart = cleanTail(split.macroPart || "");

    // If there is a macro part, avoid leaving it as Confirmed evidence under weak/date-only context.
    if (macroPart && macroPart.toLowerCase() !== technicalPart.toLowerCase()) {
      changes.push("global_mixed_technical_confirmed_evidence_relabel");
      const conditional =
        shouldDowngradeMacroConfirmedEvidence(snapshot)
          ? `${bulletPrefix}Conditional evidence: Macro context is supportive, but event outcomes, forecast/actual values, and replay confirmation are still missing/inconclusive.`
          : `${bulletPrefix}Conditional evidence: ${macroPart}.`;
      return `${conditional}\n${bulletPrefix}Technical confirmation context: ${technicalPart}.`;
    }

    changes.push("global_technical_confirmed_evidence_relabel");
    return `${bulletPrefix}Technical confirmation context: ${technicalPart}.`;
  }).join("\n");

  return {
    output: fixed,
    anyApplied: changes.length > 0,
    changes: [...new Set(changes)],
  };
}



function enforceExactNextCatalystName(reportText, snapshot) {
  let text = String(reportText || "");
  const nextName =
    snapshot?.deterministicScenarioLab?.nextMajor?.name ||
    snapshot?.calendar?.nextMajor?.name ||
    "";
  if (!nextName) return { text, applied: false };

  const bounds = extractNumberedSectionBoundaries(text, 9, 10, "Next catalyst plan");
  if (!bounds) return { text, applied: false };

  let section = bounds.section;
  const exactLine = `Next event: ${nextName}.`;

  // Replace common next-event line variants, including markdown bold and extra "(nextMajor event)".
  if (/^\s*(?:[-*]\s*)?(?:\*{0,2})?\s*Next event(?:\s+to\s+watch)?(?:\*{0,2})?\s*:/im.test(section)) {
    section = section.replace(
      /^\s*(?:[-*]\s*)?(?:\*{0,2})?\s*Next event(?:\s+to\s+watch)?(?:\*{0,2})?\s*:[^\n]*/im,
      exactLine
    );
  } else {
    section = section.replace(/(\n9\.\s*Next catalyst plan[^\n]*\n?)/i, `$1${exactLine}\n`);
  }

  // Remove leftover aliases if any survived elsewhere in Section 9.
  section = section
    .replace(/\s*\(nextMajor event\)/gi, "")
    .replace(/\bnextMajor event\b/gi, nextName)
    .replace(/\bupcoming CPI\b/gi, nextName)
    .replace(/\bpending CPI\b/gi, nextName);

  return {
    text: bounds.before + section + bounds.after,
    applied: section !== bounds.section,
  };
}

function cleanupMacroCoverageWording(reportText, snapshot) {
  let text = String(reportText || "");
  const missing = snapshot?.contextQualityFlags?.missingCriticalMacroDrivers || [];
  if (missing.length > 0) return { text, applied: false };

  const changes = [];
  const replacement = "Macro coverage is complete, but directional confidence remains capped because event actual/forecast values and confirmation evidence are incomplete";

  const patterns = [
    /\bmissing critical macro drivers\b/gi,
    /\bmacro drivers lack critical data\b/gi,
    /\bmissing macro drivers\b/gi,
    /\bmacro data incomplete\b/gi,
    /\bmacro gaps\b/gi,
  ];

  for (const re of patterns) {
    if (re.test(text)) {
      text = text.replace(re, replacement);
      changes.push("missing_macro_drivers_wording_replaced");
    }
  }

  // Clean awkward duplicates caused by replacement inside longer clauses.
  text = text
    .replace(/because\s+Macro coverage is complete,/gi, "because macro coverage is complete,")
    .replace(/Confidence reducers:\s*Macro coverage is complete,/gi, "Confidence reducers: macro coverage is complete,")
    .replace(/,\s*and\s+Macro coverage is complete,/gi, "; macro coverage is complete,")
    .replace(/\.\s*Macro coverage is complete, but directional confidence remains capped because event actual\/forecast values and confirmation evidence are incomplete, leading to a neutral stance\./gi,
      ". Macro coverage is complete, but directional confidence remains capped because event actual/forecast values and confirmation evidence are incomplete.");

  return {
    text,
    applied: changes.length > 0,
    changes: [...new Set(changes)],
  };
}

function cleanupPredictiveTechnicalTableImplications(reportText) {
  let text = String(reportText || "");
  const changes = [];

  const technicalRowRe = /\n\|\s*Technical context\s*\|([^\n]*)/i;
  const m = text.match(technicalRowRe);
  if (!m) return { text, applied: false };

  const row = m[0];
  const cells = row.split("|");
  // table row shape: ["\n", " Technical context ", " state ", " implication ", " reliability ", ""]
  if (cells.length >= 5) {
    const implication = cells[3] || "";
    const predictive =
      /\blikely to\b/i.test(implication) ||
      /\bmay test\b/i.test(implication) ||
      /\bmay break\b/i.test(implication) ||
      /\bbreakout\b/i.test(implication) ||
      /\bbreakdown\b/i.test(implication) ||
      /\btest resistance\b/i.test(implication) ||
      /\btest support\b/i.test(implication);

    if (predictive) {
      cells[3] = " Technical confirmation context only; cannot override macro/event uncertainty ";
      const newRow = cells.join("|");
      text = text.replace(row, newRow);
      changes.push("technical_table_predictive_implication_replaced");
    }
  }

  return {
    text,
    applied: changes.length > 0,
    changes,
  };
}

function applyNextCatalystMacroCoverageCleanup(reportText, snapshot) {
  let text = String(reportText || "");
  const changes = [];

  const nextEvent = enforceExactNextCatalystName(text, snapshot);
  if (nextEvent.applied) {
    text = nextEvent.text;
    changes.push("next_event_exact_name_enforced");
  }

  const macroCoverage = cleanupMacroCoverageWording(text, snapshot);
  if (macroCoverage.applied) {
    text = macroCoverage.text;
    changes.push(...macroCoverage.changes);
  }

  const techTable = cleanupPredictiveTechnicalTableImplications(text);
  if (techTable.applied) {
    text = techTable.text;
    changes.push(...techTable.changes);
  }

  return {
    output: text,
    anyApplied: changes.length > 0,
    changes: [...new Set(changes)],
  };
}


function applyPostProcessedOutputCleanup(reportText, snapshot) {
  let text = String(reportText || "");
  const changes = [];

  const employment = injectEmploymentEventRowIntoEvidenceTable(text, snapshot);
  if (employment.applied) {
    text = employment.text;
    changes.push("employment_event_row_injected");
  }

  const bullishTech = ensureBullishCaseTechnicalWeakening(text, snapshot);
  if (bullishTech.applied) {
    text = bullishTech.text;
    changes.push("bullish_case_technical_weakening_inserted");
  }

  const nfpInvalidation = normalizeNfpDirectionalInvalidationPhrases(text);
  if (nfpInvalidation.anyApplied) {
    text = nfpInvalidation.output;
    changes.push(...nfpInvalidation.changes.map((x) => `nfp_directional_invalidation:${x}`));
  }

  const bearishTechSupport = ensureBearishCaseTechnicalSupport(text, snapshot);
  if (bearishTechSupport.applied) {
    text = bearishTechSupport.text;
    changes.push("bearish_case_technical_support_inserted");
  }

  const nextCatalystMacroCleanup = applyNextCatalystMacroCoverageCleanup(text, snapshot);
  if (nextCatalystMacroCleanup.anyApplied) {
    text = nextCatalystMacroCleanup.output;
    changes.push(...nextCatalystMacroCleanup.changes.map((x) => `next_catalyst_macro_cleanup:${x}`));
  }

  const avoid = enforceExactAvoidWindowInSection9(text, snapshot);
  if (avoid.applied) {
    text = avoid.text;
    changes.push("avoid_window_exact_replaced");
  }

  return {
    output: text,
    changes,
    anyApplied: changes.length > 0,
  };
}


function buildRealGoldScopePrompt(mode = promptMode) {
      const snapshot = saveLatestSnapshotForReplay(buildGoldScopeContextSnapshot());
      const depthGuide = {
        concise: "Keep the response compact. Maximum 500 words. Do not cut off mid-sentence.",
        standard: "Give a practical research report. About 900-1400 words. Complete all sections.",
        deep: "Give a deeper report, but do not expose hidden chain-of-thought. Use concise reasoning summaries, evidence table and decision gates. Complete all sections.",
      }[outputDepth] || "Give a practical research report.";

      const modeGuide = {
        scenario: "Full scenario lab: infer the dominant research scenario, confidence, bullish case, bearish case, wait case, gates, invalidations and next catalyst plan.",
        preEvent: "Pre-event briefing: focus on the next major catalyst, what is known, what is missing, and what gold-positive/gold-negative outcomes would look like.",
        postEvent: "Post-event verdict: focus on replay evidence and whether the market reaction was gold-supportive, gold-negative, mixed or stale.",
        contradiction: "Contradiction detector: identify conflicts between macro, news, replay and source health. Lower confidence if evidence is stale or missing.",
      }[mode] || "Full scenario lab.";

      const missingDrivers = snapshot?.contextQualityFlags?.missingCriticalMacroDrivers || [];
      const fredRows = snapshot?.dataReadiness?.fredRows ?? 0;
      const replayCount = snapshot?.dataReadiness?.replayRecords ?? 0;
      const dominant = snapshot?.deterministicScenarioLab?.dominant || "Wait / neutral scenario";
      const nextEvent = snapshot?.deterministicScenarioLab?.nextMajor?.name || "unknown";
      const nextDate = snapshot?.deterministicScenarioLab?.nextMajor?.date || "unknown";
      const maxConf = snapshot?.contextQualityFlags?.maxRecommendedConfidence ?? 35;
      const newsStrength = snapshot?.contextQualityFlags?.newsStrength || "unknown";
      const eventQuality = snapshot?.contextQualityFlags?.eventDataCompleteness?.nextMajor?.quality || "unknown";
      const mustBeWaitNeutral =
        String(dominant).toLowerCase().includes("wait") &&
        Number(replayCount) === 0 &&
        String(eventQuality).toLowerCase() === "date-only" &&
        Array.isArray(missingDrivers) &&
        missingDrivers.length > 0;

      const snapshotSummary = `SYSTEM STATE SUMMARY — READ FIRST:
- deterministicScenarioLab.dominant = "${dominant}"
- FRED loaded: ${fredRows}/11 | missingCriticalMacroDrivers = [${missingDrivers.join(", ")}]
- replayRecords = ${replayCount}
- nextMajor = "${nextEvent}" on ${nextDate} | eventData.quality = "${eventQuality}"
- newsStrength = "${newsStrength}"
- maxRecommendedConfidence = ${maxConf}
- technical source note: if technicalContext.sourceName is Yahoo and symbol is GC=F, all price levels are gold futures proxy levels, not exact spot XAUUSD levels.
- thinking stop tokens enabled = ${USE_THINKING_STOP_TOKENS}
${mustBeWaitNeutral ? `HARD RULE — YOU MUST OUTPUT WAIT-NEUTRAL:
All conditions are met: deterministic dominant is Wait/neutral, replayRecords=0, eventData=date-only, and missing critical macro drivers exist.
Section 1 MUST be "Wait-Neutral". Do not select Bullish or Bearish.
You may describe conditional bullish/bearish pressure, but the dominant research scenario must remain Wait-Neutral.` : ""}`;

      const technicalNumericFacts = formatTechnicalNumericFactsForPrompt(snapshot);
      const technicalConfirmationText = formatDeterministicTechnicalConfirmationText(snapshot);
      const employmentEventFacts = formatEmploymentEventFactsForPrompt(snapshot);

      return `/no_think

You are GoldScope's local AI analyst for XAUUSD / gold only.

${snapshotSummary}

Do not reveal hidden reasoning, private thinking, planning text, or chain-of-thought. Give only the final research report.

Your role:
Produce a research scenario report from the provided GoldScope state. This is not financial advice. Do not say "buy" or "sell". Do not provide trade instructions. Do not invent missing data.

STRICT SOURCE RULES:
1. Use only the GoldScope state snapshot below.
2. Do not invent actual, forecast, consensus, thresholds, market pricing, or probability values unless explicitly provided.
3. If forecast/actual values are missing, say they are missing.
4. If news is fallback, stale, generic, low-relevance, or rate-limited, lower confidence.
5. If replay evidence is absent, lower confidence. If replay evidence is present, use it as historical market-reaction evidence but do not overgeneralize from low-quality or few records.
6. If macro drivers are incomplete, lower confidence.
7. If evidence conflicts, prefer Wait-Neutral unless one side has strong multi-source confirmation.
8. Do not call a scenario trigger "confirmed" unless it has observed values, actual outcomes, replay records, or multiple strong macro-relevant news items.
9. A single weak news item must not be called confirmed directional evidence.
10. Future events without actual/forecast values are conditional/unconfirmed, not confirmed.
11. The confidence score must not exceed contextQualityFlags.maxRecommendedConfidence unless you explicitly justify why the cap should be overridden from the snapshot.
12. Always produce a non-empty answer.
12a. If you cannot satisfy these rules, output Wait-Neutral and explicitly say the evidence is insufficient.
13. End the report with: <END_GOLDSCOPE_REPORT>
14. Do not include phrases such as "Okay, the user wants", "Let me", "I need to", "/think", "<think>", "</think>", or internal planning text.
15. Instrument guard: do not treat mining-company stocks, ETF/company shares, OTCMKTS items, or retail gold-rate articles as spot gold/XAUUSD movement.
16. Do not mention specific price levels, support, resistance, breakout, breakdown, or "recover above/below" unless spotPrice or technicalContext exists in the snapshot.
17. If technicalContext exists, use it only as market-confirmation context. It must not override missing macro/event evidence.
18. If technicalContext uses GC=F, state that it is a gold futures proxy for XAUUSD, not direct spot XAUUSD. Do not present GC=F support/resistance, EMA, or price levels as exact spot XAUUSD levels.
19. If technicalContext.status is "unreliable" or technicalContext.usableForScenario is false, do not use it as directional evidence; describe it only as a failed/diagnostic technical read.
20. Do not describe EMA20 below EMA200 as bullish. Price above EMA200 alone is only mild support and can be contradicted by EMA alignment or overbought RSI.
21. If technicalContext.usableForScenario is false, do not mention mild-bullish, mild-bearish, RSI, EMA, ATR, support, resistance, or priceVsEMA200 as scenario evidence unless those fields are explicitly present in the masked technicalContext.
22. If technicalContext.sourceSelection exists, you may summarize source quality and selected symbol, but do not treat failed/weak sources as evidence.
23. If technicalContext.multiTimeframe exists, summarize cross-timeframe agreement or conflict.
24. If alignmentContext exists, use it as the final macro/technical alignment rule; it can confirm, weaken, or contradict, but cannot override missing macro/event/replay evidence.
25. If technicalContext contains expanded indicators, summarize MACD, ADX, Bollinger Bands, Keltner Channels, and Stochastic RSI as confirmation context only. Do not call these confirmed macro evidence.
26. Do not call Stochastic RSI overbought unless K >= 80; do not call it oversold unless K <= 20.
26a. RSI and Stochastic RSI are different indicators. If only Stochastic RSI is overbought/oversold, write "Stochastic RSI is overbought/oversold"; do not write "RSI is overbought/oversold".
26b. Do not call RSI overbought unless an RSI14 value is > 70. Do not call RSI oversold unless an RSI14 value is < 30.
26c. If RSI14 is between 30 and 70 but Stochastic RSI is at an extreme, say: "RSI is not at a classic extreme, while Stochastic RSI shows short-term overextension/exhaustion." 
27. If technicalContext.strategyModules exists, summarize Trend, Momentum, Volatility, and Structure modules as technical confirmation/contradiction context only. Do not treat strategy modules as trade instructions or confirmed macro evidence.
27a. If technicalContext.candlestickPatterns exists, summarize detected candlestick pattern names, direction, and bias as technical confirmation context only. Do not treat candlestick patterns as confirmed evidence or trade signals.
28. If technicalLanguageHints.requiredPhrase exists, copy it exactly in the Technical confirmation section. Do not paraphrase it. Do not create an alternative RSI/StochRSI sentence.
28a. If TECHNICAL NUMERIC FACTS is present, do not mention any RSI14 or StochRSI numeric value unless it appears exactly in the allowed lists.
28b. If TECHNICAL CONFIRMATION TEXT is present, section 7 must copy TECHNICAL CONFIRMATION TEXT exactly. Do not rewrite it, do not summarize it, and do not add extra RSI/StochRSI values.
29. Technical context must never be written under "Confirmed evidence"; use "Technical confirmation context" instead.
30. Do not write definitive RSI extreme claims unless supported by RSI14 values. Soft wording such as "near overbought" must not be converted into a definitive extreme claim.
31. When macroGateLanguageHints exists, copy these gates exactly in the Decision gates section. Do not paraphrase them, invert them, or convert weak-labor/falling-yields into bearish language.
32. Use SYSTEM STATE SUMMARY as the primary instruction anchor. If SYSTEM STATE SUMMARY and raw JSON appear to conflict, follow SYSTEM STATE SUMMARY and validation guardrails.
33. If EMPLOYMENT EVENT INTELLIGENCE exists, use it for labor-event interpretation. Do not treat headline NFP actual-vs-forecast as uniformly hawkish or dovish until sector composition, wage pressure, unemployment, USD/yields, and replay reaction are checked.
34. If leisure/hospitality is concentrated, describe it as potentially seasonal/event-sensitive unless the snapshot provides independent evidence linking it to a specific event such as the World Cup. Do not invent World Cup causality.
25. If replayEvidence.count > 0, summarize latest and recent replay reaction patterns. Treat replay as evidence only when qualityScore is adequate and event context is comparable.

MACRO LOGIC GUARD:
Apply these rules unless the GoldScope state explicitly contradicts them:
- Rising real yields are usually gold-negative.
- Falling real yields are usually gold-supportive.
- Rising nominal yields are usually gold-negative if real yields also rise.
- Falling nominal yields are usually gold-supportive if they reflect easier Fed expectations.
- Stronger USD / DXY is usually gold-negative.
- Weaker USD / DXY is usually gold-supportive.
- Strong labor data is usually gold-negative if it lifts USD/yields or reduces rate-cut expectations.
- Weak labor data is usually gold-supportive if it lowers yields or increases rate-cut expectations.
- Hot inflation data is ambiguous: it may support gold through inflation-hedge demand, but may hurt gold if it increases hawkish Fed pricing or real yields.
- Oil shocks affect gold indirectly through inflation expectations, yields, USD, and risk sentiment.
- Geopolitical risk is gold-supportive only if it is present in the provided news/context.

CONTRADICTION CHECK:
Before finalizing, check your own answer for these mistakes:
- Do not claim rising real yields are bullish for gold.
- Do not claim falling real yields are bearish for gold.
- Do not claim strong NFP is bullish unless the state shows risk-off or USD/yield weakness.
- Do not claim weak NFP is bearish unless the state shows deflationary/liquidity-stress interpretation.
- Do not turn missing evidence into a strong directional call.
- Do not use fabricated NFP/CPI/FOMC numbers.
- Do not create numeric triggers not present in the snapshot.
- Copy event dates, nextMajor event name, and avoidWindow text exactly from the snapshot; do not paraphrase or infer them.
- Do not write "Confirmed: Weak NFP" or "Confirmed: Strong NFP" when NFP actual/forecast is blank.
- Do not overstate low-relevance gold-company or retail gold-price news as macro evidence.
- Do not call one weak or retail-style macro-tagged article confirmed directional evidence.
- If contextQualityFlags.newsStrength is weak, label news evidence as weak/limited even if GDELT is live.
- Do not convert company-stock news such as Kinross, Victoria Gold, Barrick, Newmont, OTCMKTS, stock, shares, trading up/down into XAUUSD price action.
- Do not invent price levels such as $2,300/oz unless present in the snapshot.
- If technicalContext.status is available, discuss technicalBias, trend, RSI, ATR, EMA alignment, support/resistance, and priceVsEMA200 as confirmation only.
- If technicalContext.status is unreliable or usableForScenario is false, explicitly say technical evidence is unreliable/masked and should not affect scenario confidence.
- When technicalContext.usableForScenario is false, do not infer trend, support/resistance, RSI, EMA alignment, momentum, or technical bias from masked fields.
- Weak NFP/labor with falling yields/USD is generally gold-supportive; strong NFP/labor with rising yields/USD is generally gold-negative.
- Do not use invented examples after "e.g." when forecast/actual values are blank.
- Do not write <think>, </think>, /think, hidden reasoning, or planning artifacts.
- Do not call RSI overbought unless at least one provided RSI14 value is above 70.
- Do not call RSI oversold unless at least one provided RSI14 value is below 30.
- Do not shorten "Stochastic RSI is overbought" to "RSI is overbought"; they are different indicators.
- If Stochastic RSI is overbought but RSI14 is not above 70, write that Stochastic RSI shows short-term overextension while RSI14 is not at a classic overbought extreme.
- If Stochastic RSI is oversold but RSI14 is not below 30, write that Stochastic RSI shows short-term exhaustion while RSI14 is not at a classic oversold extreme.
- Do not place technical context under Confirmed evidence. Technicals are confirmation/contradiction context only.
- The Next catalyst plan must use deterministicScenarioLab.nextMajor/calendar.nextMajor exactly. Do not replace it with a later FOMC/CPI/PCE event.
- The Decision gates section must copy macroGateLanguageHints exactly when present.

TASK:
${modeGuide}

SELF-CONSISTENCY CHECK BEFORE WRITING SECTION 1:
- If macro drivers are missing, the dominant scenario cannot be fully directional.
- If replay evidence is missing, post-event validation is absent.
- If event actual/forecast fields are blank, future event triggers are conditional, not confirmed.
- If all three are true, section 1 must be Wait-Neutral.
- If you write that event outcomes or replay evidence are still required, section 1 must be Wait-Neutral.

OUTPUT DEPTH:
${depthGuide}

${technicalNumericFacts}

TECHNICAL CONFIRMATION TEXT — COPY EXACTLY IN SECTION 7:
${technicalConfirmationText}

${employmentEventFacts}

GOLDSCOPE STATE SNAPSHOT:
${safeCompact(snapshot)}

REQUIRED OUTPUT STRUCTURE:

1. Dominant research scenario
- Choose one: Bullish / Bearish / Wait-Neutral.
- Explain using only the provided evidence.
- If evidence is weak, stale, missing, or contradictory, prefer Wait-Neutral.

2. Confidence score
- Give 0-100.
- Give one concise reason.
- List confidence reducers.

3. Evidence table
Use this table. In the News row, explicitly mention contextQualityFlags.newsStrength and do not overstate weak news:
| Evidence block | Current state | Gold implication | Reliability |
|---|---|---|---|
| Macro | ... | ... | ... |
| News | ... | ... | ... |
| Calendar/event risk | ... | ... | ... |
| Replay evidence | ... | ... | ... |
| Technical context | ... | ... | ... |
| Source/data readiness | ... | ... | ... |

4. Bullish case for gold
- Only use triggers logically supported by the snapshot.
- Use labels: Confirmed evidence / Conditional evidence / Missing evidence.
- If newsStrength is weak, do not place news under Confirmed evidence; place it under Conditional/Weak supporting evidence.
- If news is about a gold-mining company, equity ticker, OTCMKTS item, shares, or retail gold rates, say it is not reliable XAUUSD evidence.
- Do not use support/resistance or specific price levels unless technicalContext or spotPrice exists.
- Do not label future NFP/CPI/FOMC outcomes as confirmed when actual/forecast values are blank.
- Include invalidation conditions.

5. Bearish case for gold
- Only use triggers logically supported by the snapshot.
- Use labels: Confirmed evidence / Conditional evidence / Missing evidence.
- If newsStrength is weak, do not place news under Confirmed evidence; place it under Conditional/Weak supporting evidence.
- If news is about a gold-mining company, equity ticker, OTCMKTS item, shares, or retail gold rates, say it is not reliable XAUUSD evidence.
- Do not use support/resistance or specific price levels unless technicalContext or spotPrice exists.
- Do not label future NFP/CPI/FOMC outcomes as confirmed when actual/forecast values are blank.
- Include invalidation conditions.

6. Wait/neutral case
- Explain why the system should avoid strong bias.
- Identify exactly what evidence is missing.

7. Technical confirmation
- Copy TECHNICAL CONFIRMATION TEXT exactly.
- Do not rewrite, compress, paraphrase, or add extra technical numbers.
- Do not add RSI14, StochRSI K, or StochRSI D values beyond what appears in TECHNICAL CONFIRMATION TEXT or TECHNICAL NUMERIC FACTS.
- Do not place technical context under Confirmed evidence.

8. Decision gates
Give 4-6 concrete gates.
If macroGateLanguageHints exists, copy these four gates exactly before adding any extra gate:
- If NFP materially weakens labor expectations and yields/USD fall, then gold may rise.
- If NFP strengthens labor expectations and yields/USD rise, then gold may fall.
- If CPI is hot but real yields fall, then gold may rise.
- If CPI is hot and real yields rise, then gold may fall.
Do not invent numeric thresholds.

9. Next catalyst plan
- Next event to watch. Use the exact nextMajor event from the snapshot.
- What to monitor before the event.
- What to monitor after the event.
- Mention avoid-window exactly as written in the state. Do not rewrite "2h before and 1h after" as "2h before/after".

10. Final research note
- One short paragraph.
- No trading instruction.
- End with <END_GOLDSCOPE_REPORT>`;
    }


    function cleanModelOutput(raw) {
      let text = String(raw || "");

      // Remove explicit Qwen/LLM thinking blocks if returned.
      text = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
      text = text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "");

      // Remove common leaked meta-reasoning from local models.
      text = text
        .split("\n")
        .filter((line) => {
          const l = line.trim().toLowerCase();
          if (!l) return true;
          if (l.startsWith("okay, the user wants")) return false;
          if (l.startsWith("okay, i need")) return false;
          if (l.startsWith("let me")) return false;
          if (l.startsWith("i need to")) return false;
          if (l.includes("make sure i understand the request")) return false;
          if (l.includes("the user wants me to")) return false;
          if (l === "/think" || l === "/no_think") return false;
          return true;
        })
        .join("\n")
        .trim();

      return text;
    }

    async function callOllama(prompt, label) {
      const hasThinkingArtifactLocal = (value) =>
        /<\s*\/?\s*think(?:ing)?\s*>|\/think\b|\breasoning artifact\b|\binternal planning text\b/i.test(String(value || ""));

      const stripThinkingArtifactsLocal = (value) => {
        let s = String(value || "");

        s = s.replace(/<\s*think\s*>[\s\S]*?<\s*\/\s*think\s*>/gi, "");
        s = s.replace(/<\s*thinking\s*>[\s\S]*?<\s*\/\s*thinking\s*>/gi, "");
        s = s.replace(/<\s*\/?\s*think(?:ing)?\s*>/gi, "");
        s = s.replace(/^\/think\s*/gi, "");

        const firstSection = s.search(/\b1\.\s*(?:\*\*)?\s*Dominant research scenario/i);
        if (firstSection > 0) s = s.slice(firstSection);

        return s.trim();
      };


      setAiRunning(true);
      setAiOutput("");
      setLastRaw("");
      setAiStatus(`clicked: ${label} at ${new Date().toLocaleTimeString()}`);

      try {
        const proxyOk = await checkProxy();
        if (!proxyOk) return;

        const ollamaOk = await checkOllama();
        if (!ollamaOk) return;

        setAiStatus(`sending ${label} to Ollama through internal Vite proxy...`);

        const numPredict =
          label === "smoke test" ? 40 :
          outputDepth === "concise" ? 900 :
          outputDepth === "deep" ? 2600 :
          1800;

        const body = {
          model,
          messages: [
            {
              role: "system",
              content: "You are a macro gold analyst. Do not output <think>, </think>, <thinking>, </thinking>, /think, hidden reasoning, planning text, or internal reasoning. Output only the final research report."
            },
            { role: "user", content: prompt },
          ],
          stream: false,
          options: {
            temperature: 0.1,
            num_predict: numPredict,
            repeat_penalty: 1.1,
            ...(USE_THINKING_STOP_TOKENS ? { stop: ["<think>", "<thinking>"] } : {}),
          },
        };

        const res = await fetchWithTimeout(`${OLLAMA_PROXY}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }, label === "smoke test" ? 60000 : 360000);

        setAiStatus("response received; parsing...");

        const rawText = await res.text();
        setLastRaw(rawText);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${rawText.slice(0, 700)}`);
        }

        let data;
        try {
          data = JSON.parse(rawText);
        } catch {
          throw new Error(`Ollama returned non-JSON:\n${rawText.slice(0, 1000)}`);
        }

        const rawOut =
          data?.message?.content ||
          data?.response ||
          data?.message?.thinking ||
          data?.thinking ||
          "";

        let out = stripThinkingArtifactsLocal(cleanAiArtifacts(cleanModelOutput(rawOut)));

        // Retry once only for thinking artifacts. Do not retry for macro/technical validation errors.
        if (label !== "smoke test" && hasThinkingArtifactLocal(rawOut)) {
          setAiStatus("thinking artifact detected; retrying once with stricter no-thinking prompt...");
          const retryBody = {
            ...body,
            messages: [
              {
                role: "system",
                content: "Output only the final GoldScope report. Never output <think>, </think>, <thinking>, </thinking>, /think, hidden reasoning, planning text, or internal reasoning. Start directly with section 1."
              },
              {
                role: "user",
                content: `${prompt}\n\nRETRY CONSTRAINT: Start directly with "1. Dominant research scenario". Do not output any think tags or internal reasoning.`
              },
            ],
            options: {
              ...body.options,
              temperature: 0.05,
            },
          };

          const retryRes = await fetchWithTimeout(`${OLLAMA_PROXY}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(retryBody),
          }, 360000);

          const retryRawText = await retryRes.text();
          setLastRaw(`${rawText}\n\n--- RETRY RAW RESPONSE ---\n${retryRawText}`);

          if (retryRes.ok) {
            try {
              const retryData = JSON.parse(retryRawText);
              const retryRawOut =
                retryData?.message?.content ||
                retryData?.response ||
                retryData?.message?.thinking ||
                retryData?.thinking ||
                "";
              const retryOut = stripThinkingArtifactsLocal(cleanAiArtifacts(cleanModelOutput(retryRawOut)));
              if (retryOut.trim()) out = retryOut;
            } catch {
              // Keep first cleaned output if retry parsing fails.
            }
          }
        }

        if (!out.trim()) {
          setAiOutput(`Ollama returned JSON, but no final text content was found after cleaning.

Raw model text:
${String(rawOut || "")}

Raw response:
${JSON.stringify(data, null, 2)}`);
          setAiStatus("complete but empty");
        } else {
          if (label === "smoke test") {
            setAiOutput(out);
            setAiStatus(out.trim().toUpperCase() === "OK" ? "smoke test OK" : "smoke test returned non-OK output");
          } else {
            const snapshotForValidation = contextSnapshot || buildGoldScopeContextSnapshot();
            const sanitized = sanitizeRawAiTechnicalEvidenceLanguage(out, snapshotForValidation);
            const scenarioPostProcessed = applyScenarioHeaderAndTechnicalLabelPostProcessing(sanitized.output, snapshotForValidation);
            const cleanupPostProcessed = applyPostProcessedOutputCleanup(scenarioPostProcessed.output, snapshotForValidation);
            const finalConfirmedEvidenceSafety = forceRelabelRemainingTechnicalConfirmedEvidence(cleanupPostProcessed.output, snapshotForValidation);
            const section7PostProcessed = replaceSection7WithDeterministicTechnicalConfirmation(finalConfirmedEvidenceSafety.text, snapshotForValidation);
            const maskedTechnicalSanitized = sanitizeMaskedTechnicalLeaks(section7PostProcessed, snapshotForValidation);
            const finalNextCatalystMacroCleanup = applyNextCatalystMacroCoverageCleanup(maskedTechnicalSanitized.output, snapshotForValidation);
            const globalTechnicalConfirmedRelabel = forceGlobalTechnicalConfirmedEvidenceRelabel(finalNextCatalystMacroCleanup.output, snapshotForValidation);
            const outputForValidation = globalTechnicalConfirmedRelabel.output;
            const validation = validateAiGoldReport(outputForValidation, snapshotForValidation);
            const validationText = formatValidationReport(validation);
            const highSeverity = validation.issues.some((i) => i.severity === "high");

            if (highSeverity) {
              const safeReport = buildValidationSafeGoldReport(snapshotForValidation, validation);
              const debugSnippets = buildRejectedRawAiDebugSnippets(out, outputForValidation, validation);
              setAiOutput(`${safeReport}${debugSnippets}`);
              setAiStatus("AI rejected: safe report generated");
            } else {
              const section7Note = section7PostProcessed !== finalConfirmedEvidenceSafety.text
                ? "\n\n---\nDETERMINISTIC SECTION 7 POST-PROCESSOR\nSection 7 Technical confirmation was replaced with deterministic technicalConfirmationText after sanitizer/cleanup. Macro, bullish/bearish cases, decision gates, and final note were not changed."
                : "";
              const scenarioPostProcessingNote = scenarioPostProcessed.anyApplied
                ? `\n\n---\nSCENARIO HEADER + TECHNICAL LABEL POST-PROCESSOR\nApplied changes: ${scenarioPostProcessed.changes.join(", ")}. Decision gates, next catalyst, final note, Safe Report logic, validators, macro logic, indicators, and strategy modules were not changed.`
                : "";
              const cleanupPostProcessingNote = cleanupPostProcessed.anyApplied
                ? `\n\n---\nPOST-PROCESSED OUTPUT CLEANUP\nApplied changes: ${cleanupPostProcessed.changes.join(", ")}. Validators, macro logic, employment data logic, indicators, and strategy modules were not changed.`
                : "";
              const finalConfirmedEvidenceSafetyNote = finalConfirmedEvidenceSafety.applied
                ? `\n\n---\nFINAL CONFIRMED-EVIDENCE SAFETY PASS\nApplied changes: ${finalConfirmedEvidenceSafety.changes.join(", ")}. Remaining technical Confirmed evidence labels in Sections 4/5 were forced to Technical confirmation context before validation.`
                : "";
              const maskedTechnicalSanitizerNote = maskedTechnicalSanitized.anyApplied
                ? `\n\n---\nMASKED TECHNICAL LEAK SANITIZER\nApplied changes: ${maskedTechnicalSanitized.changes.join(", ")}. Technical claims were removed because technicalContext was masked/unusable for scenario analysis.`
                : "";
              const finalNextCatalystMacroCleanupNote = finalNextCatalystMacroCleanup.anyApplied
                ? `\n\n---\nNEXT CATALYST + MACRO COVERAGE CLEANUP\nApplied changes: ${finalNextCatalystMacroCleanup.changes.join(", ")}. Next event name, complete-macro-coverage wording, and predictive technical table wording were cleaned before validation.`
                : "";
              const globalTechnicalConfirmedRelabelNote = globalTechnicalConfirmedRelabel.anyApplied
                ? `\n\n---\nGLOBAL TECHNICAL CONFIRMED-EVIDENCE RELABEL\nApplied changes: ${globalTechnicalConfirmedRelabel.changes.join(", ")}. Any remaining technical Confirmed evidence labels were converted before validation.`
                : "";
              const sanitizerNote = sanitized.applied
                ? `\n\n---\nRAW AI TECHNICAL LANGUAGE SANITIZER\nApplied technical-language cleanup only: ${sanitized.changes.join(", ")}. Macro/event logic was not changed.`
                : "";
              const decorated = validation.issues.length
                ? `${outputForValidation}${section7Note}${scenarioPostProcessingNote}${cleanupPostProcessingNote}${finalConfirmedEvidenceSafetyNote}${maskedTechnicalSanitizerNote}${finalNextCatalystMacroCleanupNote}${globalTechnicalConfirmedRelabelNote}${sanitizerNote}\n\n---\n${validationText}`
                : `${outputForValidation}${section7Note}${scenarioPostProcessingNote}${cleanupPostProcessingNote}${finalConfirmedEvidenceSafetyNote}${maskedTechnicalSanitizerNote}${finalNextCatalystMacroCleanupNote}${globalTechnicalConfirmedRelabelNote}${sanitizerNote}`;
              setAiOutput(decorated);
              setAiStatus(validation.ok
                ? (outputForValidation.includes("<END_GOLDSCOPE_REPORT>") ? "complete + validation passed" : "complete, but end marker missing")
                : "validation warning: review output");
            }
          }
        }
      } catch (err) {
        setAiStatus(`error: ${err.message}`);
        setAiOutput(`AI call failed.

${err.stack || err.message || String(err)}`);
      } finally {
        setAiRunning(false);
      }
    }

    async function runSmoke() {
      await callOllama("/no_think\nReply with exactly one word: OK", "smoke test");
    }

    function refreshPromptPreview() {
      try {
        const prompt = buildRealGoldScopePrompt(promptMode);
        setPromptPreview(prompt);
        setAiStatus("prompt preview refreshed");
      } catch (err) {
        setAiStatus(`prompt builder error: ${err.message}`);
        setAiOutput(`Prompt builder failed.\n\n${err.stack || err.message || String(err)}`);
      }
    }

    async function runScenario() {
      try {
        if (!technicalContext || technicalContext.status === "missing") {
          await loadTechnicalContext();
        }
        const prompt = buildRealGoldScopePrompt(promptMode);
        setPromptPreview(prompt);
        await callOllama(prompt, "technical-aware GoldScope scenario analysis");
      } catch (err) {
        setAiStatus(`prompt builder error: ${err.message}`);
        setAiOutput(`Prompt builder failed before sending to Ollama.\n\n${err.stack || err.message || String(err)}`);
      }
    }

    function downloadAIRecord() {
      const payload = {
        exportedAt: new Date().toISOString(),
        appVersion: "GoldScope v2.41.1.11.2",
        provider: "ollama-vite-proxy",
        model,
        promptMode,
        outputDepth,
        status: aiStatus,
        output: aiOutput,
        promptPreview,
        contextSnapshot,
        raw: lastRaw,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `goldscope-ai-context-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    function copyOutput() {
      navigator.clipboard?.writeText(aiOutput || "").catch(() => {});
    }

    function copyPrompt() {
      navigator.clipboard?.writeText(promptPreview || buildRealGoldScopePrompt(promptMode)).catch(() => {});
      setAiStatus("prompt copied");
    }

    return (
      <div style={{ display: "grid", gap: 16 }}>
        <Card>
          <Title icon="🤖" title="AI Analysis" sub="Optional. Use after Home / Smart Analysis has refreshed the state." />

          <Card style={{ background: "#170a12", borderColor: "#7f1d1d", marginBottom: 14 }}>
            <b style={{ color: C.red }}>Important:</b>{" "}
            <span style={{ color: C.muted }}>
              Research analysis only. No financial advice, no buy/sell signal, and no broker connection.
            </span>
          </Card>
<Card style={{ background: C.card2, borderColor: `${proxyStatus.includes("OK") ? C.green : C.gold}66`, marginBottom: 14 }}>
            <Title icon="🌉" title="Step 1 - Internal Ollama Proxy" sub="Built into Vite. No separate proxy BAT is needed." />
            <p style={{ color: C.muted, lineHeight: 1.7, marginTop: 0 }}>
              Only run <code>Start-GoldScope-v2.bat</code>. The app uses Vite internal proxy: <code>/api/ollama</code> → <code>http://localhost:11434</code>.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <Badge value={statusBadge(proxyStatus)}>{proxyStatus}</Badge>
              <button type="button" onClick={checkProxy} style={btn(false)}>Check internal proxy</button>
            </div>
          </Card>

          <Card style={{ background: C.card2, borderColor: `${ollamaStatus.includes("live") ? C.green : C.gold}66`, marginBottom: 14 }}>
            <Title icon="🦙" title="Step 2 - Ollama" sub="No API key. Uses your installed local model." />
            <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) auto", gap: 10, alignItems: "end" }}>
              <div>
                <label style={{ color: C.muted, fontSize: 12, fontWeight: 850 }}>Model</label>
                <select style={input} value={model} onChange={(e) => setModel(e.target.value)}>
                  {models.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <button type="button" onClick={checkOllama} style={btn(false)}>Check Ollama</button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <Badge value={statusBadge(ollamaStatus)}>{ollamaStatus}</Badge>
            </div>
          </Card>

          <Card style={{ background: C.card2, marginBottom: 14 }}>
            <Title icon="🧠" title="Step 3 - Macro-Guarded Context Prompt" sub="GoldScope builds the prompt automatically from current state." />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <div>
                <label style={{ color: C.muted, fontSize: 12, fontWeight: 850 }}>Prompt mode</label>
                <select style={input} value={promptMode} onChange={(e) => setPromptMode(e.target.value)}>
                  <option value="scenario">Full scenario lab</option>
                  <option value="preEvent">Pre-event briefing</option>
                  <option value="postEvent">Post-event verdict</option>
                  <option value="contradiction">Contradiction detector</option>
                </select>
              </div>
              <div>
                <label style={{ color: C.muted, fontSize: 12, fontWeight: 850 }}>Output depth</label>
                <select style={input} value={outputDepth} onChange={(e) => setOutputDepth(e.target.value)}>
                  <option value="concise">Concise</option>
                  <option value="standard">Standard</option>
                  <option value="deep">Deep</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <Badge value="blue">FRED rows: {(fredRows || []).length}</Badge>
              <Badge value="blue">GDELT news: {(news || []).length}</Badge>
              <Badge value="blue">Calendar events: {(calendarUniverse || []).length}</Badge>
              <Badge value="blue">Replay records: {(replayRecords || []).length}</Badge>
              <Badge value="blue">Uses latest AI Engine snapshot</Badge>
              <Badge value="warning">Macro logic guard: on</Badge>
              <Badge value="warning">No invented thresholds: on</Badge>
              <Badge value="supportive">Qwen /no_think: on</Badge>
              <Badge value="supportive">Output cleaner: on</Badge>
              <Badge value="supportive">Confidence cap: on</Badge>
              <Badge value="supportive">News strength: on</Badge>
              <Badge value="supportive">Rate limit guard: on</Badge>
              <Badge value="supportive">AI validator: on</Badge>
              <Badge value="supportive">Instrument guard: on</Badge>
              <Badge value="supportive">Price-level validator: on</Badge>
              <Badge value="supportive">Technical layer: on</Badge>\n              <Badge value="supportive">Technical masking: on</Badge>
              <Badge value="supportive">Event validator: on</Badge>
              <Badge value="supportive">Line-based NFP validator: on</Badge>
              <Badge value="supportive">Validation gate: on</Badge>
              <Badge value="supportive">Safe report: on</Badge>
              <Badge value="supportive">Technical source repair: on</Badge>
              <Badge value="supportive">XAUUSD first: on</Badge>
              <Badge value="supportive">Safe technical awareness: on</Badge>
              <Badge value="supportive">Case-specific technical wording: on</Badge>
              <Badge value="supportive">Alignment engine: on</Badge>
              <Badge value="supportive">Multi-timeframe: on</Badge>
              <Badge value="supportive">Think-tag rejection: on</Badge>
              <Badge value="supportive">Technical fact validator: on</Badge>
              <Badge value="supportive">Source health normalization: on</Badge>
              <Badge value="supportive">Rejected-output label: on</Badge>
              <Badge value="supportive">Event replay: on</Badge>
              <Badge value="supportive">Replay storage: local</Badge>
              <Badge value="supportive">Replay tab workflow: on</Badge>
              <Badge value="supportive">Manual replay hidden: on</Badge>
              <Badge value="supportive">Simplified operator UX: on</Badge>
              <Badge value="supportive">MACD/ADX/Bollinger/Keltner/StochRSI: on</Badge>
              <Badge value="supportive">Validation display cleanup: on</Badge>
              <Badge value="supportive">Strategy modules: on</Badge>
              <Badge value="supportive">Strategy validator: on</Badge>
              <Badge value="supportive">RSI14 parser fix: on</Badge>
              <Badge value="supportive">Technical quality gate calibrated: on</Badge>
              <Badge value="supportive">RSI threshold parser fix: on</Badge>
              <Badge value="supportive">RSI context isolation: on</Badge>
              <Badge value="supportive">RSI vs StochRSI prompt guard: on</Badge>
              <Badge value="supportive">Precomputed RSI/StochRSI hint: on</Badge>
              <Badge value="supportive">Raw AI technical sanitizer: on</Badge>
              <Badge value="supportive">Targeted RSI extreme sanitizer: on</Badge>
              <Badge value="supportive">Rejected raw AI debug snippets: on</Badge>
              <Badge value="supportive">RSI validator scoped: on</Badge>
              <Badge value="supportive">RSI helper scope hotfix: on</Badge>
              <Badge value="supportive">Macro gate hints: on</Badge>
              <Badge value="supportive">Dominant overclaim validator: on</Badge>
              <Badge value="supportive">Dominant validator scope hotfix: on</Badge>
              <Badge value="supportive">Markdown evidence label validator: on</Badge>
              <Badge value="supportive">Thinking artifact retry-once: on</Badge>
              <Badge value="supportive">Thinking helper scope hotfix: on</Badge>
              <Badge value="supportive">Bare RSI extreme validator: on</Badge>
              <Badge value="supportive">Candlestick pattern layer: on</Badge>
              <Badge value="supportive">Prompt runtime reliability: on</Badge>
              <Badge value="supportive">Safe report evidence wording: on</Badge>\n              <Badge value="supportive">Comparator exclusion: on</Badge>\n              <Badge value="supportive">Replay signal normalization: on</Badge>\n              <Badge value="supportive">Technical numeric grounding: on</Badge>\n              <Badge value="supportive">Deterministic technical section: on</Badge>\n              <Badge value="supportive">Section 7 post-processor: on</Badge>\n              <Badge value="supportive">Scenario header post-processor: on</Badge>\n              <Badge value="supportive">Employment event intelligence: on</Badge>\n              <Badge value="supportive">FRED employment backfill: on</Badge>\n              <Badge value="supportive">Employment-aware Safe Report: on</Badge>\n              <Badge value="supportive">Safe Report init-order fix: on</Badge>\n              <Badge value="supportive">Output cleanup post-processor: on</Badge>\n              <Badge value="supportive">Bold-colon evidence relabel: on</Badge>\n              <Badge value="supportive">Macro confirmed-evidence downgrade: on</Badge>\n              <Badge value="supportive">Final confirmed-evidence safety pass: on</Badge>\n              <Badge value="supportive">NFP invalidation direction guard: on</Badge>\n              <Badge value="supportive">Masked technical leak sanitizer: on</Badge>\n              <Badge value="supportive">Bearish-case technical wording fix: on</Badge>\n              <Badge value="supportive">Global technical confirmed-evidence relabel: on</Badge>\n              <Badge value="supportive">Next catalyst exact-name cleanup: on</Badge>
              <Badge value="supportive">Run readiness gate: on</Badge>
              <Badge value="supportive">Replay init fix: on</Badge>
              <Badge value="supportive">AI Engine crash fix: on</Badge>
              <Badge value="supportive">Simplified nav: on</Badge>
              <Badge value="supportive">Expanded indicators: on</Badge>
              <Badge value="supportive">Cleaner rejected-output validation: on</Badge>
              <Badge value="supportive">Trend/Momentum/Volatility/Structure: on</Badge>
              <Badge value="supportive">Validation footer logic: on</Badge>
              <Badge value="supportive">RSI numeric parser: strict</Badge>
              <Badge value="supportive">StochRSI overextension warning-only: on</Badge>
              <Badge value="supportive">RSI below/above threshold ignored: on</Badge>
              <Badge value="supportive">Unrelated numbers ignored: on</Badge>
              <Badge value="supportive">StochRSI wording clarified: on</Badge>
              <Badge value="supportive">Required RSI phrase: on</Badge>
              <Badge value="supportive">Technical confirmed-evidence sanitizer: on</Badge>
              <Badge value="supportive">near/approaching RSI untouched: on</Badge>
              <Badge value="supportive">Short issue-context snippets: on</Badge>
              <Badge value="supportive">StochRSI sanitizer guard: on</Badge>
              <Badge value="supportive">Validator helper functions global: on</Badge>
              <Badge value="supportive">Deterministic decision gates: on</Badge>
              <Badge value="supportive">Technical numeric fact validator: on</Badge>
              <Badge value="supportive">Validator local helpers: on</Badge>
              <Badge value="supportive">Completion gate validator: on</Badge>
              <Badge value="supportive">Hard Wait-Neutral prompt anchor: on</Badge>
              <Badge value="supportive">Local thinking cleaners: on</Badge>
              <Badge value="supportive">StochRSI exclusion preserved: on</Badge>
              <Badge value="supportive">Candlestick confirmation-only: on</Badge>
              <Badge value="supportive">Optional think stop tokens: off</Badge>
              <Badge value="supportive">RSI parser cleanup: on</Badge>\n              <Badge value="supportive">Technical numeric measured-only: on</Badge>\n              <Badge value="supportive">Technical safe wording cleanup: on</Badge>\n              <Badge value="supportive">Allowed RSI/StochRSI facts: on</Badge>\n              <Badge value="supportive">Section 7 copy-exact: on</Badge>\n              <Badge value="supportive">Pre-validation Section 7 replacement: on</Badge>\n              <Badge value="supportive">Mixed technical label splitter: on</Badge>\n              <Badge value="supportive">Labor composition analyzer: on</Badge>\n              <Badge value="supportive">Labor data readiness fix: on</Badge>\n              <Badge value="supportive">Markdown evidence relabel fix: on</Badge>\n              <Badge value="supportive">Employment report injection: on</Badge>
              <Badge value="supportive">Replay tab crash fix: on</Badge>
              <Badge value="supportive">Technical sanity: on</Badge>
              <Badge value="supportive">NFP direction validator: on</Badge>\n              <Badge value="supportive">Technical masking: on</Badge>
              <Badge value="supportive">Event validator: on</Badge>
              <Badge value="supportive">Line-based NFP validator: on</Badge>
              <Badge value="supportive">Validation gate: on</Badge>
              <Badge value="supportive">Safe report: on</Badge>
              <Badge value="supportive">Technical source repair: on</Badge>
              <Badge value="supportive">XAUUSD first: on</Badge>
              <Badge value="supportive">Safe technical awareness: on</Badge>
              <Badge value="supportive">Case-specific technical wording: on</Badge>
              <Badge value="supportive">Alignment engine: on</Badge>
              <Badge value="supportive">Multi-timeframe: on</Badge>
              <Badge value="supportive">Think-tag rejection: on</Badge>
              <Badge value="supportive">Technical fact validator: on</Badge>
              <Badge value="supportive">Source health normalization: on</Badge>
              <Badge value="supportive">Rejected-output label: on</Badge>
              <Badge value="supportive">Event replay: on</Badge>
              <Badge value="supportive">Replay storage: local</Badge>
              <Badge value="supportive">Replay tab workflow: on</Badge>
              <Badge value="supportive">Manual replay hidden: on</Badge>
              <Badge value="supportive">Simplified operator UX: on</Badge>
              <Badge value="supportive">MACD/ADX/Bollinger/Keltner/StochRSI: on</Badge>
              <Badge value="supportive">Validation display cleanup: on</Badge>
              <Badge value="supportive">Strategy modules: on</Badge>
              <Badge value="supportive">Strategy validator: on</Badge>
              <Badge value="supportive">RSI14 parser fix: on</Badge>
              <Badge value="supportive">Technical quality gate calibrated: on</Badge>
              <Badge value="supportive">RSI threshold parser fix: on</Badge>
              <Badge value="supportive">RSI context isolation: on</Badge>
              <Badge value="supportive">RSI vs StochRSI prompt guard: on</Badge>
              <Badge value="supportive">Precomputed RSI/StochRSI hint: on</Badge>
              <Badge value="supportive">Raw AI technical sanitizer: on</Badge>
              <Badge value="supportive">Targeted RSI extreme sanitizer: on</Badge>
              <Badge value="supportive">Rejected raw AI debug snippets: on</Badge>
              <Badge value="supportive">RSI validator scoped: on</Badge>
              <Badge value="supportive">RSI helper scope hotfix: on</Badge>
              <Badge value="supportive">Macro gate hints: on</Badge>
              <Badge value="supportive">Dominant overclaim validator: on</Badge>
              <Badge value="supportive">Dominant validator scope hotfix: on</Badge>
              <Badge value="supportive">Markdown evidence label validator: on</Badge>
              <Badge value="supportive">Thinking artifact retry-once: on</Badge>
              <Badge value="supportive">Thinking helper scope hotfix: on</Badge>
              <Badge value="supportive">Bare RSI extreme validator: on</Badge>
              <Badge value="supportive">Candlestick pattern layer: on</Badge>
              <Badge value="supportive">Prompt runtime reliability: on</Badge>
              <Badge value="supportive">Safe report evidence wording: on</Badge>\n              <Badge value="supportive">Comparator exclusion: on</Badge>\n              <Badge value="supportive">Replay signal normalization: on</Badge>\n              <Badge value="supportive">Technical numeric grounding: on</Badge>\n              <Badge value="supportive">Deterministic technical section: on</Badge>\n              <Badge value="supportive">Section 7 post-processor: on</Badge>\n              <Badge value="supportive">Scenario header post-processor: on</Badge>\n              <Badge value="supportive">Employment event intelligence: on</Badge>\n              <Badge value="supportive">FRED employment backfill: on</Badge>\n              <Badge value="supportive">Employment-aware Safe Report: on</Badge>\n              <Badge value="supportive">Safe Report init-order fix: on</Badge>\n              <Badge value="supportive">Output cleanup post-processor: on</Badge>\n              <Badge value="supportive">Bold-colon evidence relabel: on</Badge>\n              <Badge value="supportive">Macro confirmed-evidence downgrade: on</Badge>\n              <Badge value="supportive">Final confirmed-evidence safety pass: on</Badge>\n              <Badge value="supportive">NFP invalidation direction guard: on</Badge>\n              <Badge value="supportive">Masked technical leak sanitizer: on</Badge>\n              <Badge value="supportive">Bearish-case technical wording fix: on</Badge>\n              <Badge value="supportive">Global technical confirmed-evidence relabel: on</Badge>\n              <Badge value="supportive">Next catalyst exact-name cleanup: on</Badge>
              <Badge value="supportive">Run readiness gate: on</Badge>
              <Badge value="supportive">Replay init fix: on</Badge>
              <Badge value="supportive">AI Engine crash fix: on</Badge>
              <Badge value="supportive">Simplified nav: on</Badge>
              <Badge value="supportive">Expanded indicators: on</Badge>
              <Badge value="supportive">Cleaner rejected-output validation: on</Badge>
              <Badge value="supportive">Trend/Momentum/Volatility/Structure: on</Badge>
              <Badge value="supportive">Validation footer logic: on</Badge>
              <Badge value="supportive">RSI numeric parser: strict</Badge>
              <Badge value="supportive">StochRSI overextension warning-only: on</Badge>
              <Badge value="supportive">RSI below/above threshold ignored: on</Badge>
              <Badge value="supportive">Unrelated numbers ignored: on</Badge>
              <Badge value="supportive">StochRSI wording clarified: on</Badge>
              <Badge value="supportive">Required RSI phrase: on</Badge>
              <Badge value="supportive">Technical confirmed-evidence sanitizer: on</Badge>
              <Badge value="supportive">near/approaching RSI untouched: on</Badge>
              <Badge value="supportive">Short issue-context snippets: on</Badge>
              <Badge value="supportive">StochRSI sanitizer guard: on</Badge>
              <Badge value="supportive">Validator helper functions global: on</Badge>
              <Badge value="supportive">Deterministic decision gates: on</Badge>
              <Badge value="supportive">Technical numeric fact validator: on</Badge>
              <Badge value="supportive">Validator local helpers: on</Badge>
              <Badge value="supportive">Completion gate validator: on</Badge>
              <Badge value="supportive">Hard Wait-Neutral prompt anchor: on</Badge>
              <Badge value="supportive">Local thinking cleaners: on</Badge>
              <Badge value="supportive">StochRSI exclusion preserved: on</Badge>
              <Badge value="supportive">Candlestick confirmation-only: on</Badge>
              <Badge value="supportive">Optional think stop tokens: off</Badge>
              <Badge value="supportive">RSI parser cleanup: on</Badge>\n              <Badge value="supportive">Technical numeric measured-only: on</Badge>\n              <Badge value="supportive">Technical safe wording cleanup: on</Badge>\n              <Badge value="supportive">Allowed RSI/StochRSI facts: on</Badge>\n              <Badge value="supportive">Section 7 copy-exact: on</Badge>\n              <Badge value="supportive">Pre-validation Section 7 replacement: on</Badge>\n              <Badge value="supportive">Mixed technical label splitter: on</Badge>\n              <Badge value="supportive">Labor composition analyzer: on</Badge>\n              <Badge value="supportive">Labor data readiness fix: on</Badge>\n              <Badge value="supportive">Markdown evidence relabel fix: on</Badge>\n              <Badge value="supportive">Employment report injection: on</Badge>
              <Badge value="supportive">Replay tab crash fix: on</Badge>\n              <Badge value="supportive">Prompt builder fix: on</Badge>
            </div>
          </Card>

          <Card style={{ background: C.card2, marginBottom: 14 }}>
            <Title icon="▶️" title="Step 4 - Run" sub="First smoke test. Then run no-think macro-guarded GoldScope analysis." />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button type="button" disabled={aiRunning} onClick={runSmoke} style={btn(aiRunning)}>
                {aiRunning ? "Running..." : "Run smoke test"}
              </button>
              <button type="button" disabled={aiRunning} onClick={loadTechnicalContext} style={btn(aiRunning)}>
                Load technical context
              </button>
              <button type="button" disabled={aiRunning} onClick={refreshPromptPreview} style={btn(aiRunning)}>
                Preview prompt
              </button>
              <button type="button" disabled={aiRunning} onClick={runScenario} style={btn(aiRunning)}>
                {aiRunning ? "Running..." : "Run no-think macro-guarded AI analysis"}
              </button>
              <button type="button" onClick={copyOutput} style={btn(false)}>Copy output</button>
              <button type="button" onClick={copyPrompt} style={btn(false)}>Copy prompt</button>
              <button type="button" onClick={downloadAIRecord} style={btn(false)}>Download AI record</button>
              <Badge value={statusBadge(aiStatus)}>{aiStatus}</Badge>
              <Badge value={technicalContext?.status === "available" ? "supportive" : "warning"}>{technicalStatus}</Badge>
            </div>
          </Card>

          <Card style={{ background: C.card2 }}>
            <Title icon="📄" title="AI Output" sub="The report should end with <END_GOLDSCOPE_REPORT>." />
            <pre style={{
              whiteSpace: "pre-wrap",
              color: C.text,
              background: "#0b1220",
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 14,
              minHeight: 260,
              maxHeight: 640,
              overflow: "auto",
              lineHeight: 1.65,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 13,
            }}>{aiOutput || "Start GoldScope, check internal proxy, check Ollama, then run smoke test. After OK, run no-think macro-guarded AI analysis."}</pre>
          </Card>

          {promptPreview && (
            <Card style={{ background: C.card2, marginTop: 14 }}>
              <Title icon="🧾" title="Prompt Preview" sub="For debugging only. You do not need to edit it manually." />
              <pre style={{
                whiteSpace: "pre-wrap",
                color: C.muted,
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: 14,
                minHeight: 180,
                maxHeight: 420,
                overflow: "auto",
                lineHeight: 1.55,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: 12,
              }}>{promptPreview}</pre>
            </Card>
          )}
        </Card>
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
        appVersion: "GoldScope v2.41.1.11.2",
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
        appVersion: "GoldScope v2.41.1.11.2",
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
        aiHistory,
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
      if (type === "ai-history") return { ...base, aiHistory };
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
        key: "ai-history",
        title: "AI analysis history",
        desc: "Saved AI scenario analysis outputs; API keys are never included.",
        count: aiHistory.length,
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
    aiEngine: <AIScenarioEngine />,
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
              <strong style={{ color: C.gold, fontSize: 23 }}>GoldScope v2.41.1.11.2</strong>
              <Badge value="warning">Gold-only</Badge>
              <Badge value={health.gdelt.status}>GDELT {health.gdelt.status}</Badge>
              <Badge value={health.fred.status}>FRED {health.fred.status}</Badge>
              <Badge value={bias.color === C.green ? "bullish" : bias.color === C.red ? "bearish" : "warning"}>{bias.label.replace("Research bias: ", "")}</Badge>
            </div>
            <p style={{ color: C.muted, margin: "7px 0 0", fontSize: 13 }}>
              XAUUSD research terminal · simplified workflow · macro + expanded technical strategy modules + replay-aware scenario lab · no broker connection · no auto-trading
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
