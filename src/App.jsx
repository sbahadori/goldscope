
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
const FRED_MIN_INTERVAL_MS = 10000;
const GDELT_CACHE_TTL_MS = 10 * 60 * 1000;
const FRED_CACHE_TTL_MS = 30 * 60 * 1000;

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

const MOCK_EVENTS = [
  ["FOMC / Fed speeches", "High", "Hawkish tone can pressure gold; dovish tone can support gold."],
  ["CPI / PPI / PCE", "High", "Soft inflation may reduce yield pressure; hot inflation is mixed if Fed turns hawkish."],
  ["NFP / Unemployment", "High", "Strong labor can support USD/yields; weak labor may support gold."],
];

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
  const [tab, setTab] = useState("overview");
  const [news, setNews] = useState(MOCK_NEWS);
  const [fredRows, setFredRows] = useState(MOCK_FRED);
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

  const fredScore = useMemo(() => fredRows.reduce((s, r) => s + (Number(r.score) || 0), 0), [fredRows]);
  const newsScore = useMemo(() => {
    const bull = news.filter((n) => n.impact === "bullish").length;
    const bear = news.filter((n) => n.impact === "bearish").length;
    return bull - bear;
  }, [news]);

  const bias = useMemo(() => {
    const total = fredScore + newsScore;
    if (health.fred.status === "missing-key" && health.gdelt.status !== "live") {
      return { label: "Data insufficient", color: C.gold, text: "Add FRED key and refresh GDELT before trusting the bias engine.", total };
    }
    if (total >= 3) return { label: "Research bias: Bullish", color: C.green, text: "Gold-supportive macro/news pressure dominates. Confirm with chart and event risk.", total };
    if (total <= -3) return { label: "Research bias: Bearish", color: C.red, text: "Dollar/yield/macro pressure dominates. Watch for reversals around data releases.", total };
    return { label: "Neutral / Wait", color: C.gray, text: "Signals are mixed or weak. Wait for confirmation and high-quality catalysts.", total };
  }, [fredScore, newsScore, health]);

  function cooldownRemaining(kind, minMs, key) {
    const last = Number(localStorage.getItem(key) || "0");
    return Math.max(0, minMs - (Date.now() - last));
  }

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
    ["overview", "Overview"],
    ["chart", "Live Chart"],
    ["news", "News Intelligence"],
    ["macro", "FRED Macro Drivers"],
    ["calendar", "Macro Calendar"],
    ["bias", "Bias Engine"],
    ["health", "Source Health"],
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
          <Card>
            <Title icon="🧭" title="Next Development Path" sub="Current v2 scope." />
            <p style={{ color: C.muted, lineHeight: 1.7 }}>
              GDELT and FRED are active local sources. Trading Economics, Reddit and YouTube remain disabled until official keys/proxies are added.
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

  function MacroDrivers() {
    const grouped = fredRows.reduce((acc, row) => {
      acc[row.group] = acc[row.group] || [];
      acc[row.group].push(row);
      return acc;
    }, {});

    return (
      <Card>
        <Title icon="🏦" title="FRED Macro Drivers" sub="US yields, real-yield proxy, inflation, labor and dollar pressure for gold." />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <button onClick={refreshFred} disabled={loadingFred || fredWait > 0} style={btn(loadingFred || fredWait > 0)}>
            {loadingFred ? "Loading FRED..." : fredWait > 0 ? `Wait ${fredWait}s` : "Refresh FRED"}
          </button>
          <Badge value={health.fred.status}>{health.fred.status}</Badge>
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
    return (
      <Card>
        <Title icon="📅" title="Macro Calendar Placeholder" sub="Trading Economics will be added in a later version." />
        <div style={{ display: "grid", gap: 12 }}>
          {MOCK_EVENTS.map(([name, imp, logic]) => (
            <Card key={name} style={{ background: C.card2 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <b>{name}</b>
                <Badge value={imp === "High" ? "warning" : "blue"}>{imp}</Badge>
              </div>
              <p style={{ color: C.muted }}>{logic}</p>
            </Card>
          ))}
        </div>
      </Card>
    );
  }

  function BiasEngine() {
    return (
      <Card style={{ borderColor: `${bias.color}66` }}>
        <Title icon="⚡" title="Explainable Bias Engine" sub="Combines GDELT news pressure and FRED macro pressure." />
        <div style={{ fontSize: 34, fontWeight: 950, color: bias.color }}>{bias.label}</div>
        <p style={{ color: C.muted, lineHeight: 1.7 }}>{bias.text}</p>
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
            <button style={btn(false)} onClick={() => loadFredKeyFromFile({ force: true })}>Reload key from file</button>
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
    overview: <Overview />,
    chart: <TradingViewChart />,
    news: <NewsPanel />,
    macro: <MacroDrivers />,
    calendar: <Calendar />,
    bias: <BiasEngine />,
    health: <SourceHealth />,
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
              <strong style={{ color: C.gold, fontSize: 23 }}>GoldScope v2</strong>
              <Badge value="warning">Gold-only</Badge>
              <Badge value={health.gdelt.status}>GDELT {health.gdelt.status}</Badge>
              <Badge value={health.fred.status}>FRED {health.fred.status}</Badge>
              <Badge value={bias.color === C.green ? "bullish" : bias.color === C.red ? "bearish" : "warning"}>{bias.label.replace("Research bias: ", "")}</Badge>
            </div>
            <p style={{ color: C.muted, margin: "7px 0 0", fontSize: 13 }}>
              XAUUSD research terminal · TradingView chart · GDELT news · FRED macro drivers · no broker connection · no auto-trading
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
