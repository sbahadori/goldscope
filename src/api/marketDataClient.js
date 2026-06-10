const MARKET_PROXY_BASE =
  typeof window !== "undefined" && window.localStorage?.getItem("goldscope.marketProxyBase")
    ? window.localStorage.getItem("goldscope.marketProxyBase")
    : "";

function marketApiUrl(path = "") {
  const cleanBase = String(MARKET_PROXY_BASE || "").replace(/\/$/, "");
  const cleanPath = String(path || "").startsWith("/") ? String(path) : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

export async function fetchXauusdSpotCandles({ granularity = "H1", count = 600 } = {}) {
  const url = marketApiUrl(`/api/oanda/candles?instrument=XAU_USD&granularity=${encodeURIComponent(granularity)}&count=${encodeURIComponent(count)}`);
  const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`OANDA candle adapter failed: HTTP ${response.status}: ${raw.slice(0, 300)}`);
  }
  return JSON.parse(raw);
}

export async function fetchXauusdSpotPricing() {
  const response = await fetch(marketApiUrl("/api/oanda/pricing?instrument=XAU_USD"), {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`OANDA pricing adapter failed: HTTP ${response.status}: ${raw.slice(0, 300)}`);
  }
  return JSON.parse(raw);
}
