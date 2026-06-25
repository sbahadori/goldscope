import React, { useMemo, useState } from "react";
import DescendingTriangleChart from "./DescendingTriangleChart.jsx";
import {
  analyzeDescendingTriangleMultiTimeframe,
  normalizeCandles,
  resampleCandles,
  round,
} from "../technical/descendingTriangleDetector.js";

const STYLE = {
  card: {
    background: "#101827",
    border: "1px solid #25324a",
    borderRadius: 16,
    padding: 16,
    color: "#f8fafc",
  },
  muted: { color: "#9fb0c8" },
  button: {
    background: "#f59e0b",
    color: "#111827",
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 700,
  },
  secondaryButton: {
    background: "#1f2937",
    color: "#e5e7eb",
    border: "1px solid #334155",
    borderRadius: 10,
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 700,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 10,
  },
  smallBox: {
    background: "#0b1120",
    border: "1px solid #1f2a44",
    borderRadius: 12,
    padding: 10,
  },
};

function apiBase() {
  if (typeof window === "undefined") return "";
  const saved = window.localStorage?.getItem("goldscope.marketProxyBase");
  return saved ? String(saved).replace(/\/$/, "") : "";
}

function apiUrl(path) {
  const base = apiBase();
  const cleanPath = String(path || "").startsWith("/") ? path : `/${path}`;
  return base ? `${base}${cleanPath}` : cleanPath;
}

function normalizeOanda(payload = {}) {
  const rows = Array.isArray(payload?.candles) ? payload.candles : [];
  return rows
    .filter((c) => c && c.complete !== false && c.mid)
    .map((c) => ({
      time: c.time,
      open: Number(c.mid.o),
      high: Number(c.mid.h),
      low: Number(c.mid.l),
      close: Number(c.mid.c),
      volume: Number(c.volume),
    }));
}

function normalizeYahoo(payload = {}) {
  const result = payload?.chart?.result?.[0];
  const timestamps = result?.timestamp || [];
  const quote = result?.indicators?.quote?.[0] || {};
  return timestamps.map((t, i) => ({
    time: new Date(t * 1000).toISOString(),
    open: Number(quote.open?.[i]),
    high: Number(quote.high?.[i]),
    low: Number(quote.low?.[i]),
    close: Number(quote.close?.[i]),
    volume: Number(quote.volume?.[i]),
  }));
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store", headers: { Accept: "application/json,text/plain,*/*" } });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${text.slice(0, 260)}`);
  if (/^\s*</.test(text)) throw new Error("Endpoint returned HTML, not JSON. Start the market proxy / Vite dev server.");
  return JSON.parse(text);
}

async function fetchOandaTf(granularity, count = 600) {
  const data = await fetchJson(apiUrl(`/api/oanda/candles?instrument=XAU_USD&granularity=${granularity}&count=${count}`));
  return normalizeCandles(normalizeOanda(data));
}

async function fetchYahooTf(symbol = "XAUUSD=X", range = "60d", interval = "30m") {
  const data = await fetchJson(apiUrl(`/api/yahoo/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`));
  return normalizeCandles(normalizeYahoo(data));
}

async function loadTriangleDataset() {
  const attempts = [];
  try {
    const [m30, h1, h4, d1] = await Promise.all([
      fetchOandaTf("M30", 800),
      fetchOandaTf("H1", 800),
      fetchOandaTf("H4", 500),
      fetchOandaTf("D", 300),
    ]);
    return { source: "OANDA:XAU_USD", candlesByTimeframe: { "30m": m30, "1h": h1, "4h": h4, "1d": d1 }, attempts };
  } catch (error) {
    attempts.push(`OANDA failed: ${error.message || String(error)}`);
  }

  const m30 = await fetchYahooTf("XAUUSD=X", "60d", "30m");
  const h1 = resampleCandles(m30, "1h");
  const h4 = resampleCandles(m30, "4h");
  const d1 = await fetchYahooTf("XAUUSD=X", "1y", "1d").catch(() => resampleCandles(m30, "1d"));
  return { source: "Yahoo:XAUUSD=X fallback", candlesByTimeframe: { "30m": m30, "1h": h1, "4h": h4, "1d": d1 }, attempts };
}

function Badge({ children, tone = "neutral" }) {
  const bg = tone === "bad" ? "#451a1a" : tone === "good" ? "#052e24" : tone === "warn" ? "#422006" : "#1e293b";
  const color = tone === "bad" ? "#fecaca" : tone === "good" ? "#bbf7d0" : tone === "warn" ? "#fde68a" : "#cbd5e1";
  return <span style={{ background: bg, color, borderRadius: 999, padding: "4px 8px", fontSize: 12 }}>{children}</span>;
}

export default function DescendingTriangleScanner() {
  const [analysis, setAnalysis] = useState(null);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState([]);

  const primary = analysis?.primary;
  const tone = useMemo(() => {
    if (!analysis) return "neutral";
    if (analysis.finalStatus?.includes("confirmed")) return "good";
    if (analysis.finalStatus?.includes("candidate")) return "warn";
    return "neutral";
  }, [analysis]);

  async function runScan() {
    setLoading(true);
    setError("");
    setAnalysis(null);
    try {
      const dataset = await loadTriangleDataset();
      const result = analyzeDescendingTriangleMultiTimeframe(dataset.candlesByTimeframe, {
        primaryTimeframe: "30m",
        lookback: 160,
        minSupportTouches: 3,
        minLowerHighs: 2,
      });
      setSource(dataset.source);
      setAttempts(dataset.attempts || []);
      setAnalysis(result);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={STYLE.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Descending Triangle Scanner</h2>
          <p style={{ ...STYLE.muted, marginTop: 6, marginBottom: 0 }}>
            Detects one pattern only: horizontal support + lower highs + compression + breakout validation + higher-timeframe confirmation.
          </p>
        </div>
        <button type="button" style={STYLE.button} onClick={runScan} disabled={loading}>
          {loading ? "Scanning..." : "Scan XAUUSD"}
        </button>
      </div>

      {error && (
        <div style={{ ...STYLE.smallBox, borderColor: "#7f1d1d", color: "#fecaca", marginBottom: 12 }}>
          {error}
        </div>
      )}

      {attempts.length > 0 && (
        <div style={{ ...STYLE.smallBox, ...STYLE.muted, marginBottom: 12 }}>
          Data fallback notes: {attempts.join(" | ")}
        </div>
      )}

      {analysis ? (
        <>
          <div style={STYLE.grid}>
            <div style={STYLE.smallBox}>
              <div style={STYLE.muted}>Final status</div>
              <div style={{ marginTop: 6 }}><Badge tone={tone}>{analysis.finalStatus}</Badge></div>
            </div>
            <div style={STYLE.smallBox}>
              <div style={STYLE.muted}>Final confidence</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{analysis.finalConfidence}%</div>
            </div>
            <div style={STYLE.smallBox}>
              <div style={STYLE.muted}>Decision</div>
              <div>{analysis.decision}</div>
            </div>
            <div style={STYLE.smallBox}>
              <div style={STYLE.muted}>Data source</div>
              <div>{source || "unknown"}</div>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <DescendingTriangleChart analysis={analysis} />
          </div>

          <div style={{ ...STYLE.grid, marginTop: 14 }}>
            <div style={STYLE.smallBox}>
              <div style={STYLE.muted}>Support zone</div>
              <div>{primary?.supportZone?.join(" – ") || "n/a"}</div>
            </div>
            <div style={STYLE.smallBox}>
              <div style={STYLE.muted}>Breakout level</div>
              <div>{primary?.breakoutLevel ?? "n/a"}</div>
            </div>
            <div style={STYLE.smallBox}>
              <div style={STYLE.muted}>Measured target</div>
              <div>{primary?.measuredTarget ?? "n/a"}</div>
            </div>
            <div style={STYLE.smallBox}>
              <div style={STYLE.muted}>Invalidation</div>
              <div>{primary?.invalidationLevel ?? "n/a"}</div>
            </div>
          </div>

          <div style={{ ...STYLE.grid, marginTop: 14 }}>
            {Object.entries(analysis.higherTimeframes || {}).map(([tf, block]) => (
              <div key={tf} style={STYLE.smallBox}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong>{tf}</strong>
                  <Badge tone={block.bias?.includes("bearish") ? "good" : block.bias?.includes("bullish") ? "bad" : "neutral"}>{block.bias}</Badge>
                </div>
                <div style={{ ...STYLE.muted, marginTop: 8, fontSize: 12 }}>
                  RSI14: {block.indicators?.rsi14 ?? "n/a"} · MACD: {block.indicators?.macd?.state || "n/a"} · EMA20/50: {round(block.indicators?.ema?.ema20)} / {round(block.indicators?.ema?.ema50)}
                </div>
              </div>
            ))}
          </div>

          <div style={{ ...STYLE.smallBox, marginTop: 14 }}>
            <strong>Primary timeframe evidence</strong>
            <ul style={{ marginTop: 8, marginBottom: 0, paddingInlineStart: 20, color: "#cbd5e1" }}>
              {(primary?.breakout?.evidence || []).map((x) => <li key={x}>{x}</li>)}
              {(primary?.indicators?.evidence || []).map((x) => <li key={x}>{x}</li>)}
            </ul>
          </div>
        </>
      ) : (
        <div style={{ ...STYLE.smallBox, ...STYLE.muted }}>
          Click Scan XAUUSD. The detector will prefer OANDA spot candles, then fall back to Yahoo XAUUSD=X for diagnostics.
        </div>
      )}
    </div>
  );
}
