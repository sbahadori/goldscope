#!/usr/bin/env node

/**
 * GoldScope official calendar updater.
 *
 * Purpose:
 * - Pull scheduled macro events from official/public sources.
 * - Normalize them into public/data/official_gold_calendar_2026.json.
 * - Write public/data/calendar_source_health.json.
 *
 * Current sources:
 * - Federal Reserve FOMC calendar page
 * - BLS monthly schedule pages
 * - BEA release schedule page
 * - EIA Weekly Petroleum Status Report schedule page
 * - Optional Trading Economics Calendar API if credentials are provided
 *
 * This script is intentionally dependency-free and uses Node 18+ built-in fetch.
 * HTML parsing is best-effort. If a source parser fails, the existing calendar seed
 * remains available and the failure is written to source health.
 */

import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "public", "data");
const OUT_FILE = path.join(OUT_DIR, "official_gold_calendar_2026.json");
const HEALTH_FILE = path.join(OUT_DIR, "calendar_source_health.json");
const CONFIG_DIR = path.join(ROOT, "public", "config");
const TE_FILE = path.join(CONFIG_DIR, "trading_economics_credentials.txt");

const CURRENT_YEAR = new Date().getFullYear();
const TARGET_YEAR = CURRENT_YEAR;
const NEXT_YEAR = CURRENT_YEAR + 1;

const SOURCE_URLS = {
  fed: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
  blsBase: (year, month) => `https://www.bls.gov/schedule/${year}/${String(month).padStart(2, "0")}_sched.htm`,
  bea: "https://www.bea.gov/news/schedule",
  eia: "https://www.eia.gov/petroleum/supply/weekly/schedule.php",
};

const GOLD_RELEVANT_BLS = [
  "Employment Situation",
  "Consumer Price Index",
  "Producer Price Index",
  "Job Openings and Labor Turnover Survey",
  "Employment Cost Index",
  "Import and Export Price Indexes",
];

const BEA_RELEVANT = [
  "Gross Domestic Product",
  "GDP",
  "Personal Income and Outlays",
  "Personal Income",
  "PCE",
  "International Trade",
];

const GOLD_RELEVANT_TE_KEYWORDS = [
  "interest rate",
  "fed",
  "fomc",
  "cpi",
  "inflation",
  "ppi",
  "pce",
  "non farm",
  "non-farm",
  "unemployment",
  "jobless",
  "payroll",
  "gdp",
  "retail sales",
  "ism",
  "pmi",
  "crude",
  "oil",
  "opec",
];

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|td|th|h1|h2|h3|h4)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function monthNumber(name) {
  const months = {
    january: 0, jan: 0,
    february: 1, feb: 1,
    march: 2, mar: 2,
    april: 3, apr: 3,
    may: 4,
    june: 5, jun: 5,
    july: 6, jul: 6,
    august: 7, aug: 7,
    september: 8, sep: 8, sept: 8,
    october: 9, oct: 9,
    november: 10, nov: 10,
    december: 11, dec: 11,
  };
  return months[String(name || "").toLowerCase().replace(".", "")];
}

function isoDate(year, monthIndex, day) {
  return new Date(Date.UTC(Number(year), Number(monthIndex), Number(day), 12, 0, 0)).toISOString().slice(0, 10);
}

function normalizeTime(raw, fallback = "08:30") {
  if (!raw) return fallback;
  const s = String(raw).toLowerCase();
  const m = s.match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?|am|pm)/i);
  if (!m) return fallback;
  let h = Number(m[1]);
  const min = m[2] || "00";
  const isPm = /p/.test(m[3]);
  if (isPm && h !== 12) h += 12;
  if (!isPm && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${min}`;
}

function eventMeta(name, source = "") {
  const n = `${name} ${source}`.toLowerCase();

  let category = "Macro";
  let importance = "Medium";
  let volatilityRisk = "Medium";
  let expectedImpact = "Macro event can affect gold through USD, Treasury yields, real yields and risk sentiment.";
  let avoidWindow = "30–60 minutes around release";

  if (/fomc|fed|interest rate|policy decision|central bank/.test(n)) {
    category = "Fed / Rates";
    importance = "Critical";
    volatilityRisk = "Extreme";
    expectedImpact = "Critical for gold through rate-path expectations, USD, Treasury yields and real yields. Hawkish tone can pressure XAUUSD; dovish tone can support it.";
    avoidWindow = "Avoid new entries 2h before and 1h after decision/press conference.";
  } else if (/consumer price|cpi|producer price|ppi|pce|inflation/.test(n)) {
    category = "Inflation";
    importance = /cpi|pce/.test(n) ? "High" : "Medium";
    volatilityRisk = /cpi|pce/.test(n) ? "High" : "Medium";
    expectedImpact = "Soft inflation usually supports gold through lower yield pressure; hot inflation can pressure gold if Fed expectations turn hawkish.";
    avoidWindow = importance === "High" ? "Avoid new entries 2h before and 1h after release." : "30–60 minutes around release.";
  } else if (/employment situation|nonfarm|non-farm|payroll|unemployment|job openings|jolts|jobless|employment cost|wage/.test(n)) {
    category = /employment cost|wage/.test(n) ? "Wages / Inflation" : "Labor";
    importance = /employment situation|nonfarm|payroll/.test(n) ? "High" : "Medium";
    volatilityRisk = importance === "High" ? "High" : "Medium";
    expectedImpact = "Strong labor data can lift USD/yields and pressure gold; weak labor can support gold via rate-cut expectations.";
    avoidWindow = importance === "High" ? "Avoid new entries 2h before and 1h after release." : "30–60 minutes around release.";
  } else if (/gdp|gross domestic|retail sales|ism|pmi|trade/.test(n)) {
    category = "Growth";
    importance = /gdp|retail sales/.test(n) ? "Medium" : "Medium";
    volatilityRisk = "Medium";
    expectedImpact = "Growth surprises can move yields and USD. Weak growth can support gold if recession risk rises; strong growth can pressure gold through yields.";
  } else if (/oil|crude|petroleum|eia|opec/.test(n)) {
    category = "Oil / Inflation";
    importance = /opec/.test(n) ? "High" : "Medium";
    volatilityRisk = /opec/.test(n) ? "High" : "Medium";
    expectedImpact = "Oil shocks can affect inflation expectations, yields and risk sentiment. Gold impact is indirect but can be material during energy stress.";
    avoidWindow = "30–60 minutes around release if oil volatility is elevated.";
  }

  return { category, importance, volatilityRisk, expectedImpact, avoidWindow };
}

function makeEvent({ date, time, country = "US", name, source, sourceUrl, notes = "", previous = "", forecast = "", actual = "" }) {
  const meta = eventMeta(name, source);
  return {
    id: `${source}-${date}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    date,
    time,
    country,
    name,
    category: meta.category,
    importance: meta.importance,
    previous,
    forecast,
    actual,
    expectedImpact: meta.expectedImpact,
    volatilityRisk: meta.volatilityRisk,
    avoidWindow: meta.avoidWindow,
    source,
    sourceUrl,
    official: true,
    notes,
  };
}

async function fetchText(url, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "GoldScope local research calendar updater",
        "accept": "text/html,text/plain,application/json,*/*",
      },
    });
    const text = await r.text();
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0, 140)}`);
    return text;
  } finally {
    clearTimeout(timer);
  }
}

function dedupe(events) {
  const seen = new Set();
  return events.filter((e) => {
    const key = `${e.date}|${e.time}|${e.name}|${e.source}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => `${a.date} ${a.time} ${a.name}`.localeCompare(`${b.date} ${b.time} ${b.name}`));
}

async function parseFed() {
  const html = await fetchText(SOURCE_URLS.fed);
  const text = stripHtml(html);
  const events = [];

  // Match ranges such as "June 16-17, 2026" or "July 28-29, 2026".
  const re = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:-(\d{1,2}))?,\s*(20\d{2})/gi;
  let m;
  while ((m = re.exec(text))) {
    const month = monthNumber(m[1]);
    const endDay = Number(m[3] || m[2]);
    const year = Number(m[4]);
    if (year < TARGET_YEAR || year > NEXT_YEAR) continue;

    const date = isoDate(year, month, endDay);
    const windowText = text.slice(Math.max(0, m.index - 50), m.index + 140);
    const hasSep = /\*|Projection|Economic Projections/i.test(windowText);
    events.push(makeEvent({
      date,
      time: "14:00",
      name: hasSep ? "FOMC policy decision + SEP" : "FOMC policy decision",
      source: "Federal Reserve FOMC calendar",
      sourceUrl: SOURCE_URLS.fed,
      notes: hasSep ? "Meeting may include Summary of Economic Projections." : "",
    }));
  }

  return events;
}

async function parseBlsMonth(year, month) {
  const url = SOURCE_URLS.blsBase(year, month);
  const html = await fetchText(url);
  const text = stripHtml(html);
  const events = [];

  for (const name of GOLD_RELEVANT_BLS) {
    const idxs = [...text.matchAll(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"))].map((m) => m.index);
    for (const idx of idxs) {
      const ctx = text.slice(Math.max(0, idx - 220), idx + 260);
      const dateMatch = ctx.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(20\d{2})/i)
        || ctx.match(/(\d{1,2})\/(\d{1,2})\/(20\d{2})/);
      if (!dateMatch) continue;

      let date;
      if (dateMatch[1] && monthNumber(dateMatch[1]) !== undefined) {
        date = isoDate(dateMatch[3], monthNumber(dateMatch[1]), dateMatch[2]);
      } else {
        date = isoDate(dateMatch[3], Number(dateMatch[1]) - 1, dateMatch[2]);
      }

      const time = normalizeTime(ctx, /job openings|jolts/i.test(name) ? "10:00" : "08:30");
      events.push(makeEvent({
        date,
        time,
        name,
        source: "BLS release schedule",
        sourceUrl: url,
      }));
    }
  }

  return events;
}

async function parseBls() {
  const events = [];
  const now = new Date();
  const months = [];
  for (let i = -1; i <= 8; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push([d.getFullYear(), d.getMonth() + 1]);
  }

  for (const [year, month] of months) {
    try {
      events.push(...await parseBlsMonth(year, month));
    } catch (err) {
      // Some future month pages may not exist yet; record source-level errors outside this function.
    }
  }
  return events;
}

async function parseBea() {
  const html = await fetchText(SOURCE_URLS.bea);
  const text = stripHtml(html);
  const events = [];

  for (const name of BEA_RELEVANT) {
    const idxs = [...text.matchAll(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"))].map((m) => m.index);
    for (const idx of idxs) {
      const ctx = text.slice(Math.max(0, idx - 260), idx + 320);
      const dateMatch = ctx.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(20\d{2})/i);
      if (!dateMatch) continue;
      const date = isoDate(dateMatch[3], monthNumber(dateMatch[1]), dateMatch[2]);
      const time = normalizeTime(ctx, "08:30");
      events.push(makeEvent({
        date,
        time,
        name: /personal income/i.test(name) ? "Personal Income and Outlays / PCE" : name,
        source: "BEA release schedule",
        sourceUrl: SOURCE_URLS.bea,
      }));
    }
  }

  return events;
}

async function parseEia() {
  const html = await fetchText(SOURCE_URLS.eia);
  const text = stripHtml(html);
  const events = [];

  // EIA WPSR normally releases Wednesdays 10:30 ET. The page lists holiday exceptions.
  // Generate weekly near-term dates and let official holiday text enrich notes if available.
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 180);
  const d = new Date(start);
  const daysUntilWed = (3 + 7 - d.getDay()) % 7;
  d.setDate(d.getDate() + daysUntilWed);

  while (d <= end) {
    events.push(makeEvent({
      date: d.toISOString().slice(0, 10),
      time: "10:30",
      name: "EIA Weekly Petroleum Status Report",
      source: "EIA WPSR schedule",
      sourceUrl: SOURCE_URLS.eia,
      notes: "Standard EIA WPSR release. Holiday weeks may shift; verify EIA schedule for exceptions.",
    }));
    d.setDate(d.getDate() + 7);
  }

  // Try to detect explicit holiday exception dates/times in page text.
  const exceptionRe = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(20\d{2}).{0,80}?(\d{1,2}:\d{2}\s*(?:a\.?m\.?|p\.?m\.?|am|pm))/gi;
  let m;
  while ((m = exceptionRe.exec(text))) {
    const date = isoDate(m[3], monthNumber(m[1]), m[2]);
    const time = normalizeTime(m[4], "12:00");
    events.push(makeEvent({
      date,
      time,
      name: "EIA WPSR holiday-delayed release",
      source: "EIA WPSR holiday schedule",
      sourceUrl: SOURCE_URLS.eia,
      notes: "Holiday exception detected from EIA schedule page.",
    }));
  }

  return events;
}

async function readTradingEconomicsCredential() {
  if (process.env.TRADING_ECONOMICS_CREDENTIALS) return process.env.TRADING_ECONOMICS_CREDENTIALS.trim();
  try {
    const raw = await fs.readFile(TE_FILE, "utf8");
    const val = raw.split(/\r?\n/).map((x) => x.trim()).find((x) => x && !x.startsWith("#"));
    return val && !val.includes("PASTE_") ? val : "";
  } catch {
    return "";
  }
}

async function parseTradingEconomics() {
  const cred = await readTradingEconomicsCredential();
  if (!cred) return [];

  const countries = ["United States", "Euro Area", "China", "Japan", "United Kingdom"];
  const from = new Date().toISOString().slice(0, 10);
  const toDate = new Date();
  toDate.setDate(toDate.getDate() + 180);
  const to = toDate.toISOString().slice(0, 10);

  const events = [];
  for (const country of countries) {
    const url = `https://api.tradingeconomics.com/calendar/country/${encodeURIComponent(country)}/${from}/${to}?c=${encodeURIComponent(cred)}&format=json`;
    const raw = await fetchText(url);
    let arr;
    try {
      arr = JSON.parse(raw);
    } catch {
      continue;
    }
    for (const item of Array.isArray(arr) ? arr : []) {
      const title = String(item.Event || item.event || item.Category || "").trim();
      const low = title.toLowerCase();
      if (!GOLD_RELEVANT_TE_KEYWORDS.some((k) => low.includes(k))) continue;

      const dt = new Date(item.Date || item.date || item.LastUpdate || Date.now());
      if (!Number.isFinite(dt.getTime())) continue;

      events.push(makeEvent({
        date: dt.toISOString().slice(0, 10),
        time: dt.toISOString().slice(11, 16),
        country: item.Country || country,
        name: title,
        source: "Trading Economics calendar",
        sourceUrl: "https://tradingeconomics.com/calendar",
        previous: item.Previous ?? "",
        forecast: item.Forecast ?? "",
        actual: item.Actual ?? "",
        notes: `TE category: ${item.Category || ""}`,
      }));
    }
  }
  return events;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(CONFIG_DIR, { recursive: true });

  const sources = [
    ["fed", parseFed],
    ["bls", parseBls],
    ["bea", parseBea],
    ["eia", parseEia],
    ["tradingEconomics", parseTradingEconomics],
  ];

  const allEvents = [];
  const health = {
    generatedAt: new Date().toISOString(),
    output: OUT_FILE,
    sources: {},
  };

  for (const [name, fn] of sources) {
    const started = Date.now();
    try {
      const events = await fn();
      allEvents.push(...events);
      health.sources[name] = {
        status: events.length ? "live" : "empty",
        count: events.length,
        durationMs: Date.now() - started,
        error: null,
      };
      console.log(`[calendar] ${name}: ${events.length} events`);
    } catch (err) {
      health.sources[name] = {
        status: "error",
        count: 0,
        durationMs: Date.now() - started,
        error: err.message,
      };
      console.warn(`[calendar] ${name} failed: ${err.message}`);
    }
  }

  let finalEvents = dedupe(allEvents);

  // Keep existing seed if all fetches/parsers fail.
  if (!finalEvents.length) {
    try {
      const existing = JSON.parse(await fs.readFile(OUT_FILE, "utf8"));
      if (Array.isArray(existing) && existing.length) {
        finalEvents = existing;
        health.fallback = "Used existing calendar file because no live events were parsed.";
      }
    } catch {}
  }

  await fs.writeFile(OUT_FILE, JSON.stringify(finalEvents, null, 2), "utf8");
  await fs.writeFile(HEALTH_FILE, JSON.stringify(health, null, 2), "utf8");

  console.log(`[calendar] wrote ${finalEvents.length} events to ${OUT_FILE}`);
  console.log(`[calendar] wrote health to ${HEALTH_FILE}`);

  if (!finalEvents.length) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
